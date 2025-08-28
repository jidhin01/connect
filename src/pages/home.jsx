import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  BellSlashIcon,
  UserGroupIcon,
  ChatBubbleOvalLeftIcon,
} from "@heroicons/react/24/outline";

const BACKEND_URL = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

// Just first letter extraction utility
function getInitial(name) {
  if (!name) return "U";
  return name.trim()[0].toUpperCase();
}

// Avatar URL resolver: always one letter!
function resolveAvatar(conversation, myId) {
  if (conversation.isGroup) {
    // Use first letter of group name, or "G"
    const letter = getInitial(conversation.groupName || "G");
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(letter)}`;
  }
  // For 1-to-1 chats, find the "other" participant
  const otherUser = conversation.participants?.find(
    (p) => p && typeof p === "object" && String(p._id) !== String(myId)
  ) || {};
  if (otherUser.photoUrl) {
    return `${BACKEND_URL}${otherUser.photoUrl}`;
  }
  // Fallback → first letter of username or email
  const letter = getInitial(otherUser.username || otherUser.email || "U");
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(letter)}`;
}

const formatTitle = (c, myId) => {
  if (c.isGroup && c.groupName) return c.groupName;
  const parts = c.participants || [];
  const otherPopulated = parts.find(
    (p) => p && typeof p === "object" && p._id && String(p._id) !== String(myId)
  );
  if (otherPopulated) {
    return otherPopulated.username || otherPopulated.email || otherPopulated._id;
  }
  const otherId = parts.find((p) => String(p) !== String(myId)) || parts[0];
  return otherId || "Conversation";
};

const formatPreview = (c) => {
  const lm = c.lastMessage;
  if (!lm) return "No messages yet";
  const sender =
    lm?.sender?.username ||
    lm?.sender?.email ||
    (typeof lm?.sender === "string" ? lm.sender : "Someone");
  const text = lm?.text || "";
  return `${sender}: ${text}`;
};

const inferStatus = (c) => {
  const updated = new Date(c.updatedAt || c.createdAt || Date.now());
  const minAgo = (Date.now() - updated.getTime()) / 60000;
  if (minAgo < 5) return "online";
  if (minAgo < 180) return "recent";
  return "offline";
};

const tabs = [{ key: "all", label: "All" }];

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [chats, setChats] = useState([]);
  const [profilePic, setProfilePic] = useState("");
  const [username, setUsername] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const myId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // Fetch current user's profile for top bar avatar
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
        setProfilePic(user.photoUrl || "");
        setUsername(user.username || "A");
      } catch (e) {}
    })();
  }, [token]);

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
        const mapped = (data.conversations || []).map((c) => ({
          id: c._id,
          name: formatTitle(c, myId),
          avatar: resolveAvatar(c, myId), // <-- avatar logic
          status: inferStatus(c),
          lastMessage: formatPreview(c),
          time: new Date(c.updatedAt || c.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          unread: c.unread || 0,
          pinned: c.pinned || false,
          muted: c.muted || false,
          type: c.isGroup ? "group" : "direct",
          _raw: c,
        }));

        setChats(mapped);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, myId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const lastMsg = (c.lastMessage || "").toLowerCase();
      const matchesQuery = name.includes(q) || lastMsg.includes(q);
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "unread" && c.unread > 0) ||
        (activeTab === "pinned" && c.pinned) ||
        (activeTab === "mentions" && (c.lastMessage || "").includes("@"));
      return matchesQuery && matchesTab;
    });
  }, [query, activeTab, chats]);

  // Top bar: show user avatar, fallback to first letter
  const topLetter = getInitial(username);
  const effectivePhotoSrc = profilePic
    ? `${BACKEND_URL}${profilePic}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(topLetter)}`;

  return (
    <div className="h-screen bg-seco text-gray-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 rounded-3xl bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                alt="me"
                src={effectivePhotoSrc}
                className="h-10 w-10 rounded-full ring-2 ring-indigo-100 object-cover"
              />
              <div>
                <h1 className="text-lg font-semibold">Chats</h1>
                <p className="text-xs text-gray-500">All conversations</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none transition"
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
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                      active
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

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between pt-4 pb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Conversations
          </span>
        </div>

        {loading && <div className="py-8 text-sm text-gray-600">Loading chats...</div>}
        {!!err && !loading && <div className="py-8 text-sm text-red-600">Error: {err}</div>}

        {!loading && !err && (
          <ul className="space-y-2 pb-28">
            {filtered.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} />
            ))}
            {filtered.length === 0 && (
              <EmptyState query={query} activeTab={activeTab} />
            )}
          </ul>
        )}
      </main>
    </div>
  );
}

// Individual chat item with avatar
function ChatListItem({ chat }) {
  return (
    <li
      className="group bg-white border border-gray-200 rounded-2xl p-3 hover:border-indigo-200 transition cursor-pointer"
      onClick={() => {
        localStorage.setItem("activeConversationId", chat.id);
        localStorage.setItem("activeConversationName", chat.name);
        window.location.href = "/chat";
      }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={chat.avatar}
            alt={chat.name}
            className="h-12 w-12 rounded-full object-cover"
          />
          <StatusDot status={chat.status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{chat.name}</p>
            {chat.type === "group" && (
              <UserGroupIcon className="h-4 w-4 text-gray-400" />
            )}
            {chat.pinned && <PinIcon className="h-4 w-4 text-indigo-500" />}
            {chat.muted && <BellSlashIcon className="h-4 w-4 text-gray-400" />}
          </div>
          <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-gray-500">{chat.time}</span>
          {chat.unread > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-btn text-white text-xs">
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
      className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
        map[status] || "bg-gray-300"
      }`}
      title={status}
    />
  );
}

// Pin icon
function PinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <path d="M12 3l2 4 4 2-6 6-2-4-4-2 6-6z" stroke="currentColor" strokeWidth="1.5" />
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
      <h3 className="text-lg text-gray-700 font-semibold mb-1">Nothing here</h3>
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  );
}
