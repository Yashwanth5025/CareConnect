import React, { useEffect, useRef, useState } from "react";

function Cwin({ chatName, messages, onSendMessage, onTyping, myUsername, connectionState, typingUser, externalDraft, onDraftApplied }) {
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const lastAppliedDraftRef = useRef("");

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !chatName) return;
    if (typeof onSendMessage === "function") {
      onSendMessage(chatName, text);
    }
    setInput("");
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  useEffect(() => {
    if (!externalDraft || externalDraft === lastAppliedDraftRef.current) return;
    setInput(externalDraft);
    lastAppliedDraftRef.current = externalDraft;
    onDraftApplied?.();
  }, [externalDraft, onDraftApplied]);

  return (
    <div className="flex-1 min-w-0 h-full bg-white flex flex-col overflow-hidden">
      {/* 🔹 Full-width Top Navbar */}
      <div className="bg-[#19325F] text-white text-lg font-semibold p-4 w-full">
        {chatName ? `Chat with ${chatName}` : "Select a chat"}
      </div>
      {connectionState !== "connected" && (
        <div className="bg-amber-100 text-amber-800 px-4 py-2 text-sm border-b border-amber-200">
          {connectionState === "connecting"
            ? "Connecting to live chat..."
            : "Live chat is unavailable. Messages are being kept in backup mode."}
        </div>
      )}

      {/* 🔹 Messages Area */}
      <div className="flex-1 min-h-0 mb-0 space-y-3 overflow-y-auto flex flex-col p-4">
        {messages.map((msg, index) => (
          <div
            key={msg.id || index}
            className={`p-3 rounded-xl max-w-[60%] ${
              msg.from === myUsername
                ? "self-end bg-[#d9fdd3] text-black"
                : "self-start bg-[#274f9a] text-white"
            }`}
          >
            <div className="whitespace-pre-wrap break-words">{msg.text}</div>
            <div className={`text-[10px] mt-1 ${msg.from === myUsername ? "text-slate-500" : "text-blue-100"}`}>
              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              {msg.from === myUsername && `  ${msg.status || "sent"}`}
            </div>
          </div>
        ))}
        {typingUser && (
          <div className="self-start bg-slate-100 text-slate-500 px-3 py-2 rounded-xl text-sm">
            {typingUser} is typing...
          </div>
        )}
        <div ref={endRef} />
      </div>

     
        <div className="flex items-center bg-[#E5E7EB] p-3 border-t border-slate-200 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              onTyping?.(chatName, e.target.value.trim().length > 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim() && chatName) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 p-2 rounded-lg border-none mr-3 text-black bg-white placeholder-gray-500"
            placeholder={
          chatName ? "Type a message..." : "Select a chat to start messaging"
            }
            disabled={!chatName}
          />
          <button
            onClick={sendMessage}
            className="bg-[#19325F] text-white font-semibold text-base px-6 py-3 rounded-lg disabled:opacity-50 transition-transform active:scale-95"
            disabled={!chatName || !input.trim()}
          >
            Send
          </button>
        </div>
          </div>
        );
      }

      export default Cwin;
