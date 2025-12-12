import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  BellSlashIcon,
  UserGroupIcon,
  ChatBubbleOvalLeftIcon,
} from "@heroicons/react/24/outline";
import { io } from "socket.io-client";
import ChatWindow from "../components/ChatWindow";

// ✅ Correct env var
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

// 👇 socket singleton
const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

// Helpers
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
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    l
  )}`;
}

const DELETED_USER_LABEL = "User account deactivated";

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

  const sender = rawSender ? toStr(rawSender) : DELETED_USER_LABEL;
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

// ====================================================================
// 💡 NEW: AI CHATBOT PROFILE DEFINITION
// ====================================================================

// Unique, client-side ID for the AI chat. Doesn't conflict with MongoDB IDs.
const AI_CHAT_ID = "ai-chatbot-genius-gemini";
const AI_CHAT_NAME = "Genius AI";
const AI_LAST_MESSAGE_DEFAULT = "Hello! Ask me anything casual.";
// Using a distinct bot avatar for better UX
const AI_AVATAR = "/chatbot.png";

const AI_CHATBOT_PROFILE = {
  id: AI_CHAT_ID,
  name: AI_CHAT_NAME,
  avatar: AI_AVATAR,
  status: "online",
  lastMessage: AI_LAST_MESSAGE_DEFAULT,
  time: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
  unread: 0,
  pinned: true, // Optional: Pin the bot to the top
  muted: false,
  type: "ai",
  _raw: { isAI: true, aiChatId: AI_CHAT_ID },
};


const tabs = [{ key: "all", label: "All" }];

export default function Home({ isSidebarCollapsed, setSidebarCollapsed }) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [chats, setChats] = useState([]);
  const [username, setUsername] = useState("");
  const [userPhoto, setUserPhoto] = useState(null);

  // 💡 NEW: Selected Chat State
  const [selectedChat, setSelectedChat] = useState(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const myId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // ✅ Hydrate username fast from localStorage
  useEffect(() => {
    const storedName =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (storedName) setUsername(toStr(storedName));
  }, []);

  // Fetch current user
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
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Fetch conversations
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

        // ====================================================================
        // 💡 NEW: CHATBOT INJECTION AND SORTING LOGIC
        // ====================================================================

        // 1. Separate AI and non-AI chats
        const nonAiChats = mapped.filter(c => c.id !== AI_CHAT_ID);

        // 2. Add the AI profile to the start of the list
        // This ensures the AI chat is always visible near the top
        const chatsWithAI = [AI_CHATBOT_PROFILE, ...nonAiChats];

        setChats(chatsWithAI);

        // 👇 Join socket rooms (The AI chat doesn't need a socket room)
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

  // ✅ Listen for new messages via socket.io
  useEffect(() => {
    if (!socket) return;

    // rejoin on reConnect
    socket.on("Connect", () => {
      console.log("✅ Socket Connected, rejoining rooms...");
      // Filter out the AI chat ID before trying to join a socket room
      chats.filter(c => c.id !== AI_CHAT_ID).forEach((c) => socket.emit("joinConversation", c.id));
    });

    socket.on("newMessage", (m) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === m.conversation._id);
        if (idx === -1) return prev;

        // ... (Rest of your socket message update logic remains the same)
        const updated = [...prev];
        const conv = { ...updated[idx] };

        conv.lastMessage = `${m.sender?.username || m.sender?.email || "User"}: ${m.text
          }`;
        conv.time = new Date(m.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        // move to top
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
        (activeTab === "pinned" && !!c?.pinned) ||
        (activeTab === "mentions" && toStr(c?.lastMessage).includes("@"));

      // Also ensure the AI chat is included if the tab is 'all' or it matches the query
      const isAIChat = c.id === AI_CHAT_ID;
      return (matchesQuery && matchesTab) || isAIChat;
    });
  }, [query, activeTab, chats]);

  const topLetter = getInitial(username);
  const effectivePhotoSrc = userPhoto
    ? `${BACKEND_URL}${userPhoto}`
    : initialAvatarFromLetter(topLetter);

  // Toggle Chat
  const handleChatSelect = (chat) => {
    if (selectedChat?.id === chat.id) return; // Already open
    setSelectedChat(chat);
    if (setSidebarCollapsed) setSidebarCollapsed(true);

    // Also save to localStorage for persistence if page refresh
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
    <div className="h-full bg-seco text-gray-900 flex overflow-hidden">

      {/* Left Side: List */}
      <div className={`flex flex-col h-full bg-seco transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-gray-200
        ${selectedChat ? 'w-full md:w-72 lg:w-80 hidden md:flex' : 'w-full max-w-2xl mx-auto'}`}>

        {/* Top Bar for List */}
        <header className={`sticky top-0 z-10 bg-seco ${!selectedChat ? 'rounded-3xl border-b border-gray-200 mt-4 mx-4 bg-white' : 'px-4 pt-4'}`}>
          <div className={`${!selectedChat ? 'px-4' : ''}`}>
            <div className={`flex items-center justify-between ${!selectedChat ? 'h-16' : 'h-12 mb-2'}`}>
              <div className="flex items-center gap-3">
                {!selectedChat && (
                  <img
                    alt={username || "me"}
                    src={effectivePhotoSrc}
                    className="h-10 w-10 rounded-full ring-2 ring-indigo-100 object-cover"
                  />
                )}
                <div>
                  <h1 className="text-lg font-semibold">{!selectedChat ? 'Chats' : 'Messages'}</h1>
                  {!selectedChat && <p className="text-xs text-gray-500">All conversations</p>}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className={`pb-3 ${!selectedChat ? '' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none transition shadow-sm"
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                {tabs.map((t) => {
                  const active = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${active
                        ? "bg-btn text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* List Content */}
        <div className={`flex-1 overflow-y-auto px-4 ${!selectedChat ? 'max-w-4xl mx-auto w-full' : ''}`}>
          <div className="flex items-center justify-between pt-4 pb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {selectedChat ? 'Recent' : 'Conversations'}
            </span>
          </div>

          {loading && (
            <div className="py-8 text-sm text-gray-600">Loading chats...</div>
          )}
          {!!err && !loading && (
            <div className="py-8 text-sm text-red-600">Error: {err}</div>
          )}

          {!loading && !err && (
            <ul className="space-y-2 pb-24">
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

      {/* Right Side: Chat Window */}
      {selectedChat ? (
        <div className="w-full flex-1 flex flex-col h-[100dvh] md:h-full bg-gray-50 z-50 md:z-0 md:relative fixed inset-0 md:inset-auto">
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
        /* Placeholder for split view (optional, could be "Select a chat") */
        <div className="hidden md:flex flex-1 items-center justify-center text-center p-8 bg-gray-800/50">
          <div className="max-w-md">
            <div className="mx-auto h-24 w-24 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
              <ChatBubbleOvalLeftIcon className="h-12 w-12 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Conversation</h2>
            <p className="text-gray-500">Choose a person from the list to start chatting or ask Genius AI for help.</p>
          </div>
        </div>
      )}

    </div>
  );
}

// Chat list item
function ChatListItem({ chat, onClick, isActive }) {
  const isAI = chat.id === AI_CHAT_ID;

  return (
    <li
      className={`group border rounded-2xl px-3 py-2 hover:border-indigo-200 transition cursor-pointer
        ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-200'}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={chat.avatar}
            alt={toStr(chat.name)}
            className="h-10 w-10 rounded-full object-cover"
          />
          <StatusDot status={chat.status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate text-sm font-medium ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{toStr(chat.name)}</p>
            {chat.type === "group" && (
              <UserGroupIcon className="h-3 w-3 text-gray-400" />
            )}
            {/* Show a distinct icon for the AI chat */}
            {chat.type === "ai" && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-indigo-500">
                <path d="M11.75 3a.75.75 0 0 0-.75.75v3.5h-3.5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 .75.75h3.5v3.5a.75.75 0 0 0 .75.75h3.5a.75.75 0 0 0 .75-.75v-3.5h3.5a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 0 0-.75-.75h-3.5v-3.5a.75.75 0 0 0-.75-.75h-3.5Z" />
              </svg>
            )}
            {chat.pinned && <PinIcon className="h-3 w-3 text-indigo-500" />}
            {chat.muted && <BellSlashIcon className="h-3 w-3 text-gray-400" />}
          </div>
          <p className={`text-xs truncate ${isActive ? 'text-indigo-600/70' : 'text-gray-500'}`}>
            {toStr(chat.lastMessage)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-gray-400">{chat.time}</span>
          {chat.unread > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-btn text-white text-[10px]">
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function StatusDot({ status }) {
  const map = {
    online: "bg-emerald-500",
    recent: "bg-amber-500",
    offline: "bg-gray-300",
  };
  return (
    <span
      className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ring-white ${map[status] || "bg-gray-300"
        }`}
      title={status}
    />
  );
}

function PinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <path
        d="M12 3l2 4 4 2-6 6-2-4-4-2 6-6z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M11 21l1-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EmptyState({ query, activeTab }) {
  const msg = query
    ? `No chats match "${query}".`
    : activeTab === "unread"
      ? "No unread chats"
      : activeTab === "pinned"
        ? "No pinned chats"
        : "No conversations yet. Start a chat from Contacts!";
  return (
    <div className="text-center py-16">
      <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
        <ChatBubbleOvalLeftIcon className="h-6 w-6 text-btn" />
      </div>
      <h3 className="text-lg text-gray-900 font-semibold mb-1">Nothing here</h3>
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  );
}