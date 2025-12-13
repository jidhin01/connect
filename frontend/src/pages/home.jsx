import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  BellSlashIcon,
  UserGroupIcon,
  ChatBubbleOvalLeftIcon,
  CpuChipIcon, // Icon for AI
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { io } from "socket.io-client";
import ChatWindow from "../components/ChatWindow";

/* ---------- Config ---------- */
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

/* ---------- Helpers ---------- */
const toStr = (v) => (v == null ? "" : String(v));
const lower = (v) =>
  typeof v === "string" ? v.toLowerCase() : toStr(v).toLowerCase();

function getInitial(name) {
  if (!name) return "U";
  const s = toStr(name).trim();
  return s ? s[0].toUpperCase() : "U";
}

function initialAvatarFromLetter(letter) {
  const l = getInitial(letter);
  // Using dark background for initials to match theme
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(l)}&backgroundColor=171717&textColor=ffffff`;
}

const DELETED_USER_LABEL = "DEACTIVATED USER";

function resolveAvatar(conversation, myId) {
  if (conversation?.isGroup) {
    const letter = getInitial(conversation?.groupName || "G");
    return initialAvatarFromLetter(letter);
  }
  const otherUser =
    conversation?.participants?.find(
      (p) => p && typeof p === "object" && p._id && String(p._id) !== String(myId)
    ) || null;

  if (!otherUser || (!otherUser.username && !otherUser.email)) {
    return "/nouser.png";
  }
  if (otherUser.photoUrl) return `${BACKEND_URL}${otherUser.photoUrl}`;

  const letter = getInitial(otherUser?.username || otherUser?.email || "U");
  return initialAvatarFromLetter(letter);
}

const formatTitle = (c, myId) => {
  if (c?.isGroup && c?.groupName) return toStr(c.groupName);
  const parts = Array.isArray(c?.participants) ? c.participants : [];
  const otherPopulated = parts.find(
    (p) => p && typeof p === "object" && p._id && String(p._id) !== String(myId)
  );
  if (!otherPopulated || (!otherPopulated.username && !otherPopulated.email)) {
    return DELETED_USER_LABEL;
  }
  return toStr(
    otherPopulated.username || otherPopulated.email || otherPopulated._id
  );
};

const formatPreview = (c) => {
  const lm = c?.lastMessage;
  if (!lm) return "No messages yet";
  const rawSender =
    lm?.sender?.username ||
    lm?.sender?.email ||
    (typeof lm?.sender === "string" ? lm.sender : null);
  const sender = rawSender ? toStr(rawSender) : "SYSTEM";
  const text = lm?.text || "";
  return toStr(`${sender}: ${text}`);
};

const inferStatus = (c) => {
  const updated = new Date(c?.updatedAt || c?.createdAt || Date.now());
  const minAgo = (Date.now() - updated.getTime()) / 60000;
  if (minAgo < 5) return "online";
  if (minAgo < 180) return "recent";
  return "offline";
};

/* ---------- AI Configuration ---------- */
const AI_CHAT_ID = "ai-chatbot-genius-gemini";
const AI_CHAT_NAME = "SYSTEM AI"; // Industrial naming
const AI_LAST_MESSAGE_DEFAULT = "System ready. Awaiting query.";
const AI_AVATAR = "/chatbot.png"; // Ensure this exists or use a fallback

const AI_CHATBOT_PROFILE = {
  id: AI_CHAT_ID,
  name: AI_CHAT_NAME,
  avatar: AI_AVATAR,
  status: "online",
  lastMessage: AI_LAST_MESSAGE_DEFAULT,
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  unread: 0,
  pinned: true,
  muted: false,
  type: "ai",
  _raw: { isAI: true, aiChatId: AI_CHAT_ID },
};

const tabs = [
  { key: "all", label: "ALL" },
  { key: "unread", label: "UNREAD" },
  { key: "pinned", label: "PINNED" },
];

/* ---------- Main Component ---------- */
export default function Home({ isSidebarCollapsed, setSidebarCollapsed }) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [chats, setChats] = useState([]);
  const [username, setUsername] = useState("");
  const [userPhoto, setUserPhoto] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const myId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // Hydrate username
  useEffect(() => {
    const storedName = typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (storedName) setUsername(toStr(storedName));
  }, []);

  // Fetch User
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Could not fetch user");
        const data = await res.json();
        const user = data.user || {};
        setUsername(toStr(user.username || "U"));
        setUserPhoto(user.photoUrl || null);
        if (typeof window !== "undefined" && user.username) {
          localStorage.setItem("username", user.username);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Fetch Chats
  useEffect(() => {
    async function load() {
      if (!token) {
        setErr("Not logged in");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Failed to fetch conversations");
        }
        const data = await res.json();
        const mapped = (data.conversations || []).map((c) => {
          const title = formatTitle(c, myId);
          const preview = formatPreview(c);
          const isDeletedPeer = title === DELETED_USER_LABEL && !c?.isGroup;
          return {
            id: c._id,
            name: toStr(title),
            avatar: isDeletedPeer ? "/nouser.png" : resolveAvatar(c, myId),
            status: inferStatus(c),
            lastMessage: toStr(preview),
            time: new Date(c?.updatedAt || c?.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            unread: Number(c?.unread || 0),
            pinned: Boolean(c?.pinned),
            muted: Boolean(c?.muted),
            type: c?.isGroup ? "group" : "direct",
            _raw: c,
          };
        });

        const nonAiChats = mapped.filter((c) => c.id !== AI_CHAT_ID);
        const chatsWithAI = [AI_CHATBOT_PROFILE, ...nonAiChats];
        setChats(chatsWithAI);

        nonAiChats.forEach((c) => {
          socket.emit("joinConversation", c.id);
        });
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, myId]);

  // Socket Listener
  useEffect(() => {
    if (!socket) return;
    socket.on("Connect", () => {
      chats.filter((c) => c.id !== AI_CHAT_ID).forEach((c) => socket.emit("joinConversation", c.id));
    });
    socket.on("newMessage", (m) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === m.conversation._id);
        if (idx === -1) return prev;
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = `${m.sender?.username || m.sender?.email || "User"}: ${m.text}`;
        conv.time = new Date(m.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });
    });
    return () => {
      socket.off("newMessage");
      socket.off("Connect");
    };
  }, [chats]);

  const filtered = useMemo(() => {
    const q = lower(query.trim());
    return chats.filter((c) => {
      const name = lower(c?.name);
      const lastMsg = lower(c?.lastMessage);
      const matchesQuery = name.includes(q) || lastMsg.includes(q);
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "unread" && Number(c?.unread) > 0) ||
        (activeTab === "pinned" && !!c?.pinned);
      const isAIChat = c.id === AI_CHAT_ID;
      return (matchesQuery && matchesTab) || (isAIChat && activeTab === 'all');
    });
  }, [query, activeTab, chats]);

  const topLetter = getInitial(username);
  const effectivePhotoSrc = userPhoto
    ? `${BACKEND_URL}${userPhoto}`
    : initialAvatarFromLetter(topLetter);

  const handleChatSelect = (chat) => {
    if (selectedChat?.id === chat.id) return;
    setSelectedChat(chat);
    if (setSidebarCollapsed) setSidebarCollapsed(true);
    localStorage.setItem("activeConversationId", chat.id);
    localStorage.setItem("activeConversationName", chat.name);
    localStorage.setItem("activeConversationAvatar", chat.avatar);
    localStorage.setItem("isAIChat", chat.id === AI_CHAT_ID ? "true" : "false");
  };

  const handleCloseChat = () => {
    setSelectedChat(null);
    if (setSidebarCollapsed) setSidebarCollapsed(false);
  };

  return (
    <div className="flex h-full overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white transition-colors duration-300">
      
      {/* Left Sidebar (List) */}
      <div
        className={`flex h-full flex-col border-r border-neutral-200 bg-white transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-950 
        ${selectedChat ? "hidden md:flex w-full md:w-80 lg:w-96" : "w-full max-w-4xl mx-auto md:w-80 md:mx-0 lg:w-96"}`}
      >
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            {!selectedChat && (
              <div className="h-8 w-8 border border-neutral-200 bg-neutral-100 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
                <img
                  alt={username || "me"}
                  src={effectivePhotoSrc}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="font-orbitron text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
                MESSAGES
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex h-8 w-8 items-center justify-center border border-neutral-200 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
              <FunnelIcon className="h-4 w-4 text-neutral-500" />
            </button>
          </div>
        </header>

        {/* Search & Tabs */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH LOGS..."
              className="w-full border border-neutral-300 bg-white py-2 pl-9 pr-3 text-xs font-bold uppercase tracking-wide outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-white"
            />
          </div>

          <div className="flex gap-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  activeTab === t.key
                    ? "text-neutral-900 underline underline-offset-4 dark:text-white"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-xs font-bold uppercase text-neutral-400 animate-pulse">
              Syncing Data...
            </div>
          )}
          {!!err && !loading && (
            <div className="p-4 text-center text-xs text-red-600 dark:text-red-400">
              {err}
            </div>
          )}

          {!loading && !err && (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  onClick={() => handleChatSelect(chat)}
                  isActive={selectedChat?.id === chat.id}
                />
              ))}
              {filtered.length === 0 && (
                <EmptyState query={query} activeTab={activeTab} />
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Right Side (Chat Window) */}
      {selectedChat ? (
        <div className="fixed inset-0 z-50 flex h-full w-full flex-col bg-neutral-50 md:relative md:z-0 dark:bg-neutral-950">
          <ChatWindow
            conversationId={selectedChat.id}
            conversationName={selectedChat.name}
            conversationAvatar={selectedChat.avatar}
            isAIChat={selectedChat.id === AI_CHAT_ID}
            myId={myId}
            myName={username}
            onClose={handleCloseChat}
          />
        </div>
      ) : (
        /* Empty State for Split View */
        <div className="hidden flex-1 items-center justify-center bg-neutral-100 md:flex dark:bg-neutral-900">
          <div className="flex flex-col items-center border border-dashed border-neutral-300 p-12 dark:border-neutral-700">
            <div className="mb-6 flex h-16 w-16 items-center justify-center border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800">
              <ChatBubbleOvalLeftIcon className="h-8 w-8 text-neutral-400" />
            </div>
            <h2 className="mb-2 font-orbitron text-lg font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
              System Idle
            </h2>
            <p className="max-w-xs text-center text-xs font-mono text-neutral-500 dark:text-neutral-400">
              Select a secure channel from the left directory to initiate communication.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Chat List Item
function ChatListItem({ chat, onClick, isActive }) {
  const isAI = chat.type === "ai";

  return (
    <li
      onClick={onClick}
      className={`group relative flex cursor-pointer items-start gap-4 p-4 transition-all hover:bg-neutral-50 dark:hover:bg-neutral-900 
      ${isActive ? "bg-neutral-100 dark:bg-neutral-900" : "bg-white dark:bg-neutral-950"}`}
    >
      {/* Active Indicator Strip */}
      {isActive && (
        <div className="absolute left-0 top-0 h-full w-1 bg-neutral-900 dark:bg-white" />
      )}

      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={`h-12 w-12 border ${isAI ? 'border-indigo-500/50' : 'border-neutral-200 dark:border-neutral-700'}`}>
           <img
            src={chat.avatar}
            alt={toStr(chat.name)}
            className="h-full w-full object-cover"
          />
        </div>
        {!isAI && <StatusSquare status={chat.status} />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold uppercase tracking-tight ${isActive ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"}`}>
              {toStr(chat.name)}
            </span>
            {isAI && <CpuChipIcon className="h-4 w-4 text-indigo-500" />}
            {chat.type === "group" && <UserGroupIcon className="h-3 w-3 text-neutral-400" />}
            {chat.muted && <BellSlashIcon className="h-3 w-3 text-neutral-400" />}
          </div>
          <span className="text-[10px] font-mono text-neutral-400">{chat.time}</span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-mono text-neutral-500 dark:text-neutral-400">
            {toStr(chat.lastMessage)}
          </p>
          {chat.unread > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center bg-neutral-900 px-1 text-[10px] font-bold text-white dark:bg-white dark:text-neutral-900">
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function StatusSquare({ status }) {
  const map = {
    online: "bg-emerald-500",
    recent: "bg-amber-500",
    offline: "bg-neutral-300 dark:bg-neutral-700",
  };
  return (
    <div
      className={`absolute -bottom-1 -right-1 h-3 w-3 border border-white dark:border-neutral-950 ${map[status] || "bg-neutral-300"}`}
    />
  );
}

function EmptyState({ query, activeTab }) {
  const msg = query
    ? `NO DATA FOUND FOR "${query}"`
    : activeTab === "unread"
    ? "NO PENDING MESSAGES"
    : "COMMUNICATION LOGS EMPTY";

  return (
    <div className="flex flex-col items-center py-12 opacity-50">
      <div className="mb-3 flex h-10 w-10 items-center justify-center border border-neutral-300 dark:border-neutral-700">
        <ChatBubbleOvalLeftIcon className="h-5 w-5 text-neutral-400" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
        {msg}
      </span>
    </div>
  );
}