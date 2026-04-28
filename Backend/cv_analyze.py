#!/usr/bin/env python3
import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict, deque

import cv2
import numpy as np

try:
    from ultralytics import YOLO
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: ultralytics. Install Backend/requirements-cv.txt before running local analytics."
    ) from exc

try:
    from norfair import Detection, Tracker
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: norfair. Install Backend/requirements-cv.txt before running local analytics."
    ) from exc


PERSON_CLASS_ID = 0
BALL_CLASS_ID = 32
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview").strip()


def parse_args():
    parser = argparse.ArgumentParser(description="ScoutTalent local football video analytics")
    parser.add_argument("--input-video", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--output-video", required=True)
    parser.add_argument("--detector-model", default="yolo11n.pt")
    parser.add_argument("--player-name", default="")
    parser.add_argument("--team-name", default="")
    parser.add_argument("--position", default="")
    parser.add_argument("--jersey", default="")
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--imgsz", type=int, default=1280)
    parser.add_argument("--pixel-to-meter", type=float, default=0.025)
    parser.add_argument("--possession-radius", type=float, default=90.0)
    parser.add_argument("--shot-speed-threshold", type=float, default=280.0)
    return parser.parse_args()


def centroid(box):
    x1, y1, x2, y2 = box
    return np.array([(x1 + x2) / 2.0, (y1 + y2) / 2.0], dtype=np.float32)


def bbox_bottom_center(box):
    x1, y1, x2, y2 = box
    return int((x1 + x2) / 2), int(y2)


def as_detection(box, score, label):
    point = centroid(box)
    return Detection(
        points=np.array([point]),
        scores=np.array([score], dtype=np.float32),
        data={"bbox": [float(v) for v in box], "label": label},
    )


def custom_distance(detection, tracked_object):
    if detection.data.get("label") != tracked_object.last_detection.data.get("label"):
        return 1e6
    return np.linalg.norm(detection.points[0] - tracked_object.estimate[0])


def role_from_crop(frame, box):
    x1, y1, x2, y2 = [int(max(0, v)) for v in box]
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return "player"

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    saturation = float(np.mean(hsv[..., 1]))
    brightness = float(np.mean(hsv[..., 2]))
    if saturation < 55 and 45 < brightness < 180:
        return "referee"
    return "player"


def track_box(obj):
    if getattr(obj, "last_detection", None) and obj.last_detection.data.get("bbox"):
        return obj.last_detection.data["bbox"]
    x, y = obj.estimate[0]
    return [x - 15, y - 30, x + 15, y + 30]


def speed_from_history(points, fps, pixel_to_meter):
    if len(points) < 2:
        return 0.0, 0.0
    (f0, p0), (f1, p1) = points[-2], points[-1]
    dt = max((f1 - f0) / fps, 1e-6)
    distance_px = float(np.linalg.norm(p1 - p0))
    return distance_px / dt, (distance_px * pixel_to_meter) / dt


def inside_goal_mouth(point, frame_shape, side):
    height, width = frame_shape[:2]
    goal_top = int(height * 0.32)
    goal_bottom = int(height * 0.68)
    x, y = point
    if y < goal_top or y > goal_bottom:
        return False
    if side == "left":
        return x <= 8
    return x >= width - 8


def summarize(player_name, analytics):
    max_player_speed = 0.0
    for entry in analytics["player_speed"].values():
        max_player_speed = max(max_player_speed, float(entry["max_mps_estimated"]))

    top_possession = max(analytics["possession_percentage"].values(), default=0.0)
    shots = int(analytics["shot_count"])
    goals = int(analytics["goal_count"])

    strengths = []
    weaknesses = []
    if max_player_speed >= 7:
        strengths.append("Fast transition speed")
    if top_possession >= 35:
        strengths.append("Strong possession presence")
    if shots > 0:
        strengths.append("Consistent attacking intent")

    if max_player_speed < 5:
        weaknesses.append("Needs stronger recovery pace")
    if top_possession < 15:
        weaknesses.append("Limited involvement on the ball")
    if goals == 0:
        weaknesses.append("No goal-line finish detected")

    return {
        "goals": goals,
        "assists": 0,
        "touches": int(analytics["possession_frames"]),
        "tackles": 0,
        "totalPoints": goals * 25 + shots * 10 + int(top_possession),
        "sprintSpeed": int(round(max_player_speed * 3.6)),
        "passAccuracy": int(round(min(100, 45 + top_possession))),
        "stamina": int(round(min(100, 55 + max_player_speed * 5))),
        "summary": (
            f"{player_name or 'Player'} reached an estimated max speed of {max_player_speed:.2f} m/s. "
            f"The ball peaked at {analytics['ball_velocity']['max_px_per_second']:.2f} px/s, "
            f"with {shots} shot event(s) and {goals} goal event(s) detected."
        ),
        "strengths": strengths,
        "weaknesses": weaknesses,
    }


def build_local_scouting_report(player_name, scorer_id, path_summary, analytics):
    player_label = player_name or f"Player {scorer_id}" if scorer_id is not None else (player_name or "Unknown player")
    possession = analytics["possession_percentage"].get(str(scorer_id), 0.0) if scorer_id is not None else 0.0
    max_speed = analytics["player_speed"].get(str(scorer_id), {}).get("max_mps_estimated", 0.0) if scorer_id is not None else 0.0
    goals = int(analytics["goal_count"])
    shots = int(analytics["shot_count"])
    events = analytics.get("events", [])
    transition_note = "Ball progression stayed controlled through the central lane." if possession >= 20 else "The sequence relied more on off-ball timing than sustained possession."
    ghost_run_note = "Movement shows repeat changes of direction that would be difficult to track manually." if path_summary else "Tracking data is limited, so the run profile is inferred from possession and speed."
    grade = "A" if goals > 0 or shots >= 2 else "B"

    return f"""### Tactical Analysis Report: Goal Sequence Tracking
{player_label} emerged as the key runner in this sequence. Tracking ID {scorer_id if scorer_id is not None else "N/A"} logged the strongest blend of isolation time, possession influence, and attacking activity across the clip.
---
#### 1. Identification of the Most Active Player
Tracking ID {scorer_id if scorer_id is not None else "N/A"} was highlighted because the player repeatedly stayed central to the action, recorded {possession:.2f}% of tracked possession phases, and reached an estimated peak speed of {max_speed:.2f} m/s.
---
#### 2. Tactical Implications of Movement
Initial Block: The player began by holding a compact reference position and staying available for the next action.
Transition: {transition_note}
Ghost Run: {ghost_run_note}
---
#### 3. Scout's Verdict
Performance Grade: {grade}
Technical Summary: {player_label} produced {shots} shot event(s), contributed to {goals} goal event(s), and remained consistently relevant across {len(events)} tagged match events.
Key Takeaway for Coaching Staff: Use this player in attacking patterns that reward late movement, timed support runs, and quick acceleration into space."""


def extract_gemini_text(payload):
    candidates = payload.get("candidates") or []
    for candidate in candidates:
        content = candidate.get("content") or {}
        for part in content.get("parts") or []:
            text = part.get("text")
            if text:
                return text.strip()
    return ""


def generate_gemini_scouting_report(prompt):
    if not GEMINI_API_KEY:
        return ""

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{urllib.parse.quote(GEMINI_MODEL, safe='')}:generateContent?key={urllib.parse.quote(GEMINI_API_KEY, safe='')}"
    )
    payload = json.dumps({
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                body = response.read().decode("utf-8")
            parsed = json.loads(body)
            return extract_gemini_text(parsed)
        except urllib.error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="ignore")
            if exc.code == 429 and attempt < 2:
                time.sleep(15)
                continue
            raise RuntimeError(f"Gemini API error ({exc.code}): {details or exc.reason}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Gemini API network error: {exc.reason}") from exc

    return ""


def generate_scouting_report(player_name, movement_logs, focus_scores, analytics):
    scorer_id = None
    if focus_scores:
        scorer_id = max(
            focus_scores,
            key=lambda track_id: (
                focus_scores[track_id],
                analytics["possession_percentage"].get(str(track_id), 0.0),
                analytics["player_speed"].get(str(track_id), {}).get("max_mps_estimated", 0.0),
            ),
        )
    elif analytics["possession_percentage"]:
        scorer_id = max(
            analytics["possession_percentage"],
            key=lambda track_id: analytics["possession_percentage"][track_id],
        )

    path_summary = "\n".join((movement_logs.get(scorer_id) or [])[:80]) if scorer_id is not None else ""
    prompt = f"""
You are a professional tactical football scout. Analyze the movement of Scorer ID {scorer_id}.
Player context:
- Name: {player_name or "Unknown"}
- Goals detected: {analytics["goal_count"]}
- Shots detected: {analytics["shot_count"]}
- Possession map: {json.dumps(analytics["possession_percentage"], ensure_ascii=True)}
- Speed map: {json.dumps(analytics["player_speed"], ensure_ascii=True)}

Coordinate Data:
{path_summary or "No coordinate trail captured."}

Format the output exactly with these sections:

### Tactical Analysis Report: Goal Sequence Tracking
(Breakdown the play here)
---
#### 1. Identification of the Most Active Player
(Mention ID and the evidence)
---
#### 2. Tactical Implications of Movement
(Describe the Initial Block, Transition, and Ghost Run)
---
#### 3. Scout's Verdict
(Performance Grade, Technical Summary, and Key Takeaway for Coaching Staff)
""".strip()

    try:
        report = generate_gemini_scouting_report(prompt)
        if report:
            return report
    except RuntimeError:
        pass

    return build_local_scouting_report(player_name, scorer_id, path_summary, analytics)


def main():
    args = parse_args()
    model = YOLO(args.detector_model)

    cap = cv2.VideoCapture(args.input_video)
    if not cap.isOpened():
        raise SystemExit(f"Unable to open input video: {args.input_video}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(args.output_video, fourcc, fps, (width, height))

    person_tracker = Tracker(
        distance_function=custom_distance,
        distance_threshold=45,
        hit_counter_max=30,
        initialization_delay=2,
    )
    ball_tracker = Tracker(
        distance_function=custom_distance,
        distance_threshold=60,
        hit_counter_max=15,
        initialization_delay=1,
    )

    player_histories = defaultdict(lambda: deque(maxlen=24))
    player_speed_stats = defaultdict(lambda: {"max_px_per_second": 0.0, "max_mps_estimated": 0.0, "samples_px": [], "samples_mps": [], "role": "player"})
    possession_frames = defaultdict(int)
    total_possession_frames = 0
    ball_history = deque(maxlen=24)
    ball_tail = deque(maxlen=30)
    events = []
    shot_count = 0
    goal_count = 0
    cooldown_until = -1
    max_ball_px_speed = 0.0
    max_ball_mps = 0.0
    movement_logs = defaultdict(list)
    focus_scores = defaultdict(int)

    frame_idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        result = model.predict(frame, imgsz=args.imgsz, conf=args.conf, verbose=False)[0]
        person_detections = []
        ball_detections = []

        if result.boxes is not None:
            for box in result.boxes:
                cls_id = int(box.cls.item())
                conf = float(box.conf.item())
                xyxy = box.xyxy[0].tolist()

                if cls_id == PERSON_CLASS_ID:
                    role = role_from_crop(frame, xyxy)
                    person_detections.append(as_detection(xyxy, conf, role))
                elif cls_id == BALL_CLASS_ID:
                    ball_detections.append(as_detection(xyxy, conf, "ball"))

        tracked_people = person_tracker.update(detections=person_detections)
        tracked_balls = ball_tracker.update(detections=ball_detections)

        active_players = []
        active_referees = []
        for tracked in tracked_people:
            if tracked.id is None:
                continue
            box = track_box(tracked)
            role = tracked.last_detection.data.get("label", "player")
            center = centroid(box)
            player_histories[int(tracked.id)].append((frame_idx, center))
            movement_logs[int(tracked.id)].append(
                f"Frame {frame_idx}: [{int(center[0])}, {int(center[1])}]"
            )
            px_per_second, mps = speed_from_history(player_histories[int(tracked.id)], fps, args.pixel_to_meter)
            stats = player_speed_stats[int(tracked.id)]
            stats["max_px_per_second"] = max(stats["max_px_per_second"], px_per_second)
            stats["max_mps_estimated"] = max(stats["max_mps_estimated"], mps)
            stats["samples_px"].append(px_per_second)
            stats["samples_mps"].append(mps)
            stats["role"] = role

            if role == "referee":
                active_referees.append((tracked, box, center))
            else:
                active_players.append((tracked, box, center))

        if len(active_players) <= 2:
            for tracked, _, _ in active_players:
                focus_scores[int(tracked.id)] += 1

        tracked_ball = None
        ball_center = None
        if tracked_balls:
            tracked_ball = tracked_balls[0]
            ball_box = track_box(tracked_ball)
            ball_center = centroid(ball_box)
            ball_history.append((frame_idx, ball_center))
            ball_tail.append(tuple(ball_center.astype(int)))

        current_ball_px_speed, current_ball_mps = speed_from_history(ball_history, fps, args.pixel_to_meter)
        max_ball_px_speed = max(max_ball_px_speed, current_ball_px_speed)
        max_ball_mps = max(max_ball_mps, current_ball_mps)

        possessor_id = None
        possessor_box = None
        if ball_center is not None and active_players:
            nearest = min(active_players, key=lambda item: float(np.linalg.norm(item[2] - ball_center)))
            distance = float(np.linalg.norm(nearest[2] - ball_center))
            if distance <= args.possession_radius:
                possessor_id = int(nearest[0].id)
                possessor_box = nearest[1]
                possession_frames[possessor_id] += 1
                total_possession_frames += 1

        if ball_center is not None and frame_idx > cooldown_until:
            vx = 0.0
            if len(ball_history) >= 2:
                vx = float(ball_history[-1][1][0] - ball_history[-2][1][0]) * fps

            if abs(vx) >= args.shot_speed_threshold and abs(vx) > abs(current_ball_px_speed * 0.5):
                side = "right" if vx > 0 else "left"
                shot_count += 1
                events.append({
                    "frame": frame_idx,
                    "type": "shot",
                    "towards_goal": side,
                    "ball_velocity_px_per_second": round(current_ball_px_speed, 2),
                })
                cooldown_until = frame_idx + int(fps)

            if inside_goal_mouth(ball_center, frame.shape, "left") or inside_goal_mouth(ball_center, frame.shape, "right"):
                side = "left" if inside_goal_mouth(ball_center, frame.shape, "left") else "right"
                goal_count += 1
                events.append({
                    "frame": frame_idx,
                    "type": "goal",
                    "goal_side": side,
                    "ball_velocity_px_per_second": round(current_ball_px_speed, 2),
                })
                cooldown_until = frame_idx + int(fps * 2)

        for tracked, box, _ in active_players:
            x1, y1, x2, y2 = [int(v) for v in box]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (70, 180, 70), 2)
            cv2.putText(frame, f"Player {tracked.id}", (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (70, 180, 70), 2)

        for tracked, box, _ in active_referees:
            x1, y1, x2, y2 = [int(v) for v in box]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 220, 255), 2)
            cv2.putText(frame, f"Ref {tracked.id}", (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 255), 2)

        if tracked_ball is not None:
            ball_box = track_box(tracked_ball)
            x1, y1, x2, y2 = [int(v) for v in ball_box]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 140, 255), 2)
            cv2.putText(frame, "Ball", (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 140, 255), 2)

        if len(ball_tail) >= 2:
            for idx in range(1, len(ball_tail)):
                thickness = max(1, idx // 6)
                cv2.line(frame, ball_tail[idx - 1], ball_tail[idx], (40, 120, 255), thickness)

        if possessor_box is not None:
            px, py = bbox_bottom_center(possessor_box)
            radius = max(18, int((possessor_box[2] - possessor_box[0]) * 0.35))
            overlay = frame.copy()
            cv2.circle(overlay, (px, py), radius, (0, 255, 255), -1)
            cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)
            cv2.putText(frame, f"Possession: {possessor_id}", (px - 45, py + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 2)

        writer.write(frame)
        frame_idx += 1

    cap.release()
    writer.release()

    player_speed = {}
    for track_id, stats in player_speed_stats.items():
        player_speed[str(track_id)] = {
            "role": stats["role"],
            "avg_px_per_second": round(float(np.mean(stats["samples_px"])) if stats["samples_px"] else 0.0, 2),
            "max_px_per_second": round(stats["max_px_per_second"], 2),
            "avg_mps_estimated": round(float(np.mean(stats["samples_mps"])) if stats["samples_mps"] else 0.0, 2),
            "max_mps_estimated": round(stats["max_mps_estimated"], 2),
        }

    possession_percentage = {}
    for track_id, frames in possession_frames.items():
        possession_percentage[str(track_id)] = round((frames / max(total_possession_frames, 1)) * 100.0, 2)

    analytics = {
        "input_video": args.input_video,
        "annotated_video": args.output_video,
        "detector_model": args.detector_model,
        "fps": round(fps, 2),
        "frame_count": frame_count,
        "player_context": {
            "player_name": args.player_name,
            "team_name": args.team_name,
            "position": args.position,
            "jersey": args.jersey,
        },
        "player_speed": player_speed,
        "ball_velocity": {
            "current_px_per_second": round(current_ball_px_speed, 2),
            "current_mps_estimated": round(current_ball_mps, 2),
            "max_px_per_second": round(max_ball_px_speed, 2),
            "max_mps_estimated": round(max_ball_mps, 2),
        },
        "possession_frames": total_possession_frames,
        "possession_percentage": possession_percentage,
        "shot_count": shot_count,
        "goal_count": goal_count,
        "events": events,
    }
    analytics["generated_stats"] = summarize(args.player_name, analytics)
    analytics["scouting_report"] = generate_scouting_report(
        args.player_name,
        movement_logs,
        focus_scores,
        analytics,
    )

    with open(args.output_json, "w", encoding="utf-8") as handle:
        json.dump(analytics, handle, indent=2)


if __name__ == "__main__":
    main()
