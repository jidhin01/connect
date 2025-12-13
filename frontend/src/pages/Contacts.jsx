import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  ChatBubbleOvalLeftIcon,
  StarIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import ContactProfile from "../components/ContactProfile";

/* ---------- Config ---------- */
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;
const tabs = [{ key: "all", label: "ALL CONTACTS" }];

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
  // Using a square background style for dicebear if possible, or just raw SVG
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(l)}&backgroundColor=171717&textColor=ffffff`;
}

const DELETED_USER_LABEL = "DEACTIVATED USER";

function resolveContactAvatar(conversation, myId) {
  if (conversation?.isGroup) {
    const letter = getInitial(conversation?.groupName || "G");
    return initialAvatarFromLetter(letter);
  }
  const otherUser =
    conversation?.participants?.find(
      (p) =>
        p && typeof p === "object" && p._id && String(p._id) !== String(myId)
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

const inferStatus = (c) => {
  const updated = new Date(c?.updatedAt || c?.createdAt || Date.now());
  const minAgo = (Date.now() - updated.getTime()) / 60000;
  if (minAgo < 5) return "online";
  if (minAgo < 180) return "recent";
  return "offline";
};

/* ---------- Components ---------- */

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const typeStyles =
    toast.type === "success"
      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400"
      : toast.type === "error"
        ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400"
        : "border-neutral-500 bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";

  return (
    <div className={`fixed top-4 right-4 z-50 flex min-w-[300px] items-center gap-3 border-l-4 p-4 shadow-xl dark:border-r dark:border-t dark:border-b dark:border-neutral-800 dark:bg-neutral-900 ${typeStyles}`}>
      {toast.type === "success" && <CheckCircleIcon className="h-5 w-5" />}
      {toast.type === "error" && <ExclamationCircleIcon className="h-5 w-5" />}
      <span className="text-sm font-bold uppercase tracking-wide">{toast.msg}</span>
    </div>
  );
}

export default function Contacts({ isSidebarCollapsed, setSidebarCollapsed }) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [toast, setToast] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  const [username, setUsername] = useState("");
  const [userPhoto, setUserPhoto] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const myId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    setContacts([]);
    setQuery("");
    setErr("");
    setLoading(true);
  }, [token]);

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
      } catch (e) {
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) {
      setErr("Not logged in");
      setLoading(false);
      return;
    }
    reloadConversations();
  }, []);

  async function reloadConversations() {
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
        const isDeletedPeer = title === DELETED_USER_LABEL && !c?.isGroup;
        return {
          id: c._id,
          name: toStr(title),
          avatar: isDeletedPeer ? "/nouser.png" : resolveContactAvatar(c, myId),
          status: inferStatus(c),
          favorite: false,
          _raw: c,
        };
      });
      setContacts(mapped);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function lookupUserByUsername(uName) {
    const res = await fetch(
      `${API_BASE}/auth/by-username?username=${encodeURIComponent(uName)}`
    );
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "User not found");
    }
    const { user } = await res.json();
    if (!user || !user._id) throw new Error("User not found");
    return user;
  }

  async function createOrGetOneToOne(otherUserId) {
    const res = await fetch(`${API_BASE}/conversations/one-to-one`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: otherUserId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Failed to create conversation");
    }
    return await res.json();
  }

  async function handleAddContact() {
    try {
      const uName = usernameInput.trim();
      if (!uName) return;

      // Basic username validation (non-empty)
      if (uName.length < 3) {
        showToast("USERNAME TOO SHORT", "error");
        return;
      }

      const myUsername = localStorage.getItem("username");
      if (myUsername && myUsername.toLowerCase() === uName.toLowerCase()) {
        showToast("CANNOT ADD SELF", "error");
        return;
      }

      const user = await lookupUserByUsername(uName);
      await createOrGetOneToOne(user._id);
      await reloadConversations();
      setShowModal(false);
      setUsernameInput("");
      showToast(`CONNECTED: ${user.username}`, "success");
    } catch (e) {
      showToast(e.message || "OPERATION FAILED", "error");
    }
  }

  function showToast(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleMessage(contact) {
    localStorage.setItem("activeConversationId", contact.id);
    localStorage.setItem("activeConversationName", contact.name);
    localStorage.setItem("activeConversationAvatar", contact.avatar);
    window.location.href = "/logined";
  }

  const handleContactSelect = (contact) => {
    if (selectedContact?.id === contact.id) return;
    setSelectedContact(contact);
    if (setSidebarCollapsed) setSidebarCollapsed(true);
  };

  const handleCloseProfile = () => {
    setSelectedContact(null);
    if (setSidebarCollapsed) setSidebarCollapsed(false);
  };

  const filtered = useMemo(() => {
    const q = lower(query.trim());
    if (!q) return contacts;
    return contacts.filter((c) => lower(c?.name).includes(q));
  }, [query, contacts]);

  const topLetter = getInitial(username);
  const effectivePhotoSrc = userPhoto
    ? `${BACKEND_URL}${userPhoto}`
    : initialAvatarFromLetter(topLetter);

  return (
    <div className="flex h-full overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white transition-colors duration-300 relative">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Add Contact Modal - Sharp Edges */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
              <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
                Initialize Connection
              </h2>
              <button onClick={() => setShowModal(false)} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="ENTER USERNAME"
                className="w-full border border-neutral-300 bg-transparent px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:text-white dark:focus:border-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
              <button
                onClick={() => setShowModal(false)}
                className="border border-neutral-300 px-4 py-2 text-xs font-bold uppercase text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                className="bg-neutral-900 border border-neutral-900 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-white hover:text-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-white dark:border-white transition-all"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar (List) */}
      <div
        className={`flex h-full flex-col border-r border-neutral-200 bg-white transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-950 
        ${selectedContact ? "hidden md:flex w-full md:w-80 lg:w-96" : "w-full max-w-4xl mx-auto md:w-80 md:mx-0 lg:w-96"}`}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 border border-neutral-200 bg-neutral-100 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
              <img
                alt={username || "me"}
                src={effectivePhotoSrc}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-orbitron text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
                CONTACTS
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="flex h-8 w-8 items-center justify-center border border-neutral-200 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              title="Add Contact"
            >
              <UserPlusIcon className="h-4 w-4 text-neutral-500" />
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
              placeholder="SEARCH DATABASE..."
              className="w-full border border-neutral-300 bg-white py-2 pl-9 pr-3 text-xs font-bold uppercase tracking-wide outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-white"
            />
          </div>

          <div className="flex gap-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === t.key
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
              Retrieving Data...
            </div>
          )}
          {!!err && !loading && (
            <div className="p-4 text-center text-xs text-red-600 dark:text-red-400">
              {err}
            </div>
          )}

          {!loading && !err && (
            <div className="space-y-0">
              {filtered.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  myId={myId}
                  onClick={() => handleContactSelect(c)}
                  isActive={selectedContact?.id === c.id}
                />
              ))}
              {filtered.length === 0 && (
                <EmptyState
                  query={query}
                  onAddClick={() => setShowModal(true)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side (Profile or System Idle) */}
      {selectedContact ? (
        <div className="fixed inset-0 z-50 flex h-full w-full flex-col bg-neutral-50 md:relative md:z-0 dark:bg-neutral-950">
          <ContactProfile
            contact={selectedContact}
            onClose={handleCloseProfile}
            onMessage={handleMessage}
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

function ContactRow({ contact, myId, onClick, isActive }) {
  const otherUser = useMemo(() => {
    if (contact._raw.isGroup) return null;
    return contact._raw.participants.find(
      (p) => p && String(p._id) !== String(myId)
    );
  }, [contact, myId]);

  return (
    <div
      className={`group flex cursor-pointer items-center justify-between border-b border-neutral-100 p-4 transition-all hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900
      ${isActive ? "bg-neutral-100 dark:bg-neutral-900" : "bg-white dark:bg-neutral-950"}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          {/* Avatar - Sharp Square */}
          <img
            src={contact.avatar}
            alt={toStr(contact.name)}
            className="h-10 w-10 border border-neutral-200 object-cover dark:border-neutral-700"
          />
          <StatusSquare status={contact.status} />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`font-bold uppercase tracking-tight ${isActive ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"}`}>
              {toStr(contact.name)}
            </span>
            {contact.favorite && (
              <StarIcon className="h-3 w-3 text-amber-500 fill-amber-500" />
            )}
          </div>
          {otherUser?.email && (
            <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
              {toStr(otherUser.email)}
            </span>
          )}
        </div>
      </div>

      {/* 
      <button
        title="Open Chat"
        className="flex h-8 w-8 items-center justify-center border border-neutral-200 text-neutral-400 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-neutral-700 dark:hover:border-white dark:hover:bg-white dark:hover:text-neutral-900 transition-all"
      >
        <ChatBubbleOvalLeftIcon className="h-4 w-4" />
      </button>
      */}
    </div>
  );
}

function StatusSquare({ status }) {
  // Using sharp squares instead of circles
  const map = {
    online: "bg-emerald-500",
    recent: "bg-amber-500",
    offline: "bg-neutral-300 dark:bg-neutral-700",
  };
  return (
    <div
      className={`absolute -bottom-1 -right-1 h-3 w-3 border border-white dark:border-neutral-950 ${map[status] || "bg-neutral-300"}`}
      title={status.toUpperCase()}
    />
  );
}

function EmptyState({ query, onAddClick }) {
  const msg = query
    ? `NO MATCHES FOUND FOR "${query}"`
    : "DATABASE EMPTY. INITIALIZE NEW CONNECTION.";

  return (
    <div className="flex flex-col items-center justify-center py-12 opacity-50">
      <div className="mb-3 flex h-10 w-10 items-center justify-center border border-neutral-300 dark:border-neutral-700">
        <UserPlusIcon className="h-5 w-5 text-neutral-400" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center px-4">
        {msg}
      </span>
      {!query && (
        <button
          onClick={onAddClick}
          className="mt-4 bg-neutral-900 px-4 py-2 text-[10px] font-bold uppercase text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Add Contact
        </button>
      )}
    </div>
  );
}