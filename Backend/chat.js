import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Message from "./messages.js";
import Lform from "./users.js";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Chat server connected to MongoDB"))
  .catch((error) => console.error("Chat server MongoDB connection error:", error));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Maps for quick lookups
// username -> socketId
let usersByName = {};
// socketId -> username
let usersById = {};
// socketId -> allowed recipient names (provided by client UI like Cside.jsx)
let recipientsBySocket = {};
// displayName (DB username) -> socketId
let displayNameToSocketId = {};
// socketId -> displayName (DB username)
let socketIdToDisplayName = {};
// displayName -> role
let roleByDisplayName = {};

const normaliseMessage = (payload = {}) => ({
  id: payload.id || payload.clientId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  sender: typeof payload.sender === "string" ? payload.sender.trim() : "",
  receiver: typeof payload.receiver === "string" ? payload.receiver.trim() : "",
  message: typeof payload.message === "string" ? payload.message.trim() : "",
  timestamp: payload.timestamp || new Date().toISOString(),
  transport: payload.transport || "backup",
});

const serialiseMessage = (messageDoc) => ({
  id: String(messageDoc._id),
  clientId: messageDoc.clientId || "",
  sender: messageDoc.sender,
  receiver: messageDoc.receiver,
  message: messageDoc.text,
  status: messageDoc.status,
  timestamp: messageDoc.createdAt,
  deliveredAt: messageDoc.deliveredAt,
  readAt: messageDoc.readAt,
});

const persistMessage = async (payload) => {
  const message = normaliseMessage(payload);
  if (!message.sender || !message.receiver || !message.message.trim()) {
    return null;
  }

  if (message.clientId || message.id) {
    const existing = await Message.findOne({
      $or: [{ clientId: message.id }, { clientId: payload.clientId || "" }].filter(
        (entry) => entry.clientId
      ),
    });
    if (existing) {
      return existing;
    }
  }

  const created = await Message.create({
    clientId: message.id,
    sender: message.sender,
    receiver: message.receiver,
    text: message.message,
    status: payload.status || "sent",
    deliveredAt: payload.deliveredAt || null,
    readAt: payload.readAt || null,
    createdAt: message.timestamp,
    updatedAt: message.timestamp,
  });

  return created;
};

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/conversations/:username", async (req, res) => {
  try {
    const username = typeof req.params.username === "string" ? req.params.username.trim() : "";
    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    const [messages, users] = await Promise.all([
      Message.find({
        $or: [{ sender: username }, { receiver: username }],
      })
        .sort({ createdAt: -1 })
        .lean(),
      Lform.find({}, { username: 1, role: 1, _id: 0 }).lean(),
    ]);

    const userRoleMap = users.reduce((acc, user) => {
      acc[user.username] = user.role;
      return acc;
    }, {});

    const conversations = new Map();
    for (const entry of messages) {
      const otherUser = entry.sender === username ? entry.receiver : entry.sender;
      if (!conversations.has(otherUser)) {
        conversations.set(otherUser, {
          id: otherUser,
          name: otherUser,
          role: userRoleMap[otherUser] || "",
          lastMessage: entry.text,
          lastMessageAt: entry.createdAt,
          lastMessageStatus: entry.sender === username ? entry.status : "received",
          unreadCount: 0,
        });
      }

      if (entry.receiver === username && entry.status !== "read") {
        const current = conversations.get(otherUser);
        current.unreadCount += 1;
      }
    }

    res.json(Array.from(conversations.values()));
  } catch (error) {
    res.status(500).json({ error: "Failed to load conversations." });
  }
});

app.get("/messages", async (req, res) => {
  const user = typeof req.query.user === "string" ? req.query.user.trim() : "";
  const otherUser = typeof req.query.with === "string" ? req.query.with.trim() : "";

  if (!user || !otherUser) {
    return res.status(400).json({ error: "Both 'user' and 'with' query parameters are required." });
  }

  try {
    const history = await Message.find({
      $or: [
        { sender: user, receiver: otherUser },
        { sender: otherUser, receiver: user },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.json(history.map(serialiseMessage));
  } catch (error) {
    return res.status(500).json({ error: "Failed to load message history." });
  }
});

app.post("/messages", async (req, res) => {
  try {
    const stored = await persistMessage(req.body);
    if (!stored) {
      return res.status(400).json({ error: "sender, receiver, and message are required." });
    }

    return res.status(201).json({ ok: true, message: serialiseMessage(stored) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save message." });
  }
});

app.post("/messages/:id/read", async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { status: "read", readAt: new Date() },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: "Message not found." });
    }

    const senderSocketId = displayNameToSocketId[updated.sender];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages_read", {
        reader: updated.receiver,
        messageIds: [String(updated._id)],
      });
    }

    return res.json({ ok: true, message: serialiseMessage(updated) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to mark message as read." });
  }
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  const attachUsername = (username) => {
    if (!username || typeof username !== "string") return;
    // If this username is already in use by another socket, disconnect the old one
    const existingSocketId = usersByName[username];
    if (existingSocketId && existingSocketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(existingSocketId);
      if (oldSocket) {
        io.to(existingSocketId).emit("duplicate_login", { message: `You have been logged out because '${username}' logged in from another device.` });
        oldSocket.disconnect(true);
      }
      // Cleanup any stale mappings
      delete usersById[existingSocketId];
    }

    socket.username = username;
    usersByName[username] = socket.id;
    usersById[socket.id] = username;
    console.log(`${username} registered with ID ${socket.id}`);
    io.to(socket.id).emit("registered", { username });
  };

  // Backwards-compatible: support both 'register' and 'login'
  socket.on("register", (maybeUsername) => {
    const username =
      typeof maybeUsername === "string" && maybeUsername.trim().length > 0
        ? maybeUsername.trim()
        : socket.id;
    attachUsername(username);
  });

  socket.on("login", (payload) => {
    const username =
      payload && typeof payload.username === "string" && payload.username.trim().length > 0
        ? payload.username.trim()
        : socket.id;
    attachUsername(username);
  });

  // Map this socket to a human display name (DB username)
  socket.on("set_display_name", (displayName) => {
    if (typeof displayName === "string" && displayName.trim().length > 0) {
      displayNameToSocketId[displayName] = socket.id;
      socketIdToDisplayName[socket.id] = displayName;
      console.log(`Display name '${displayName}' mapped to ${socket.id}`);
      io.emit("presence_update", {
        username: displayName,
        online: true,
        role: roleByDisplayName[displayName] || "",
      });
    }
  });

  socket.on("set_profile", ({ displayName, role }) => {
    if (typeof displayName === "string" && displayName.trim()) {
      const name = displayName.trim();
      roleByDisplayName[name] = typeof role === "string" ? role : "";
      displayNameToSocketId[name] = socket.id;
      socketIdToDisplayName[socket.id] = name;
      io.emit("presence_update", {
        username: name,
        online: true,
        role: roleByDisplayName[name] || "",
      });
    }
  });

  // Client can provide allowed recipient names (e.g., from Cside.jsx list)
  socket.on("set_recipients", (names) => {
    if (Array.isArray(names)) {
      recipientsBySocket[socket.id] = names.filter((n) => typeof n === "string");
      io.to(socket.id).emit("recipients_set", { names: recipientsBySocket[socket.id] });
    }
  });

  socket.on("private_message", async ({ id, sender, receiver, message, timestamp }) => {
    try {
      const effectiveSender = usersById[socket.id] || sender;
      const allowedRecipients = recipientsBySocket[socket.id];
      if (Array.isArray(allowedRecipients) && receiver && !allowedRecipients.includes(receiver)) {
        io.to(socket.id).emit("error", { message: `Receiver '${receiver}' not in allowed recipients.` });
        return;
      }

      const receiverId = displayNameToSocketId[receiver] || usersByName[receiver];
      const senderDisplay = socketIdToDisplayName[socket.id] || effectiveSender;
      const storedMessage = await persistMessage({
        id,
        sender: senderDisplay,
        receiver,
        message,
        timestamp,
        status: receiverId ? "delivered" : "sent",
        deliveredAt: receiverId ? new Date() : null,
      });

      if (!storedMessage) {
        io.to(socket.id).emit("error", { message: "Cannot send an empty message." });
        return;
      }

      const serialised = serialiseMessage(storedMessage);

      io.to(socket.id).emit("message_saved", serialised);

      if (receiverId) {
        io.to(receiverId).emit("private_message", serialised);
      }
    } catch (error) {
      io.to(socket.id).emit("error", { message: "Failed to send message." });
    }
  });

  socket.on("typing", ({ to, from, isTyping }) => {
    const receiverId = displayNameToSocketId[to] || usersByName[to];
    if (!receiverId) return;

    io.to(receiverId).emit("typing", {
      from: socketIdToDisplayName[socket.id] || from,
      isTyping: Boolean(isTyping),
    });
  });

  socket.on("mark_read", async ({ conversationWith, reader, messageIds }) => {
    try {
      const ids = Array.isArray(messageIds) ? messageIds.filter(Boolean) : [];
      if (!ids.length) return;

      await Message.updateMany(
        {
          _id: { $in: ids },
          sender: conversationWith,
          receiver: reader,
          status: { $ne: "read" },
        },
        { status: "read", readAt: new Date() }
      );

      const senderSocketId = displayNameToSocketId[conversationWith];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messages_read", {
          reader,
          messageIds: ids,
        });
      }
    } catch (_error) {
      io.to(socket.id).emit("error", { message: "Failed to update read status." });
    }
  });

  socket.on("disconnect", () => {
    const username = usersById[socket.id];
    if (username) {
      delete usersByName[username];
    }
    delete usersById[socket.id];
    delete recipientsBySocket[socket.id];
    // Clean display name mappings
    const disp = socketIdToDisplayName[socket.id];
    if (disp && displayNameToSocketId[disp] === socket.id) {
      delete displayNameToSocketId[disp];
      io.emit("presence_update", {
        username: disp,
        online: false,
        role: roleByDisplayName[disp] || "",
      });
    }
    delete socketIdToDisplayName[socket.id];
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
