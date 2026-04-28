import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'url';

import Lform from './users.js';
import apip from './players.js';
import inplayer from './Offplayer.js';
import Cart from './cart.js';
import Shortlist from './shortlists.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5501;
const CV_ANALYTICS_PYTHON = process.env.CV_ANALYTICS_PYTHON || 'python3';
const CV_DETECTOR_MODEL = process.env.CV_DETECTOR_MODEL || 'yolo11n.pt';
const COLAB_SCOUTING_API_URL = process.env.COLAB_SCOUTING_API_URL || '';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ extended: true, limit: '250mb' }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const allowedOrigins = [
  /^http:\/\/localhost:\d+$/i,
  /^http:\/\/127\.0\.0\.1:\d+$/i,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some((pattern) => pattern.test(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

const resolvePathByRole = (role) => {
  switch (role) {
    case 'Player':
      return '/player';
    case 'Scout':
      return '/Scoutmar';
    case 'Agent':
      return '/Agent';
    default:
      return '/Scoutmar';
  }
};

const normaliseRole = (role) => {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'player') return 'Player';
  if (value === 'scout') return 'Scout';
  if (value === 'agent') return 'Agent';
  return '';
};

const normalisePlayerIdentifier = (player) =>
  String(player?._id || player?.playerId || player?.common_name || player?.display_name || player?.username || player?.name || '');

const getPlayerDisplayName = (player) =>
  String(player?.common_name || player?.display_name || player?.username || player?.name || '').trim();

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveAgentUser = async (agentUsername) => {
  const username = String(agentUsername || '').trim();
  if (!username) return null;

  return Lform.findOne({
    username: new RegExp(`^${escapeRegex(username)}$`, 'i'),
    role: 'Agent',
  }).select('username usermail phno role').lean();
};

const buildAgentContact = (playerData = {}, agentUser = null) => {
  const agentUsername = playerData.agentUsername || playerData.agent?.username || playerData.managedByUsername || agentUser?.username || '';
  if (!agentUsername) return null;

  return {
    userId: agentUser?._id || playerData.agent?.userId || null,
    username: agentUsername,
    name: playerData.agentName || playerData.agent?.name || agentUser?.username || agentUsername,
    email: playerData.agentEmail || playerData.agent?.email || agentUser?.usermail || '',
    phone: playerData.agentPhone || playerData.agent?.phone || agentUser?.phno || '',
    linkedAt: playerData.agent?.linkedAt || playerData.agentLinkedAt || new Date(),
  };
};

const applyAgentContact = (playerData = {}, agent = null) => {
  if (!agent) {
    return {
      ...playerData,
      agentUsername: '',
      agentName: '',
      agentEmail: '',
      agentPhone: '',
      managedByUsername: '',
      agentLinkedAt: null,
      agent: null,
    };
  }

  return {
    ...playerData,
    agentUsername: agent.username || '',
    agentName: agent.name || agent.username || '',
    agentEmail: agent.email || '',
    agentPhone: agent.phone || '',
    managedByUsername: agent.username || '',
    agentLinkedAt: agent.linkedAt || new Date(),
    agent: {
      userId: agent.userId || null,
      username: agent.username || '',
      name: agent.name || agent.username || '',
      email: agent.email || '',
      phone: agent.phone || '',
      linkedAt: agent.linkedAt || new Date(),
    },
  };
};

const upsertManagedPlayerForAgent = async (agentUsername, playerData) => {
  const username = String(agentUsername || '').trim();
  if (!username) return;

  const playerId = normalisePlayerIdentifier(playerData);
  const playerName = getPlayerDisplayName(playerData);
  if (!playerId && !playerName) return;

  const agentUser = await Lform.findOne({ username: new RegExp(`^${escapeRegex(username)}$`, 'i'), role: 'Agent' });
  if (!agentUser) return;

  const existingPlayers = Array.isArray(agentUser.managedPlayers) ? agentUser.managedPlayers : [];
  const nextPlayers = existingPlayers.filter((entry) => {
    if (!entry) return false;
    return String(entry.playerId || '') !== String(playerId || '') && String(entry.playerName || '').trim().toLowerCase() !== String(playerName || '').trim().toLowerCase();
  });

  nextPlayers.push({
    playerId: playerId || playerName,
    playerName: playerName || playerId,
    linkedAt: new Date(),
  });

  agentUser.managedPlayers = nextPlayers;
  await agentUser.save();
};

const removeManagedPlayerFromAgent = async (agentUsername, playerData) => {
  const username = String(agentUsername || '').trim();
  if (!username) return;

  const agentUser = await Lform.findOne({ username: new RegExp(`^${escapeRegex(username)}$`, 'i'), role: 'Agent' });
  if (!agentUser) return;

  const playerId = normalisePlayerIdentifier(playerData);
  const playerName = getPlayerDisplayName(playerData);

  agentUser.managedPlayers = (agentUser.managedPlayers || []).filter((entry) => {
    if (!entry) return false;
    if (playerId && String(entry.playerId || '') === String(playerId)) return false;
    if (playerName && String(entry.playerName || '').trim().toLowerCase() === String(playerName).trim().toLowerCase()) return false;
    return true;
  });

  await agentUser.save();
};

const resolveStoredPlayerAgent = async (playerData = {}) => {
  const agentUsername = playerData.agentUsername || playerData.agent?.username || playerData.managedByUsername || '';
  if (!agentUsername) return applyAgentContact(playerData, null);

  const agentUser = await resolveAgentUser(agentUsername);
  return applyAgentContact(playerData, buildAgentContact(playerData, agentUser));
};

const getMarketIdentity = (player) =>
  String(
    player?.common_name ||
    player?.display_name ||
    player?.username ||
    player?._id ||
    ''
  ).trim().toLowerCase();

const choosePreferredMarketRecord = (currentPlayer, nextPlayer) => {
  if (!currentPlayer) return nextPlayer;
  if (!nextPlayer) return currentPlayer;

  const currentInMarket = Boolean(currentPlayer.inMarket);
  const nextInMarket = Boolean(nextPlayer.inMarket);

  if (currentInMarket !== nextInMarket) {
    return nextInMarket ? nextPlayer : currentPlayer;
  }

  const currentHasAgent = Boolean(
    currentPlayer.agentUsername ||
    currentPlayer.agentName ||
    currentPlayer.agent?.username ||
    currentPlayer.managedByUsername
  );
  const nextHasAgent = Boolean(
    nextPlayer.agentUsername ||
    nextPlayer.agentName ||
    nextPlayer.agent?.username ||
    nextPlayer.managedByUsername
  );

  if (currentHasAgent !== nextHasAgent) {
    return nextHasAgent ? nextPlayer : currentPlayer;
  }

  const currentTime = new Date(currentPlayer.lastMarketedAt || currentPlayer.updatedAt || currentPlayer.createdAt || 0).getTime();
  const nextTime = new Date(nextPlayer.lastMarketedAt || nextPlayer.updatedAt || nextPlayer.createdAt || 0).getTime();

  return nextTime >= currentTime ? nextPlayer : currentPlayer;
};

const collapseMarketPlayers = (players = []) => {
  const deduped = new Map();

  for (const player of players) {
    const key = getMarketIdentity(player);
    if (!key) continue;
    deduped.set(key, choosePreferredMarketRecord(deduped.get(key), player));
  }

  return Array.from(deduped.values());
};

const getAssistantManagedPlayers = async (agentUsername) => {
  const username = String(agentUsername || '').trim();
  if (!username) return [];

  const players = await apip.find({
    $or: [
      { managedByUsername: new RegExp(`^${escapeRegex(username)}$`, 'i') },
      { agentUsername: new RegExp(`^${escapeRegex(username)}$`, 'i') },
      { 'agent.username': new RegExp(`^${escapeRegex(username)}$`, 'i') },
    ]
  }).sort({ updatedAt: -1 }).lean();

  return collapseMarketPlayers(players);
};

const summarizeManagedPlayer = (player = {}) => {
  const name = player.display_name || player.common_name || player.username || 'Unknown player';
  const stats = player.generatedStats || {};
  const report = typeof player.scoutingReport === 'string'
    ? player.scoutingReport
    : typeof player.videoAnalysis?.analytics?.scouting_report === 'string'
      ? player.videoAnalysis.analytics.scouting_report
      : '';

  return {
    name,
    team: player.team_name || player.teamname || '',
    position: player.position || '',
    inMarket: Boolean(player.inMarket),
    maxSprintSpeedKph: Number(stats.sprintSpeed || 0),
    passAccuracy: Number(stats.passAccuracy || 0),
    stamina: Number(stats.stamina || 0),
    goals: Number(stats.goals || 0),
    touches: Number(stats.touches || 0),
    summary: typeof stats.summary === 'string' ? stats.summary : '',
    strengths: Array.isArray(stats.strengths) ? stats.strengths : [],
    weaknesses: Array.isArray(stats.weaknesses) ? stats.weaknesses : [],
    scoutingReport: report,
    analyzedAt: player.videoAnalysis?.analyzedAt || null,
  };
};

const buildAgentAssistantFallback = (message, managedPlayers) => {
  const trimmed = String(message || '').trim().toLowerCase();
  const isGreeting = /^(hi|hello|hey|hola|yo|good morning|good afternoon|good evening)\b/.test(trimmed);

  if (isGreeting) {
    const playerCount = managedPlayers.length;
    if (!playerCount) {
      return 'Hi. I can help with player scouting, market positioning, and negotiation prep. Upload a player video or add a player to market when you want me to analyze something concrete.';
    }

    return `Hi. I’m ready to help with scouting reports, player comparisons, market positioning, and negotiation prep. You currently have ${playerCount} managed player${playerCount === 1 ? '' : 's'} available if you want to discuss one.`;
  }

  if (!trimmed) {
    return 'I’m here to help with scouting reports, player comparisons, and negotiation prep. Ask about a player, a shortlist decision, or who looks strongest right now.';
  }

  if (!managedPlayers.length) {
    return 'No managed players with scouting data are available yet. Upload a player video from My Players to generate a scouting report first.';
  }

  const scoredPlayers = managedPlayers
    .map(summarizeManagedPlayer)
    .sort((left, right) => {
      const leftScore = left.goals * 25 + left.touches + left.maxSprintSpeedKph;
      const rightScore = right.goals * 25 + right.touches + right.maxSprintSpeedKph;
      return rightScore - leftScore;
    });

  if (trimmed.includes('best') || trimmed.includes('top') || trimmed.includes('recommend')) {
    const best = scoredPlayers[0];
    return `${best.name} looks like the strongest current option. ${best.summary || 'The latest scouting report rates this player highly.'} Strengths: ${best.strengths.join(', ') || 'No strengths listed yet'}.`;
  }

  const matched = scoredPlayers.find((player) => trimmed.includes(player.name.toLowerCase()));
  if (matched) {
    return `${matched.name}: ${matched.summary || 'Scouting data is available for this player.'}${matched.scoutingReport ? `\n\n${matched.scoutingReport}` : ''}`;
  }

  if (trimmed.includes('help') || trimmed.includes('what can you do')) {
    return 'I can help you compare managed players, summarize video scouting reports, identify the strongest current option, highlight risks or strengths, and frame negotiation talking points. Ask me about a player by name or tell me the decision you are trying to make.';
  }

  const latest = scoredPlayers
    .slice(0, 3)
    .map((player) => `- ${player.name}: ${player.summary || 'Scouting report available.'}`)
    .join('\n');

  return `I can help with managed players, scouting summaries, and negotiation prep. If you want, I can compare players, recommend the strongest option, or summarize a specific player by name.\n\nRecent analysis snapshot:\n${latest}`;
};

const extractGeminiText = (payload = {}) => {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        return part.text.trim();
      }
    }
  }
  return '';
};

const buildAssistantSystemPrompt = (agentUsername) => `
You are the ScoutTalent Agent Assistant for football agents.
Answer as a concise, practical, natural-sounding scouting and negotiation assistant.
Use only the managed player context provided by the app. If data is missing, say so clearly.
Focus on player analysis, market positioning, negotiation angles, and scouting summaries.
If the user greets you or makes small talk, reply warmly and briefly without dumping player summaries unless they asked for them.
Only introduce player lists or scouting snapshots when they help answer the question.
Agent username: ${agentUsername || 'Unknown'}
`.trim();

const buildAssistantPlayerContext = (managedPlayers) =>
  managedPlayers
    .map(summarizeManagedPlayer)
    .map((player) => ({
      name: player.name,
      team: player.team,
      position: player.position,
      inMarket: player.inMarket,
      maxSprintSpeedKph: player.maxSprintSpeedKph,
      passAccuracy: player.passAccuracy,
      stamina: player.stamina,
      goals: player.goals,
      touches: player.touches,
      summary: player.summary,
      strengths: player.strengths,
      weaknesses: player.weaknesses,
      scoutingReport: player.scoutingReport,
      analyzedAt: player.analyzedAt,
    }));

const buildAssistantMessages = ({ message, managedPlayers, history, agentUsername }) => {
  const playerContext = managedPlayers
    ? buildAssistantPlayerContext(managedPlayers)
    : [];

  const contextMessage = {
    role: 'user',
    content: `Managed players context:\n${JSON.stringify(playerContext, null, 2)}`
  };

  const recentHistory = Array.isArray(history)
    ? history.slice(-6).map((entry) => ({
        role: entry.role === 'assistant' ? 'assistant' : 'user',
        content: String(entry.content || ''),
      })).filter((entry) => entry.content.trim())
    : [];

  return [
    { role: 'system', content: buildAssistantSystemPrompt(agentUsername) },
    contextMessage,
    ...recentHistory,
    { role: 'user', content: message },
  ];
};

const generateOllamaReply = async ({ message, managedPlayers, history, agentUsername }) => {
  if (!OLLAMA_MODEL) return '';

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: buildAssistantMessages({ message, managedPlayers, history, agentUsername }),
      stream: false,
      keep_alive: '10m',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Ollama request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return String(payload?.message?.content || '').trim();
};

const generateGeminiReply = async ({ message, managedPlayers, history, agentUsername }) => {
  if (!GEMINI_API_KEY) return '';

  const assistantMessages = buildAssistantMessages({ message, managedPlayers, history, agentUsername });
  const prompt = assistantMessages
    .map((entry) => `${entry.role.toUpperCase()}:\n${entry.content}`)
    .join('\n\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Gemini request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return extractGeminiText(payload);
};

const mergeScoutPlayerRecords = (basePlayer = {}, nextPlayer = {}) => {
  const merged = {
    ...basePlayer,
    ...nextPlayer,
  };

  const username =
    nextPlayer.username ||
    nextPlayer.common_name ||
    nextPlayer.display_name ||
    basePlayer.username ||
    basePlayer.common_name ||
    basePlayer.display_name ||
    '';

  const teamName =
    nextPlayer.teamname ||
    nextPlayer.team_name ||
    basePlayer.teamname ||
    basePlayer.team_name ||
    '';

  const country =
    nextPlayer.country ||
    nextPlayer.country_name ||
    basePlayer.country ||
    basePlayer.country_name ||
    '';

  const image =
    nextPlayer.image ||
    nextPlayer.image_url ||
    nextPlayer.image_path ||
    basePlayer.image ||
    basePlayer.image_url ||
    basePlayer.image_path ||
    '';

  return {
    ...merged,
    username,
    common_name: merged.common_name || merged.display_name || username,
    display_name: merged.display_name || merged.common_name || username,
    teamname: teamName,
    team_name: merged.team_name || teamName,
    country,
    country_name: merged.country_name || country,
    image,
    image_url: merged.image_url || image,
    inMarket: Boolean(merged.inMarket),
  };
};

const loadScoutPlayers = async () => {
  const [offPlayers, playerRecords] = await Promise.all([
    inplayer.find({}).lean(),
    apip.find({}).lean(),
  ]);

  const combined = new Map();

  for (const offPlayer of offPlayers) {
    const key = getMarketIdentity(offPlayer);
    if (!key) continue;
    combined.set(key, mergeScoutPlayerRecords({ inMarket: false }, offPlayer));
  }

  for (const playerRecord of collapseMarketPlayers(playerRecords)) {
    const key = getMarketIdentity(playerRecord);
    if (!key) continue;

    const existing = combined.get(key) || {};
    combined.set(key, mergeScoutPlayerRecords(existing, playerRecord));
  }

  return Promise.all(
    Array.from(combined.values()).map((player) => resolveStoredPlayerAgent(player))
  );
};

// -------------------- ROOT --------------------
app.get("/", (req, res) => res.send("Welcome"));

// -------------------- AUTH --------------------
app.post("/login", async (req, res) => {
  try {
    const { userl, lpass } = req.body;
    const user = await Lform.findOne({
      $or: [{ usermail: userl }, { username: userl }],
      password: lpass
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const resolvedRole = normaliseRole(user.role);
    const resolvedPath = resolvePathByRole(resolvedRole);

    if (resolvedRole && (user.role !== resolvedRole || user.path !== resolvedPath)) {
      user.role = resolvedRole;
      user.path = resolvedPath;
      await user.save();
    }

    res.status(200).json({
      message: 'Login successful',
      username: user.username,
      usermail: user.usermail,
      phno: user.phno,
      role: resolvedRole || user.role,
      path: resolvedPath
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { username, phno, usermail, password, role } = req.body;
    const resolvedRole = normaliseRole(role);
    if (!resolvedRole) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }
    const path = resolvePathByRole(resolvedRole);

    const newUser = await Lform.create({ username, phno, usermail, password, role: resolvedRole, path });
    res.status(201).json({ message: "User registered successfully", role: resolvedRole, path });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "User already exists" });
    res.status(500).json({ error: "Registration error" });
  }
});

// -------------------- OFFPLAYERS --------------------
app.post("/Offplayers", async (req, res) => {
  try {
    const { playerName, teamName, position, country, jerseyNumber, age, height, weight, preferredFoot, profileImageUrl } = req.body;
    const oplayer = await inplayer.create({
      username: playerName,
      teamname: teamName,
      position,
      country,
      jersey: jerseyNumber,
      image: profileImageUrl,
      age,
      height,
      weight,
      foot: preferredFoot
    });
    res.status(201).json({ message: "Player registered successfully", player: oplayer });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "Player already exists" });
    res.status(500).json({ error: "Failed to register player" });
  }
});

// ✅ NEW: Delete player from Offplayers
app.delete("/Offplayers/:username", async (req, res) => {
  try {
    const result = await inplayer.findOneAndDelete({ username: req.params.username });
    if (!result) return res.status(404).json({ message: "Player not found" });
    res.json({ message: "Player deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete player" });
  }
});


app.get('/api/datao', async (req, res) => {
  try {
    const data = await inplayer.find({});
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

app.put('/api/datao/:playerId', async (req, res) => {
  try {
    const updatedPlayer = await inplayer.findByIdAndUpdate(req.params.playerId, req.body, { new: true });
    if (!updatedPlayer) return res.status(404).json({ error: 'Player not found' });
    res.json(updatedPlayer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// -------------------- USERS --------------------
app.get('/users', async (req, res) => {
  try {
    const users = await Lform.find({}, { username: 1, role: 1, usermail: 1, phno: 1, path: 1, profileImage: 1, managedPlayers: 1, _id: 0 }).lean();
    res.json(users.map((user) => ({
      ...user,
      role: normaliseRole(user.role) || user.role,
      path: resolvePathByRole(normaliseRole(user.role) || user.role),
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/scout/players', async (_req, res) => {
  try {
    const players = await loadScoutPlayers();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scout players' });
  }
});

app.put('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { usermail, phno, profileImage } = req.body;

    if (!usermail || !phno) return res.status(400).json({ error: 'Email and phone required' });

    const updateData = { usermail, phno };
    if (profileImage) updateData.profileImage = profileImage;

    const updatedUser = await Lform.findOneAndUpdate(
      { username },
      updateData,
      { new: true, select: 'username role usermail phno path profileImage' }
    );

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.get('/agents/:username/players', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim();
    const agent = await Lform.findOne({ username, role: 'Agent' }, { managedPlayers: 1, username: 1 }).lean();

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      username: agent.username,
      managedPlayers: agent.managedPlayers || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent players' });
  }
});

// -------------------- MARKET --------------------

// Get market players
app.get('/market/players', async (req, res) => {
  try {
    const marketPlayers = await apip.find({ inMarket: true }).lean();
    const collapsedPlayers = collapseMarketPlayers(marketPlayers);
    const hydratedPlayers = await Promise.all(collapsedPlayers.map((player) => resolveStoredPlayerAgent(player)));
    res.json(hydratedPlayers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market players' });
  }
});

app.get('/market/players/find/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const decoded = decodeURIComponent(identifier);

    let player = null;

    if (mongoose.Types.ObjectId.isValid(decoded)) {
      player = await apip.findOne({ _id: decoded, inMarket: true }).lean();
      if (!player) {
        player = await apip.findOne({ _id: decoded }).lean();
      }
    }

    if (!player) {
      const players = await apip.find({
        inMarket: true,
        $or: [
          { common_name: decoded },
          { display_name: decoded },
          { username: decoded }
        ]
      }).lean();

      player = collapseMarketPlayers(players)[0] || null;
    }

    if (!player) {
      const fallbackPlayers = await apip.find({
        $or: [
          { common_name: decoded },
          { display_name: decoded },
          { username: decoded }
        ]
      }).lean();

      player = collapseMarketPlayers(fallbackPlayers)[0] || null;
    }

    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(await resolveStoredPlayerAgent(player));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Add single player to market
app.post('/market/players', async (req, res) => {
  try {
    const playerData = req.body;
    const requestedAgentUsername = playerData.agentUsername || playerData.agent?.username || playerData.managedByUsername || '';
    const agentUser = await resolveAgentUser(requestedAgentUsername);
    const agent = buildAgentContact(playerData, agentUser);
    const payload = applyAgentContact({
      ...playerData,
      inMarket: true,
      marketStatus: 'available',
      lastMarketedAt: new Date(),
    }, agent);

    let existingPlayer = await apip.findOne({
      $or: [
        { common_name: playerData.username },
        { display_name: playerData.username },
        { username: playerData.username }
      ]
    });

    const previousAgentUsername =
      existingPlayer?.agentUsername ||
      existingPlayer?.agent?.username ||
      existingPlayer?.managedByUsername ||
      '';

    let player = existingPlayer;

    if (player) {
      player = await apip.findOneAndUpdate(
        { _id: player._id },
        payload,
        { new: true }
      );
    } else {
      player = new apip(payload);
      await player.save();
    }

    if (previousAgentUsername && previousAgentUsername !== payload.managedByUsername) {
      await removeManagedPlayerFromAgent(previousAgentUsername, existingPlayer || player);
    }

    if (payload.managedByUsername) {
      await upsertManagedPlayerForAgent(payload.managedByUsername, player);
    }

    res.json(await resolveStoredPlayerAgent(player.toObject ? player.toObject() : player));
  } catch (error) {
    res.status(500).json({ error: 'Failed to add player to market' });
  }
});

app.post('/market/players/:playerId/assign-agent', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { agentUsername } = req.body;

    if (!agentUsername) {
      return res.status(400).json({ error: 'agentUsername is required' });
    }

    const player = await apip.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const previousAgentUsername =
      player.agentUsername ||
      player.agent?.username ||
      player.managedByUsername ||
      '';

    const agentUser = await resolveAgentUser(agentUsername);
    if (!agentUser) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const payload = applyAgentContact(player.toObject(), buildAgentContact({}, agentUser));

    Object.assign(player, payload);
    player.inMarket = true;
    player.marketStatus = player.marketStatus || 'available';
    player.lastMarketedAt = new Date();
    await player.save();

    if (previousAgentUsername && previousAgentUsername.toLowerCase() !== agentUser.username.toLowerCase()) {
      await removeManagedPlayerFromAgent(previousAgentUsername, player);
    }

    await upsertManagedPlayerForAgent(agentUser.username, player);

    res.json(await resolveStoredPlayerAgent(player.toObject()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign agent to player' });
  }
});

const normaliseAnalysis = (analysis) => {
  const source = analysis && typeof analysis === 'object' ? analysis : {};
  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    goals: toNumber(source.goals, 0),
    assists: toNumber(source.assists, 0),
    touches: toNumber(source.touches, 0),
    tackles: toNumber(source.tackles, 0),
    totalPoints: toNumber(source.totalPoints, 0),
    sprintSpeed: toNumber(source.sprintSpeed, 0),
    passAccuracy: toNumber(source.passAccuracy, 0),
    stamina: toNumber(source.stamina, 0),
    summary: typeof source.summary === 'string' ? source.summary : 'No summary generated.',
    strengths: Array.isArray(source.strengths) ? source.strengths.map(String).slice(0, 5) : [],
    weaknesses: Array.isArray(source.weaknesses) ? source.weaknesses.map(String).slice(0, 5) : []
  };
};

const parseModelJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Analyzer returned an empty response');
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw error;
    return JSON.parse(match[0]);
  }
};

const summariseAnalytics = (analytics, playerName) => {
  const speeds = Object.values(analytics?.player_speed || {});
  const possession = Object.entries(analytics?.possession_percentage || {});
  const topSpeed = speeds.reduce((max, item) => Math.max(max, Number(item?.max_mps_estimated || 0)), 0);
  const totalPossession = possession.reduce((max, [, value]) => Math.max(max, Number(value || 0)), 0);
  const goals = Number(analytics?.goal_count || 0);
  const shots = Number(analytics?.shot_count || 0);
  const currentBallVelocity = Number(analytics?.ball_velocity?.max_px_per_second || 0);

  const strengths = [];
  const weaknesses = [];

  if (topSpeed >= 7) strengths.push('Explosive acceleration');
  if (totalPossession >= 35) strengths.push('Strong ball retention');
  if (shots > 0) strengths.push('Active attacking involvement');

  if (topSpeed < 5) weaknesses.push('Limited top-speed coverage');
  if (totalPossession < 15) weaknesses.push('Low on-ball influence');
  if (shots === 0) weaknesses.push('No clear shooting sequence detected');

  return normaliseAnalysis({
    goals,
    assists: 0,
    touches: Number(analytics?.possession_frames || 0),
    tackles: 0,
    totalPoints: goals * 25 + shots * 10 + Math.round(totalPossession),
    sprintSpeed: Math.round(topSpeed * 3.6),
    passAccuracy: Math.round(Math.min(100, totalPossession + 45)),
    stamina: Math.round(Math.min(100, 55 + topSpeed * 5)),
    summary: `${playerName} reached an estimated max speed of ${topSpeed.toFixed(2)} m/s, with peak ball velocity of ${currentBallVelocity.toFixed(2)} px/s. The analyzer detected ${shots} shot sequence(s) and ${goals} goal event(s).`,
    strengths,
    weaknesses
  });
};

const runLocalVideoAnalytics = async ({ videoPath, outputJsonPath, annotatedVideoPath, player }) => {
  const scriptPath = path.resolve(__dirname, 'cv_analyze.py');

  await fs.access(scriptPath);

  const args = [
    scriptPath,
    '--input-video', videoPath,
    '--output-json', outputJsonPath,
    '--output-video', annotatedVideoPath,
    '--detector-model', CV_DETECTOR_MODEL,
    '--player-name', player.username || '',
    '--team-name', player.teamname || '',
    '--position', player.position || '',
    '--jersey', player.jersey || ''
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(CV_ANALYTICS_PYTHON, args, {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    let stdout = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `cv_analyze.py exited with code ${code}`));
    });
  });
};

const runRemoteVideoAnalytics = async ({ videoBuffer, video, player }) => {
  if (!COLAB_SCOUTING_API_URL) {
    throw new Error('Missing COLAB_SCOUTING_API_URL in Backend/.env');
  }

  const formData = new FormData();
  formData.append(
    'video',
    new Blob([videoBuffer], { type: video.type || 'video/mp4' }),
    video.name || 'upload.mp4'
  );
  formData.append('player_name', player.username || '');
  formData.append('team_name', player.teamname || '');
  formData.append('position', player.position || '');
  formData.append('jersey', player.jersey || '');

  const response = await fetch(`${COLAB_SCOUTING_API_URL.replace(/\/$/, '')}/analyze-scouting`, {
    method: 'POST',
    body: formData
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || `Remote scouting API failed with status ${response.status}`);
  }

  return payload;
};

app.post('/market/players/analyze-video', async (req, res) => {
  let tempDir = '';
  try {
    const { player, video } = req.body;

    if (!player?.username) {
      return res.status(400).json({ error: 'Player username is required' });
    }

    if (!video?.base64) {
      return res.status(400).json({ error: 'A base64-encoded video payload is required' });
    }

    let marketPlayer = await apip.findOne({
      $or: [
        player._id ? { _id: player._id } : null,
        { common_name: player.username },
        { display_name: player.username },
        { username: player.username }
      ].filter(Boolean)
    });

    if (!marketPlayer) {
      marketPlayer = new apip({
        ...player,
        username: player.username,
        common_name: player.username,
        display_name: player.username,
        inMarket: Boolean(player.marketed)
      });
    } else {
      Object.assign(marketPlayer, player);
    }

    const videoBuffer = Buffer.from(video.base64, 'base64');
    let analytics;
    let annotatedVideoPath = '';

    if (COLAB_SCOUTING_API_URL) {
      const remoteResult = await runRemoteVideoAnalytics({ videoBuffer, video, player });
      analytics = remoteResult?.report || remoteResult;
      annotatedVideoPath = remoteResult?.processed_video_url || remoteResult?.processed_video_path || '';
    } else {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scouttalent-cv-'));
      const inputVideoPath = path.join(tempDir, video.name || `${randomUUID()}.mp4`);
      const outputJsonPath = path.join(tempDir, 'analysis.json');
      annotatedVideoPath = path.join(tempDir, 'annotated.mp4');

      await fs.writeFile(inputVideoPath, videoBuffer);
      await runLocalVideoAnalytics({
        videoPath: inputVideoPath,
        outputJsonPath,
        annotatedVideoPath,
        player
      });

      const rawResponse = await fs.readFile(outputJsonPath, 'utf8');
      analytics = parseModelJson(rawResponse);
    }

    const generatedStats = normaliseAnalysis(analytics?.generated_stats || summariseAnalytics(analytics, player.username));
    const reportText =
      typeof analytics?.scouting_report === 'string' && analytics.scouting_report.trim()
        ? analytics.scouting_report.trim()
        : generatedStats.summary;

    marketPlayer.generatedStats = generatedStats;
    marketPlayer.scoutingReport = reportText;
    marketPlayer.videoAnalysis = {
      fileName: video.name || 'upload',
      mimeType: video.type || 'video/mp4',
      fileSize: video.size || videoBuffer.length,
      analyzedAt: new Date(),
      analyzer: COLAB_SCOUTING_API_URL ? 'colab-fastapi' : `local-cv:${CV_DETECTOR_MODEL}`,
      analytics,
      annotatedVideoPath
    };

    await marketPlayer.save();

    res.json({
      message: 'Video analyzed successfully',
      player: marketPlayer,
      generatedStats,
      analytics,
      reportText
    });
  } catch (error) {
    console.error('Video analysis failed:', error.message);
    res.status(500).json({
      error: 'Failed to analyze video locally',
      details: error.message
    });
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
});

app.post('/agent/assistant', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const agentUsername = String(req.body?.agentUsername || '').trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const managedPlayers = await getAssistantManagedPlayers(agentUsername);

    let reply = '';
    let provider = 'fallback';
    try {
      reply = await generateOllamaReply({ message, managedPlayers, history, agentUsername });
      if (reply) provider = 'ollama';
    } catch (error) {
      console.error('Ollama assistant error:', error.message);
    }

    if (!reply) {
      try {
        reply = await generateGeminiReply({ message, managedPlayers, history, agentUsername });
        if (reply) provider = 'gemini';
      } catch (error) {
        console.error('Gemini assistant error:', error.message);
      }
    }

    if (!reply) {
      reply = buildAgentAssistantFallback(message, managedPlayers);
      provider = 'fallback';
    }

    res.json({
      reply,
      playersConsidered: managedPlayers.length,
      mode: OLLAMA_MODEL ? 'ollama-or-fallback' : GEMINI_API_KEY ? 'gemini-or-fallback' : 'fallback',
      provider,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate assistant reply',
      details: error.message,
    });
  }
});

// Bulk add players to market
app.post('/market/players/bulk', async (req, res) => {
  try {
    const playersData = req.body; // array of players
    if (!Array.isArray(playersData) || playersData.length === 0) return res.status(400).json({ error: 'No players provided' });

    const addedPlayers = [];

    for (const pdata of playersData) {
      let existingPlayer = await apip.findOne({
        $or: [
          { common_name: pdata.username },
          { display_name: pdata.username },
          { username: pdata.username }
        ]
      });

      const requestedAgentUsername = pdata.agentUsername || pdata.agent?.username || pdata.managedByUsername || '';
      const agentUser = await resolveAgentUser(requestedAgentUsername);
      const agent = buildAgentContact(pdata, agentUser);
      const payload = applyAgentContact({
        ...pdata,
        inMarket: true,
        marketStatus: 'available',
        lastMarketedAt: new Date(),
      }, agent);

      const previousAgentUsername =
        existingPlayer?.agentUsername ||
        existingPlayer?.agent?.username ||
        existingPlayer?.managedByUsername ||
        '';

      let player = existingPlayer;

      if (player) {
        player = await apip.findOneAndUpdate(
          { _id: player._id },
          payload,
          { new: true }
        );
      } else {
        player = new apip(payload);
        await player.save();
      }

      if (previousAgentUsername && previousAgentUsername !== payload.managedByUsername) {
        await removeManagedPlayerFromAgent(previousAgentUsername, existingPlayer || player);
      }

      if (payload.managedByUsername) {
        await upsertManagedPlayerForAgent(payload.managedByUsername, player);
      }

      addedPlayers.push(await resolveStoredPlayerAgent(player.toObject ? player.toObject() : player));
    }

    res.json(addedPlayers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk add players' });
  }
});

// Remove single player from market
app.delete('/market/players/:playerId', async (req, res) => {
  try {
    const updatedPlayer = await apip.findOneAndUpdate({ _id: req.params.playerId }, { inMarket: false }, { new: true });
    if (!updatedPlayer) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player removed from market', player: updatedPlayer });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove player from market' });
  }
});

// Bulk remove players from market
app.delete('/market/players/bulk', async (req, res) => {
  try {
    const playersToRemove = req.body; // [{ _id, username }, ...]

    if (!Array.isArray(playersToRemove) || playersToRemove.length === 0) {
      return res.status(400).json({ error: 'No players provided' });
    }

    const bulkOperations = playersToRemove.map(p => ({
      updateOne: {
        filter: { 
          $or: [
            { _id: p._id || null },
            { common_name: p.username },
            { display_name: p.username }
          ]
        },
        update: { inMarket: false }
      }
    }));

    await apip.bulkWrite(bulkOperations);

    res.json({ message: 'Players removed from market successfully' });
  } catch (error) {
    console.error('Error removing players from market:', error);
    res.status(500).json({ error: 'Failed to remove players from market', details: error.message });
  }
});


// -------------------- CART --------------------
app.get('/cart/:scoutId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ scoutId: req.params.scoutId }) || { scoutId: req.params.scoutId, players: [] };
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.post('/cart/:scoutId/add', async (req, res) => {
  try {
    const { scoutId } = req.params;
    const playerData = req.body;

    let cart = await Cart.findOne({ scoutId });
    if (!cart) {
      cart = new Cart({ scoutId, players: [{ ...playerData, addedAt: new Date() }] });
    } else {
      const exists = cart.players.some(p => p.playerId === playerData.playerId || p.name === playerData.name);
      if (exists) return res.status(400).json({ error: 'Player already in cart' });
      cart.players.push({ ...playerData, addedAt: new Date() });
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add player to cart' });
  }
});

app.delete('/cart/:scoutId/remove/:playerId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ scoutId: req.params.scoutId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.players = cart.players.filter(p => p.playerId !== req.params.playerId && p.name !== req.params.playerId);
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove player from cart' });
  }
});

app.delete('/cart/:scoutId/clear', async (req, res) => {
  try {
    const cart = await Cart.findOne({ scoutId: req.params.scoutId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.players = [];
    await cart.save();
    res.json({ message: 'Cart cleared', cart });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

app.put('/cart/:scoutId', async (req, res) => {
  try {
    const { players } = req.body;
    const cart = await Cart.findOneAndUpdate(
      { scoutId: req.params.scoutId },
      { players: players.map(p => ({ ...p, addedAt: p.addedAt || new Date() })) },
      { upsert: true, new: true }
    );
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// -------------------- SHORTLIST --------------------
app.get('/shortlists/:scoutId', async (req, res) => {
  try {
    const shortlist = await Shortlist.findOne({ scoutId: req.params.scoutId }).lean();
    res.json(shortlist || { scoutId: req.params.scoutId, players: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shortlist' });
  }
});

app.post('/shortlists/:scoutId/add', async (req, res) => {
  try {
    const { scoutId } = req.params;
    const playerData = req.body;
    const playerId = normalisePlayerIdentifier(playerData);
    if (!playerId) {
      return res.status(400).json({ error: 'Player identifier is required' });
    }

    let shortlist = await Shortlist.findOne({ scoutId });
    if (!shortlist) {
      shortlist = new Shortlist({
        scoutId,
        players: [{
          playerId,
          name: playerData.name || playerData.common_name || playerData.display_name || playerData.username || '',
          team_name: playerData.team_name || playerData.teamname || '',
          position: playerData.position || '',
          image_url: playerData.image_url || playerData.image_path || playerData.image || '',
          agentUsername: playerData.agentUsername || '',
          addedAt: new Date(),
        }],
      });
    } else {
      const exists = shortlist.players.some((player) => player.playerId === playerId);
      if (exists) {
        return res.status(400).json({ error: 'Player already shortlisted' });
      }
      shortlist.players.push({
        playerId,
        name: playerData.name || playerData.common_name || playerData.display_name || playerData.username || '',
        team_name: playerData.team_name || playerData.teamname || '',
        position: playerData.position || '',
        image_url: playerData.image_url || playerData.image_path || playerData.image || '',
        agentUsername: playerData.agentUsername || '',
        addedAt: new Date(),
      });
    }

    await shortlist.save();
    res.json(shortlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add player to shortlist' });
  }
});

app.delete('/shortlists/:scoutId/remove/:playerId', async (req, res) => {
  try {
    const shortlist = await Shortlist.findOne({ scoutId: req.params.scoutId });
    if (!shortlist) return res.status(404).json({ error: 'Shortlist not found' });

    shortlist.players = shortlist.players.filter((player) => player.playerId !== req.params.playerId);
    await shortlist.save();
    res.json(shortlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove player from shortlist' });
  }
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
