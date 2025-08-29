import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  FaceSmileIcon,
  PhotoIcon,
  PaperAirplaneIcon,
  CheckIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

// Safety helpers
const toStr = (v) => (v == null ? "" : String(v));

// Utility to extract first letter initial
function getInitial(name) {
  const s = toStr(name).trim();
  return s ? s[0].toUpperCase() : "U";
}

// Deleted/missing label
const DELETED_USER_LABEL = "User account deactivated";

// Decide if a "user-like" value represents a deleted/missing user
function isDeletedOrMissingUser(user) {
  if (!user) return true;
  // Consider deleted/missing if no username/email present
  const hasName = toStr(user.username || user.email).trim().length > 0;
  return !hasName;
}

// Resolve avatar URL for a user object (sender/partner)
// - If deleted/missing -> use /nouser.png
// - Else if photoUrl -> BACKEND_URL + photoUrl
// - Else -> DiceBear Initials with first letter of username/email
function resolveAvatar(user) {
  if (isDeletedOrMissingUser(user)) return "/nouser.png";
  if (user.photoUrl) return `${BACKEND_URL}${user.photoUrl}`;
  const name = user.username || user.email || "U";
  const letter = getInitial(name);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(letter)}`;
}

// Safe display name for users
function resolveDisplayName(user, fallback = "User") {
  if (isDeletedOrMissingUser(user)) return DELETED_USER_LABEL;
  return user.username || user.email || fallback;
}

// Format server message
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

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
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

  // Partner header: derive avatar using the conversationName as a stand-in identity.
  // If the name equals the deleted label, show /nouser.png; else initials from the name.
  const partner = useMemo(() => {
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
  }, [conversationName]);

  useEffect(() => {
    const listElement = listRef.current;
    if (listElement) {
      listElement.scrollTop = listElement.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line
  }, [conversationId]);

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
    if (!input.trim()) return;
    const text = input.trim();

    try {
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        author: {
          id: myId,
          name: "Me",
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            getInitial("Me")
          )}`,
        },
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        outgoing: true,
        status: "sent",
        reactions: [],
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput("");
      setShowEmojiPicker(false);

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

      setMessages((prev) => prev.map((m) => (m.id === tempId ? mapped : m)));
    } catch (e) {
      setErr(e.message);
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
                  {partner.status === "online" ? "Online" : "Last seen recently"}
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
        <DayDivider label="Today" />

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
                {/* <IconBtn title="Photo">
                  <PhotoIcon className="h-6 w-6 text-gray-700" />
                </IconBtn> */}
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
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") sendMessage();
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
        {msg.reactions?.length > 0 && (
          <div className={`mt-1 flex gap-1 ${msg.outgoing ? "justify-end" : "justify-start"}`}>
            {msg.reactions.map((r, i) => (
              <button
                key={i}
                className="px-2 py-0.5 text-xs rounded-full bg-white border border-gray-200 hover:bg-gray-50"
                title={`${r.emoji} ${r.count}`}
              >
                <span className="mr-1">{r.emoji}</span>
                <span className="text-gray-700">{r.count}</span>
              </button>
            ))}
          </div>
        )}
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
