#!/usr/bin/env python3
import os
import shutil
from collections import defaultdict, deque
from pathlib import Path

import cv2
import nest_asyncio
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from norfair import Detection, Tracker
from ultralytics import YOLO


PERSON_CLASS_ID = 0
BALL_CLASS_ID = 32
PITCH_LENGTH_M = 105.0
PITCH_WIDTH_M = 68.0

app = FastAPI(title="ScoutTalent Colab Scouting API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONTENT_DIR = Path("/content/scouttalent")
CONTENT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/content", StaticFiles(directory="/content"), name="content")

MODEL_NAME = os.getenv("COLAB_YOLO_MODEL", "yolo26x.pt")
MODEL = YOLO(MODEL_NAME)


def centroid(box):
    x1, y1, x2, y2 = box
    return np.array([(x1 + x2) / 2.0, (y1 + y2) / 2.0], dtype=np.float32)


def as_detection(box, score, label):
    return Detection(
        points=np.array([centroid(box)]),
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


def pitch_homography(frame_width, frame_height):
    src = np.array([
        [frame_width * 0.08, frame_height * 0.94],
        [frame_width * 0.92, frame_height * 0.94],
        [frame_width * 0.72, frame_height * 0.18],
        [frame_width * 0.28, frame_height * 0.18],
    ], dtype=np.float32)
    dst = np.array([
        [0.0, PITCH_WIDTH_M],
        [PITCH_LENGTH_M, PITCH_WIDTH_M],
        [PITCH_LENGTH_M, 0.0],
        [0.0, 0.0],
    ], dtype=np.float32)
    homography, _ = cv2.findHomography(src, dst)
    return homography


def project_to_pitch(point, homography):
    src = np.array([[[float(point[0]), float(point[1])]]], dtype=np.float32)
    dst = cv2.perspectiveTransform(src, homography)
    return dst[0][0]


def speed_from_history(points, fps):
    if len(points) < 2:
        return 0.0, 0.0
    (f0, p0), (f1, p1) = points[-2], points[-1]
    dt = max((f1 - f0) / fps, 1e-6)
    distance = float(np.linalg.norm(p1 - p0))
    return distance / dt, (distance / dt) * 3.6


def inside_goal(point, frame_shape):
    height, width = frame_shape[:2]
    goal_top = int(height * 0.32)
    goal_bottom = int(height * 0.68)
    x, y = point
    if y < goal_top or y > goal_bottom:
        return None
    if x <= 8:
        return "left"
    if x >= width - 8:
        return "right"
    return None


def build_generated_stats(report):
    top_speed = max((entry["top_speed_kmh"] for entry in report["player_speed"].values()), default=0.0)
    top_possession = max(report["possession_percentage"].values(), default=0.0)
    goals = int(report["goal_count"])
    shots = int(report["shot_count"])
    strengths = []
    weaknesses = []
    if top_speed >= 25:
        strengths.append("High sprint output")
    if top_possession >= 35:
        strengths.append("High possession involvement")
    if shots > 0:
        strengths.append("Attacking activity detected")
    if top_speed < 18:
        weaknesses.append("Limited top-end speed")
    if top_possession < 15:
        weaknesses.append("Low on-ball time")
    if goals == 0:
        weaknesses.append("No goal-line finish detected")
    report["generated_stats"] = {
        "goals": goals,
        "assists": 0,
        "touches": int(report["possession_frames"]),
        "tackles": 0,
        "totalPoints": goals * 25 + shots * 10 + int(top_possession),
        "sprintSpeed": int(round(top_speed)),
        "passAccuracy": int(round(min(100, 45 + top_possession))),
        "stamina": int(round(min(100, 55 + top_speed / 2))),
        "summary": (
            f"Top tracked speed reached {top_speed:.2f} km/h with {shots} shot event(s) "
            f"and {goals} goal event(s) detected."
        ),
        "strengths": strengths,
        "weaknesses": weaknesses,
    }
    return report


def analyze_video(input_path: Path, output_video_path: Path, metadata: dict):
    cap = cv2.VideoCapture(str(input_path))
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open input video: {input_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    homography = pitch_homography(width, height)

    writer = cv2.VideoWriter(
        str(output_video_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )

    person_tracker = Tracker(distance_function=custom_distance, distance_threshold=45, hit_counter_max=30, initialization_delay=2)
    ball_tracker = Tracker(distance_function=custom_distance, distance_threshold=60, hit_counter_max=15, initialization_delay=1)

    player_histories = defaultdict(lambda: deque(maxlen=24))
    pitch_histories = defaultdict(lambda: deque(maxlen=24))
    heatmap_points = defaultdict(list)
    player_speed = defaultdict(lambda: {"top_speed_kmh": 0.0, "distance_covered_m": 0.0, "role": "player"})
    possession_frames = defaultdict(int)
    total_possession_frames = 0
    ball_history = deque(maxlen=24)
    ball_tail = deque(maxlen=30)
    max_ball_velocity = 0.0
    events = []
    shot_count = 0
    goal_count = 0
    cooldown_until = -1
    frame_idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        result = MODEL.predict(frame, imgsz=1280, conf=0.25, verbose=False)[0]
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
        for tracked in tracked_people:
            if tracked.id is None:
                continue
            box = track_box(tracked)
            role = tracked.last_detection.data.get("label", "player")
            center = centroid(box)
            pitch_point = project_to_pitch(center, homography)

            player_histories[int(tracked.id)].append((frame_idx, center))
            pitch_histories[int(tracked.id)].append((frame_idx, pitch_point))
            _, speed_kmh = speed_from_history(pitch_histories[int(tracked.id)], fps)

            stats = player_speed[int(tracked.id)]
            stats["top_speed_kmh"] = max(stats["top_speed_kmh"], speed_kmh)
            stats["role"] = role

            if len(pitch_histories[int(tracked.id)]) >= 2:
                p0 = pitch_histories[int(tracked.id)][-2][1]
                p1 = pitch_histories[int(tracked.id)][-1][1]
                stats["distance_covered_m"] += float(np.linalg.norm(p1 - p0))

            if role == "player":
                active_players.append((tracked, box, center, pitch_point))

            x1, y1, x2, y2 = [int(v) for v in box]
            color = (70, 180, 70) if role == "player" else (0, 220, 255)
            label = f"{role.title()} {tracked.id}"
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label, (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        ball_center = None
        if tracked_balls:
            tracked_ball = tracked_balls[0]
            ball_box = track_box(tracked_ball)
            ball_center = centroid(ball_box)
            ball_history.append((frame_idx, ball_center))
            ball_tail.append(tuple(ball_center.astype(int)))
            x1, y1, x2, y2 = [int(v) for v in ball_box]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 140, 255), 2)
            cv2.putText(frame, "Ball", (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 140, 255), 2)

        ball_velocity_px, _ = speed_from_history(ball_history, fps)
        max_ball_velocity = max(max_ball_velocity, ball_velocity_px)

        possessor_id = None
        possessor_box = None
        if ball_center is not None and active_players:
            nearest = min(active_players, key=lambda item: float(np.linalg.norm(item[2] - ball_center)))
            if float(np.linalg.norm(nearest[2] - ball_center)) <= 90.0:
                possessor_id = int(nearest[0].id)
                possessor_box = nearest[1]
                possession_frames[possessor_id] += 1
                total_possession_frames += 1
                heatmap_points[str(possessor_id)].append([round(float(nearest[3][0]), 2), round(float(nearest[3][1]), 2)])

        if ball_center is not None and frame_idx > cooldown_until:
            vx = 0.0
            if len(ball_history) >= 2:
                vx = float(ball_history[-1][1][0] - ball_history[-2][1][0]) * fps
            if abs(vx) >= 280.0:
                shot_count += 1
                events.append({
                    "frame": frame_idx,
                    "type": "shot",
                    "towards_goal": "right" if vx > 0 else "left",
                    "ball_velocity_px_per_second": round(ball_velocity_px, 2),
                })
                cooldown_until = frame_idx + int(fps)

            goal_side = inside_goal(ball_center, frame.shape)
            if goal_side:
                goal_count += 1
                events.append({
                    "frame": frame_idx,
                    "type": "goal",
                    "goal_side": goal_side,
                    "ball_velocity_px_per_second": round(ball_velocity_px, 2),
                })
                cooldown_until = frame_idx + int(fps * 2)

        if len(ball_tail) >= 2:
            for idx in range(1, len(ball_tail)):
                cv2.line(frame, ball_tail[idx - 1], ball_tail[idx], (40, 120, 255), max(1, idx // 6))

        if possessor_box is not None:
            x1, y1, x2, y2 = possessor_box
            px, py = int((x1 + x2) / 2), int(y2)
            radius = max(18, int((x2 - x1) * 0.35))
            overlay = frame.copy()
            cv2.circle(overlay, (px, py), radius, (0, 255, 255), -1)
            cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)

        writer.write(frame)
        frame_idx += 1

    cap.release()
    writer.release()

    report = {
        "detector_model": MODEL_NAME,
        "fps": round(fps, 2),
        "frame_count": frame_count,
        "player_context": metadata,
        "player_speed": {
            str(track_id): {
                "role": entry["role"],
                "top_speed_kmh": round(entry["top_speed_kmh"], 2),
                "distance_covered_m": round(entry["distance_covered_m"], 2),
            }
            for track_id, entry in player_speed.items()
        },
        "ball_velocity": {
            "max_px_per_second": round(max_ball_velocity, 2),
        },
        "possession_frames": total_possession_frames,
        "possession_percentage": {
            str(track_id): round((frames / max(total_possession_frames, 1)) * 100.0, 2)
            for track_id, frames in possession_frames.items()
        },
        "possession_heatmap": heatmap_points,
        "shot_count": shot_count,
        "goal_count": goal_count,
        "events": events,
    }
    return build_generated_stats(report)


@app.post("/analyze-scouting")
async def analyze_scouting(
    request: Request,
    video: UploadFile = File(...),
    player_name: str = Form(""),
    team_name: str = Form(""),
    position: str = Form(""),
    jersey: str = Form(""),
):
    if not video.filename:
        raise HTTPException(status_code=400, detail="A video file is required.")

    request_dir = CONTENT_DIR / Path(video.filename).stem
    if request_dir.exists():
        shutil.rmtree(request_dir)
    request_dir.mkdir(parents=True, exist_ok=True)

    input_path = request_dir / video.filename
    output_video_path = request_dir / f"{Path(video.filename).stem}_annotated.mp4"
    output_json_path = request_dir / f"{Path(video.filename).stem}_report.json"

    with input_path.open("wb") as handle:
        handle.write(await video.read())

    metadata = {
        "player_name": player_name,
        "team_name": team_name,
        "position": position,
        "jersey": jersey,
    }

    try:
        report = analyze_video(input_path, output_video_path, metadata)
        output_json_path.write_text(json_dumps(report), encoding="utf-8")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "report": report,
        "processed_video_path": str(output_video_path),
        "processed_video_url": f"{str(request.base_url).rstrip('/')}/content/scouttalent/{request_dir.name}/{output_video_path.name}",
        "report_path": str(output_json_path),
    }


def json_dumps(payload):
    import json
    return json.dumps(payload, indent=2)


if __name__ == "__main__":
    nest_asyncio.apply()
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
