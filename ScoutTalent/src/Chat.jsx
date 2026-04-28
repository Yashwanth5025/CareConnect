import React, { useEffect, useRef, useState } from "react";
import Cside from "./Cside";
import Cwin from "./Cwin";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";

const CHAT_SOCKET_URL = "http://localhost:5000";
const chatStorageKey = (username) => `chatBackup:${username || "guest"}`;

const getMessageKeys = (message = {}) =>
  [message.id, message.clientId].filter((value) => typeof value === "string" && value.trim());

const mergeThreadMessages = (existing = [], incoming = []) => {
  const merged = [...existing];
  const seen = new Set(existing.flatMap((message) => getMessageKeys(message)));

  incoming.forEach((message) => {
    if (!message) return;
    const keys = getMessageKeys(message);
    if (!keys.length || keys.some((key) => seen.has(key))) return;
    merged.push(message);
    keys.forEach((key) => seen.add(key));
  });

  return merged.sort((a, b) => {
    const aTime = new Date(a.timestamp || 0).getTime();
    const bTime = new Date(b.timestamp || 0).getTime();
    return aTime - bTime;
  });
};

const mergeMessageMaps = (current = {}, incoming = {}) => {
  const next = { ...current };

  Object.entries(incoming).forEach(([thread, messages]) => {
    next[thread] = mergeThreadMessages(next[thread] || [], Array.isArray(messages) ? messages : []);
  });

  return next;
};

function Chat() {
  const location = useLocation();
  const [users, setUsers] = useState([]); // DB usernames for sidebar
  const [selectedChat, setSelectedChat] = useState(null); // receiver display name
  const [messagesByUser, setMessagesByUser] = useState({});
  const [mySocketUsername, setMySocketUsername] = useState(null); // this will be socket.id
  const [myDisplayName, setMyDisplayName] = useState(null); // from saved login
  const [searchTerm, setSearchTerm] = useState("");
  const [connectionState, setConnectionState] = useState("connecting");
  const [typingByUser, setTypingByUser] = useState({});
  const [presenceByUser, setPresenceByUser] = useState({});
  const [draftMessage, setDraftMessage] = useState("");
  const socketRef = useRef(null);
  const currentRoleRef = useRef("");

  // Load saved login display name if present (set elsewhere in app after login)
  useEffect(() => {
    try {
      // Prefer the value stored by Login.jsx on successful login
      const candidates = [
        localStorage.getItem("chatUsername"),
        localStorage.getItem("username"),
        localStorage.getItem("userl"),
        sessionStorage.getItem("username"),
        sessionStorage.getItem("userl"),
      ];
      const found = candidates.find(v => v && typeof v === "string" && v.trim().length > 0);
      if (found) setMyDisplayName(found.trim());
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!myDisplayName) return;

    try {
      const saved = JSON.parse(localStorage.getItem(chatStorageKey(myDisplayName)) || "{}");
      setMessagesByUser((prev) => mergeMessageMaps(prev, saved));
    } catch (error) {
      console.error("Failed to load saved chat backup", error);
    }
  }, [myDisplayName]);

  useEffect(() => {
    const preselectedChat = location.state?.selectedChat;
    const incomingDraft = location.state?.draftMessage || "";

    if (preselectedChat) {
      setUsers((prev) => (
        prev.some((entry) => entry.name === preselectedChat)
          ? prev
          : prev.concat([{ id: preselectedChat, name: preselectedChat, role: "Agent" }])
      ));
      setSelectedChat(preselectedChat);
    }

    if (incomingDraft) {
      setDraftMessage(incomingDraft);
    }
  }, [location.state]);

  useEffect(() => {
    if (!myDisplayName) return;

    try {
      localStorage.setItem(chatStorageKey(myDisplayName), JSON.stringify(messagesByUser));
    } catch (error) {
      console.error("Failed to save chat backup", error);
    }
  }, [messagesByUser, myDisplayName]);

  // Fetch users from Backend (Plimg.js)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const resp = await fetch("http://localhost:5501/users");
        const data = await resp.json();
        // Expecting array of { username, ... }
        if (Array.isArray(data)) {
          setUsers(data.map(u => ({ id: u.username, name: u.username, role: u.role })));
        }
      } catch (e) {
        console.error("Failed to load users", e);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const role = (() => {
      try {
        return localStorage.getItem("role") || "";
      } catch (_) {
        return "";
      }
    })();
    currentRoleRef.current = role;
  }, []);

  // Start chat with arbitrary username (from search)
  const handleStartChatFromSearch = () => {
    const name = (searchTerm || "").trim();
    if (!name) return;
    // Ensure user appears in sidebar and is selectable
    setUsers(prev => (prev.some(u => u.name === name) ? prev : prev.concat([{ id: name, name, role: "" }])));
    setSelectedChat(name);
    // Also push updated recipients to server so validation (if any) includes this name
    const socket = socketRef.current;
    if (socket) {
      const recipientNames = users
        .map(u => u.name)
        .filter(n => (myDisplayName ? n !== myDisplayName : true));
      const list = recipientNames.includes(name) ? recipientNames : recipientNames.concat([name]);
      socket.emit("set_recipients", list);
    }
  };

  // Initialize socket.io and wire events (connect once)
  useEffect(() => {
    const socket = io(CHAT_SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      // Prefer attaching the saved display name as the socket username
      if (myDisplayName && myDisplayName.trim().length > 0) {
        socket.emit("login", { username: myDisplayName.trim() });
        socket.emit("set_profile", {
          displayName: myDisplayName.trim(),
          role: currentRoleRef.current,
        });
      } else {
        // Fallback: backend will use socket.id
        socket.emit("login");
      }
    });

    socket.on("registered", ({ username }) => {
      // Prefer using the saved/display username for our identity
      setMySocketUsername(myDisplayName || username);
      // Map this socket to display name (if we have one from saved login)
      if (myDisplayName) {
        socket.emit("set_display_name", myDisplayName);
        socket.emit("set_profile", {
          displayName: myDisplayName,
          role: currentRoleRef.current,
        });
      }
    });

    socket.on("private_message", ({ id, sender, message, timestamp, status, readAt, deliveredAt }) => {
      // Ensure the sender exists in sidebar users to allow selection
      setUsers(prev => {
        if (!prev.some(u => u.name === sender)) {
          return prev.concat([{ id: sender, name: sender, role: "" }]);
        }
        return prev;
      });
      // Append message under sender thread
      setMessagesByUser(prev => mergeMessageMaps(prev, {
        [sender]: [{
          id: id || `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          clientId: id || "",
          from: sender,
          text: message,
          timestamp: timestamp || new Date().toISOString(),
          status: status || "delivered",
          readAt,
          deliveredAt,
        }]
      }));
    });

    socket.on("message_saved", (message) => {
      const chatPeer = message.receiver;
      setMessagesByUser((prev) => {
        const currentThread = prev[chatPeer] || [];
        const updatedThread = currentThread.map((entry) =>
          entry.id === message.clientId || entry.id === message.id
          || entry.clientId === message.clientId || entry.clientId === message.id
            ? {
                ...entry,
                id: message.id,
                clientId: message.clientId || entry.clientId || entry.id,
                status: message.status,
                timestamp: message.timestamp,
                deliveredAt: message.deliveredAt,
                readAt: message.readAt,
              }
            : entry
        );

        return { ...prev, [chatPeer]: updatedThread };
      });
    });

    socket.on("messages_read", ({ reader, messageIds }) => {
      if (!reader || !Array.isArray(messageIds)) return;
      setMessagesByUser((prev) => {
        const currentThread = prev[reader] || [];
        return {
          ...prev,
          [reader]: currentThread.map((entry) =>
            messageIds.includes(entry.id)
              ? { ...entry, status: "read", readAt: new Date().toISOString() }
              : entry
          ),
        };
      });
    });

    socket.on("typing", ({ from, isTyping }) => {
      if (!from) return;
      setTypingByUser((prev) => ({ ...prev, [from]: Boolean(isTyping) }));
    });

    socket.on("presence_update", ({ username, online }) => {
      if (!username) return;
      setPresenceByUser((prev) => ({ ...prev, [username]: Boolean(online) }));
    });

    socket.on("warn", (w) => {
      const msg = typeof w === 'object' ? (w.message || JSON.stringify(w)) : String(w);
      console.warn("Socket warn:", msg);
    });

    socket.on("error", (err) => {
      setConnectionState("degraded");
      console.error("Socket error", err);
    });

    socket.on("disconnect", () => {
      setConnectionState("offline");
    });

    socket.on("connect_error", (error) => {
      setConnectionState("offline");
      console.error("Socket connect error", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [myDisplayName]);

  // Whenever users or display name change, push recipients
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const recipientNames = users
      .map(u => u.name)
      .filter(name => (myDisplayName ? name !== myDisplayName : true));
    if (recipientNames.length > 0) {
      socket.emit("set_recipients", recipientNames);
    }
    // If our name sneaks in somehow, switch away
    if (selectedChat && myDisplayName && selectedChat === myDisplayName) {
      // If our name sneaks in somehow, switch away
      const other = recipientNames.find(n => n !== myDisplayName);
      if (other) setSelectedChat(other);
      else setSelectedChat(null);
    }
  }, [users, myDisplayName, selectedChat]);

  // If display name becomes available later, inform server mapping
  useEffect(() => {
    const socket = socketRef.current;
    if (socket && myDisplayName) {
      // Re-attach username for consistency (helps after late login)
      socket.emit("login", { username: myDisplayName.trim() });
      socket.emit("set_display_name", myDisplayName);
      socket.emit("set_profile", {
        displayName: myDisplayName.trim(),
        role: currentRoleRef.current,
      });
    }
  }, [myDisplayName]);

  useEffect(() => {
    if (!myDisplayName || !selectedChat) return;

    let cancelled = false;

    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${CHAT_SOCKET_URL}/messages?user=${encodeURIComponent(myDisplayName)}&with=${encodeURIComponent(selectedChat)}`
        );
        if (!response.ok) return;

        const history = await response.json();
        const mapped = (Array.isArray(history) ? history : []).map((entry) => ({
          id: entry.id,
          clientId: entry.clientId,
          from: entry.sender,
          text: entry.message,
          timestamp: entry.timestamp,
          status: entry.status || "sent",
          deliveredAt: entry.deliveredAt,
          readAt: entry.readAt,
        }));

        if (!cancelled) {
          setMessagesByUser((prev) => mergeMessageMaps(prev, { [selectedChat]: mapped }));
        }
      } catch (error) {
        console.error("Failed to load backup chat history", error);
      }
    };

    loadHistory();
    const timer = window.setInterval(loadHistory, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [myDisplayName, selectedChat]);

  useEffect(() => {
    if (!myDisplayName || !selectedChat) return;

    const unreadMessageIds = (messagesByUser[selectedChat] || [])
      .filter((entry) => entry.from === selectedChat && entry.status !== "read")
      .map((entry) => entry.id)
      .filter(Boolean);

    if (!unreadMessageIds.length) return;

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("mark_read", {
        conversationWith: selectedChat,
        reader: myDisplayName,
        messageIds: unreadMessageIds,
      });
    }

    unreadMessageIds.forEach((messageId) => {
      fetch(`${CHAT_SOCKET_URL}/messages/${messageId}/read`, { method: "POST" }).catch(() => {});
    });

    setMessagesByUser((prev) => ({
      ...prev,
      [selectedChat]: (prev[selectedChat] || []).map((entry) =>
        unreadMessageIds.includes(entry.id) ? { ...entry, status: "read", readAt: new Date().toISOString() } : entry
      ),
    }));
  }, [messagesByUser, myDisplayName, selectedChat]);

  const loadConversations = async () => {
    if (!myDisplayName) return;

    try {
      const response = await fetch(`${CHAT_SOCKET_URL}/conversations/${encodeURIComponent(myDisplayName)}`);
      if (!response.ok) return;
      const conversations = await response.json();
      setUsers((prev) => {
        const map = new Map(prev.map((entry) => [entry.name, entry]));
        (Array.isArray(conversations) ? conversations : []).forEach((entry) => {
          map.set(entry.name, {
            ...(map.get(entry.name) || { id: entry.name, name: entry.name }),
            ...entry,
          });
        });
        return Array.from(map.values());
      });
    } catch (error) {
      console.error("Failed to load conversations", error);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [myDisplayName]);

  // Compute sidebar chats excluding current display name (if known)
  const currentRole = (() => {
    try {
      return localStorage.getItem("role") || "";
    } catch (_) {
      return "";
    }
  })();

  const sidebarChats = users
    .filter(u => (myDisplayName ? u.name !== myDisplayName : true))
    .filter(u => {
      if (!currentRole) return true;
      if (currentRole === "Scout") return u.role === "Agent";
      if (currentRole === "Agent") return u.role === "Scout";
      return true;
    })
    .filter(u => !searchTerm || u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .map((user) => ({
      ...user,
      online: presenceByUser[user.name] || false,
      typing: typingByUser[user.name] || false,
    }))
    .sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

  // Messages for currently selected receiver
  const currentMessages = selectedChat ? (messagesByUser[selectedChat] || []) : [];

  // Send message via socket
  const handleSendMessage = async (receiver, text) => {
    const socket = socketRef.current;
    const target = receiver || selectedChat;
    if (!socket || !target || !text || !text.trim()) {
      console.warn("No receiver selected or empty message. Select a chat before sending.");
      return;
    }

    const senderName = myDisplayName || mySocketUsername;
    const messagePayload = {
      id: `${senderName || "me"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clientId: `${senderName || "me"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: senderName || "me",
      text: text.trim(),
      timestamp: new Date().toISOString(),
      status: socket.connected ? "sent" : "backup",
    };

    messagePayload.id = messagePayload.clientId;

    setMessagesByUser((prev) => mergeMessageMaps(prev, { [target]: [messagePayload] }));

    if (socket.connected) {
      socket.emit("private_message", {
        id: messagePayload.clientId,
        sender: senderName,
        receiver: target,
        message: text.trim(),
        timestamp: messagePayload.timestamp,
      });
    } else {
      setConnectionState("offline");
      try {
        await fetch(`${CHAT_SOCKET_URL}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: messagePayload.clientId,
            sender: senderName,
            receiver: target,
            message: text.trim(),
            timestamp: messagePayload.timestamp,
            transport: "backup",
            status: "sent",
          }),
        });
        loadConversations();
      } catch (error) {
        console.error("Failed to save chat backup", error);
      }
    }
  };

  const handleTyping = (receiver, isTyping) => {
    const socket = socketRef.current;
    if (!socket?.connected || !receiver) return;

    socket.emit("typing", {
      to: receiver,
      from: myDisplayName || mySocketUsername,
      isTyping,
    });
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-400">
    <div className="flex h-full w-full overflow-hidden">
      <Cside
        chats={sidebarChats}
        selectedChat={selectedChat}
        onSelect={setSelectedChat}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchStartChat={handleStartChatFromSearch}
      />
      <Cwin
        chatName={selectedChat}
        messages={currentMessages}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        myUsername={mySocketUsername}
        connectionState={connectionState}
        typingUser={typingByUser[selectedChat] ? selectedChat : ""}
        externalDraft={draftMessage}
      />
      </div>
    </div>
  );
}

export default Chat;
