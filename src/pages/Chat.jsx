import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  CheckIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

// 👇 setup socket connection (singleton)
const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

// ====================================================================
// 💡 AI CHATBOT CONSTANTS (Must match Home.jsx)
// ====================================================================
const AI_CHAT_ID = "ai-chatbot-genius-gemini";
const AI_CHAT_NAME = "Genius AI";
const AI_AVATAR = "chatbot.png";


// Safety helpers
const toStr = (v) => (v == null ? "" : String(v));

function getInitial(name) {
  const s = toStr(name).trim();
  return s ? s[0].toUpperCase() : "U";
}

const DELETED_USER_LABEL = "User account deactivated";

function isDeletedOrMissingUser(user) {
  if (!user) return true;
  const hasName = toStr(user.username || user.email).trim().length > 0;
  return !hasName;
}

function resolveAvatar(user) {
  if (isDeletedOrMissingUser(user)) return "/nouser.png";
  if (user.photoUrl) return `${BACKEND_URL}${user.photoUrl}`;
  const name = user.username || user.email || "U";
  const letter = getInitial(name);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(letter)}`;
}

function resolveDisplayName(user, fallback = "User") {
  if (isDeletedOrMissingUser(user)) return DELETED_USER_LABEL;
  return user.username || user.email || fallback;
}

function mapServerMsg(m, myId) {
  const mine = String(m?.sender?._id || m?.sender) === String(myId);
  const senderUser = typeof m?.sender === "object" ? m.sender : { _id: m?.sender };
  const authorName = resolveDisplayName(senderUser, "User");
  return {
    id: String(m._id),
    author: {
      id: String(senderUser?._id || "unknown"),
      name: authorName,
      avatar: resolveAvatar(senderUser),
    },
    text: m.text || "",
    time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    outgoing: mine,
    status: m.status || (mine ? "sent" : undefined),
    reactions: [],
  };
}

// ====================================================================
// 💡 AI Message Mapping Helper
// ====================================================================
function mapAiMsg(text, isOutgoing, myId, myName) {
    const senderId = isOutgoing ? myId : AI_CHAT_ID;
    const senderName = isOutgoing ? myName : AI_CHAT_NAME;
    const senderAvatar = isOutgoing 
      ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(getInitial(myName))}`
      : AI_AVATAR;

    return {
        // Use a client-side ID for AI messages
        id: `local-${Date.now()}-${Math.random()}`,
        author: {
            id: senderId,
            name: senderName,
            avatar: senderAvatar,
        },
        text: text,
        time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        outgoing: isOutgoing,
        status: isOutgoing ? "sent" : "read", // Status for AI is always 'read' or 'sent' immediately
        reactions: [],
    };
}


export default function Chat() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const conversationId =
    typeof window !== "undefined"
      ? localStorage.getItem("activeConversationId")
      : null;
  const conversationName =
    typeof window !== "undefined"
      ? localStorage.getItem("activeConversationName")
      : null;
  const myId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const myName = 
    typeof window !== "undefined" ? localStorage.getItem("username") : "Me"; // Get myName for optimistic updates
  
  // 💡 NEW: Check the AI flag from localStorage
  const isAIChat =
    typeof window !== "undefined"
      ? localStorage.getItem("isAIChat") === "true"
      : false;


  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [err, setErr] = useState("");
  // Set loading to false initially for AI chat to show welcome message immediately
  const [loading, setLoading] = useState(isAIChat ? false : true); 
  const listRef = useRef(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef(null);

  if (!token || !conversationId || !conversationName) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-3 text-sm text-red-600">
            Missing token or conversation. <br />
            Please select a user from Contacts.
          </p>
          <button
            onClick={() => (window.location.href = "/logined")}
            className="px-4 py-2 rounded-lg bg-btn text-white"
          >
            Go to Contacts
          </button>
        </div>
      </div>
    );
  }

  const partner = useMemo(() => {
    // 💡 UPDATE: Use static AI details if it's the AI chat
    if (isAIChat) {
      return {
        name: AI_CHAT_NAME,
        avatar: AI_AVATAR,
        status: "online",
      };
    }

    const isDeleted = toStr(conversationName).trim() === DELETED_USER_LABEL;
    const avatar = isDeleted
      ? "/nouser.png"
      : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          getInitial(conversationName)
        )}`;
    return {
      name: conversationName,
      avatar,
      status: "online",
    };
  }, [conversationName, isAIChat]);

  useEffect(() => {
    const listElement = listRef.current;
    if (listElement) {
      listElement.scrollTop = listElement.scrollHeight;
    }
  }, [messages]);

  // Load old messages once / Initialize AI chat
  useEffect(() => {
    // 💡 UPDATE: Skip loading messages from API for AI chat
    if (!isAIChat) {
      loadMessages();
    } else {
      // For AI chat, start with a welcome message
      const welcome = mapAiMsg("Hey there! I'm Genius AI. Ask me anything casual!", false, myId, myName);
      setMessages([welcome]);
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [conversationId, isAIChat]);

  // Setup socket.io listeners (Only for REAL chats)
  useEffect(() => {
    // 💡 SKIP socket setup for AI
    if (isAIChat || !conversationId || !myId) return; 

    socket.emit("joinConversation", conversationId); // 👈 join the room

    socket.on("newMessage", (m) => {
      if (m?.conversation?._id !== conversationId) return;

      const mapped = mapServerMsg(m, myId);

      setMessages((prev) => {
        // Replace optimistic message if text matches and it's outgoing
        const idx = prev.findIndex(
          (msg) =>
            msg.outgoing &&
            msg.text === mapped.text &&
            msg.id.startsWith("temp-")
        );
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = mapped;
          return copy;
        }

        // Update status if same id already exists
        const idIdx = prev.findIndex((msg) => msg.id === mapped.id);
        if (idIdx !== -1) {
          const copy = [...prev];
          copy[idIdx] = { ...copy[idIdx], status: mapped.status };
          return copy;
        }

        // Otherwise append new
        return [...prev, mapped];
      });
    });

    return () => {
      socket.off("newMessage");
    };
  }, [conversationId, myId, isAIChat]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  async function loadMessages() {
    // 💡 This function only runs for REAL chats now
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`${API_BASE}/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to load messages");
      }
      const data = await res.json();
      const ordered = [...(data.messages || [])].reverse();
      const mapped = ordered.map((m) => mapServerMsg(m, myId));
      setMessages(mapped);
      setIsTyping(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || isTyping) return;
    const text = input.trim();
    setInput("");
    setShowEmojiPicker(false);

    // ====================================================================
    // 💡 CORE UPDATE: SENDING LOGIC BRANCH
    // ====================================================================

    if (isAIChat) {
        // --- AI CHAT LOGIC ---
        const userMsg = mapAiMsg(text, true, myId, myName);
        // Optimistic update: add user's message
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true); // Show typing indicator

        try {
            // 1. Prepare the conversation history for the API
            const history = messages
                // Filter out any messages with empty text before slicing
                .filter(m => m.text && m.text.trim().length > 0)
                .slice(-10) // Use the last 10 valid messages for context
                .map(m => ({
                    // API roles must be 'user' (for human) or 'model' (for AI response)
                    role: m.outgoing ? 'user' : 'model', 
                    parts: [{ text: m.text }]
                }));
            
            // 2. Add the NEW user message to the history
            const currentContents = [
                ...history,
                { role: 'user', parts: [{ text: text }] }
            ];

            const res = await fetch(`${API_BASE}/chatbot/ask`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`, 
                    "Content-Type": "application/json",
                },
                // 💡 CRITICAL FIX: Send the full conversation array
                body: JSON.stringify({ contents: currentContents }), 
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || "AI failed to respond");
            }

            const data = await res.json();
            const aiReply = data.reply;
            const aiMsg = mapAiMsg(aiReply, false, myId, myName);

            // Add AI response
            setMessages((prev) => [...prev, aiMsg]);
        } catch (e) {
            setErr(e.message);
            
            // Revert optimistic update and display error on the last message
            setMessages(prev => prev.map(m => m.id === userMsg.id ? {
                ...m,
                // Update text to include the error so the user knows
                text: `${m.text} [Error: AI failed to respond]`,
                status: 'failed'
            } : m));
        } finally {
            setIsTyping(false);
        }

    } else {
        // --- REAL CHAT LOGIC ---
        try {
            const tempId = `temp-${Date.now()}`;
            const optimistic = mapServerMsg({ 
                _id: tempId, 
                text, 
                sender: { _id: myId, username: myName }, // Use myName here
                createdAt: new Date(),
                status: 'sent'
            }, myId);
            
            setMessages((prev) => [...prev, optimistic]);

            const res = await fetch(`${API_BASE}/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ conversationId, text }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || "Failed to send");
            }
            const saved = await res.json();
            const mapped = mapServerMsg(saved, myId);

            // Replace optimistic with real
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? mapped : m))
            );
        } catch (e) {
            setErr(e.message);
        }
    }
  }

  const handleEmojiSelect = (emoji) => {
    setInput((prevInput) => prevInput + emoji);
  };

  return (
    <div className="h-screen bg-seco flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="h-16 flex items-center justify-between bg-white rounded-3xl border border-gray-200 px-4">
            <div className="flex items-center gap-3">
              <button
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
                onClick={() => (window.location.href = "/logined")}
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
              </button>
              <img
                src={partner.avatar}
                alt={partner.name}
                className="h-10 w-10 rounded-full"
              />
              <div>
                <p className="font-semibold leading-5">{partner.name}</p>
                <p className="text-xs text-gray-500">
                  {/* 💡 UPDATE: Show 'AI Assistant' status */}
                  {isAIChat ? "AI Assistant" : (partner.status === "online" ? "Online" : "Last seen recently")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Message list */}
      <main
        className="mx-auto max-w-4xl w-full px-4 flex-1 overflow-y-auto py-4 no-scrollbar"
        ref={listRef}
      >
        {/* 💡 UPDATE: Change divider label for AI chat */}
        <DayDivider label={isAIChat ? "AI Chat Start" : "Today"} /> 

        {loading && <div className="text-sm text-gray-600 py-2">Loading…</div>}
        {!!err && !loading && (
          <div className="text-sm text-red-600 py-2">Error: {err}</div>
        )}

        <ul className="space-y-3">
          {!loading &&
            !err &&
            messages.map((m, idx) => {
              const prev = messages[idx - 1];
              const showAvatar =
                !m.outgoing && (!prev || prev.author.id !== m.author.id);
              return <MessageBubble key={m.id} msg={m} showAvatar={showAvatar} />;
            })}
        </ul>

        {/* 💡 UPDATE: Only show typing for AI if isTyping is true */}
        {isTyping && (
          <div className="mt-4 flex items-end gap-2">
            <img
              src={partner.avatar}
              alt={partner.name}
              className="h-6 w-6 rounded-full border border-white shadow"
            />
            <TypingDots />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="bg-white border rounded-3xl border-gray-200 px-4 py-3">
            <div className="flex items-end gap-2 relative">
              <div className="flex items-center gap-1 z-10">
                <IconBtn
                  title="Emoji"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <FaceSmileIcon className="h-6 w-6 text-gray-700" />
                </IconBtn>
              </div>
              {showEmojiPicker && (
                <div ref={emojiRef} className="absolute bottom-full left-0 mb-2">
                  <EmojiPicker onSelect={handleEmojiSelect} />
                </div>
              )}
              <div className="flex-1">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault(); // stop newline
                      sendMessage();      // send on Enter
                    }
                  }}
                  placeholder={`Message ${partner.name}`}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
              <button
                onClick={sendMessage}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-btn text-white hover:bg-btn shadow"
                title="Send (Ctrl/Cmd+Enter)"
              >
                <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
                <span className="hidden md:inline text-sm">Send</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Emoji Picker
function EmojiPicker({ onSelect }) {
  const emojis = [
    "😀","😁","😂","🤣","😊","🙂","👍","❤️","🔥","🎉","💯","🤔","🤷","🚀","💡","💰","💪","😎",
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-lg max-w-sm">
      <div className="grid grid-cols-6 gap-2">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => onSelect(emoji)}
            className="p-2 rounded-lg text-xl hover:bg-gray-100 transition"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function DayDivider({ label }) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-500">{label}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    </div>
  );
}

function MessageBubble({ msg, showAvatar }) {
  const base =
    "max-w-xs px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm flex flex-col";
  const bubble = msg.outgoing
    ? "bg-btn text-white rounded-br-md items-end"
    : "bg-white text-gray-900 border border-gray-200 rounded-bl-md items-start";

  return (
    <li className={`flex items-end gap-2 ${msg.outgoing ? "justify-end" : ""}`}>
      {!msg.outgoing && (
        <>
          {showAvatar ? (
            <img
              src={msg.author.avatar}
              alt={msg.author.name}
              className="h-7 w-7 rounded-full border border-white shadow"
            />
          ) : (
            <span className="h-7 w-7" />
          )}
        </>
      )}
      <div className="min-w-0">
        <div className={`${base} ${bubble}`}>
          {!msg.outgoing && showAvatar && (
            <p className="text-[11px] font-medium text-gray-500 mb-1">
              {msg.author.name}
            </p>
          )}
          <p className="break-words mb-1">{msg.text}</p>
          <div className="flex items-center gap-1">
            <span
              className={`text-[11px] ${msg.outgoing ? "text-indigo-100" : "text-gray-500"}`}
            >
              {msg.time}
            </span>
            {msg.outgoing && <StatusIcon status={msg.status} />}
          </div>
        </div>
      </div>
    </li>
  );
}

function StatusIcon({ status }) {
  if (!status) return null;
  if (status === "sent") return <CheckIcon className="h-4 w-4 text-indigo-200" />;
  if (status === "delivered")
    return (
      <span className="inline-flex">
        <CheckIcon className="h-4 w-4 -mr-2 text-indigo-200" />
        <CheckIcon className="h-4 w-4 text-indigo-200" />
      </span>
    );
  if (status === "read") return <CheckBadgeIcon className="h-4 w-4 text-emerald-300" />;
  return null;
}

function TypingDots() {
  return (
    <div className="px-3 py-1.5 rounded-2xl bg-white border border-gray-200 shadow inline-flex items-center gap-1.5">
      <span className="sr-only">Typing</span>
      <Dot />
      <Dot delay="150ms" />
      <Dot delay="300ms" />
    </div>
  );
}

function Dot({ delay = "0ms" }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}

function IconBtn({ children, title, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100"
    >
      {children}
    </button>
  );
}