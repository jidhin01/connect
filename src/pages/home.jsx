import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  BellSlashIcon,
  UserGroupIcon,
  ChatBubbleOvalLeftIcon,
} from "@heroicons/react/24/outline";
import { io } from "socket.io-client"; // 👈 added

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

const tabs = [{ key: "all", label: "All" }];

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [chats, setChats] = useState([]);
  const [username, setUsername] = useState("");

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

        setChats(mapped);

        // 👇 Join socket rooms
        mapped.forEach((c) => {
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

    // rejoin on reconnect
    socket.on("connect", () => {
      console.log("✅ Socket connected, rejoining rooms...");
      chats.forEach((c) => socket.emit("joinConversation", c.id));
    });

    socket.on("newMessage", (m) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === m.conversation._id);
        if (idx === -1) return prev;

        const updated = [...prev];
        const conv = { ...updated[idx] };

        conv.lastMessage = `${m.sender?.username || m.sender?.email || "User"}: ${
          m.text
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
      socket.off("connect");
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
      return matchesQuery && matchesTab;
    });
  }, [query, activeTab, chats]);

  const topLetter = getInitial(username);
  const effectivePhotoSrc = initialAvatarFromLetter(topLetter);

  return (
    <div className="h-screen bg-seco text-gray-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 rounded-3xl bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                alt={username || "me"}
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

        {loading && (
          <div className="py-8 text-sm text-gray-600">Loading chats...</div>
        )}
        {!!err && !loading && (
          <div className="py-8 text-sm text-red-600">Error: {err}</div>
        )}

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

// Chat list item
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
            alt={toStr(chat.name)}
            className="h-12 w-12 rounded-full object-cover"
          />
          <StatusDot status={chat.status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{toStr(chat.name)}</p>
            {chat.type === "group" && (
              <UserGroupIcon className="h-4 w-4 text-gray-400" />
            )}
            {chat.pinned && <PinIcon className="h-4 w-4 text-indigo-500" />}
            {chat.muted && <BellSlashIcon className="h-4 w-4 text-gray-400" />}
          </div>
          <p className="text-sm text-gray-600 truncate">
            {toStr(chat.lastMessage)}
          </p>
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
      <h3 className="text-lg text-gray-700 font-semibold mb-1">Nothing here</h3>
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  );
}