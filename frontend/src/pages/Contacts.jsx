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

export default function Contacts() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [toast, setToast] = useState(null);

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

  async function lookupUserByEmail(email) {
    const res = await fetch(
      `${API_BASE}/auth/by-email?email=${encodeURIComponent(email)}`
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
      const email = emailInput.trim().toLowerCase();
      if (!email) return;

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("INVALID EMAIL FORMAT", "error");
        return;
      }

      const myEmail = localStorage.getItem("email");
      if (myEmail && myEmail.toLowerCase() === email) {
        showToast("CANNOT ADD SELF", "error");
        return;
      }

      const user = await lookupUserByEmail(email);
      await createOrGetOneToOne(user._id);
      await reloadConversations();
      setShowModal(false);
      setEmailInput("");
      showToast(`CONNECTED: ${user.username || user.email}`, "success");
    } catch (e) {
      showToast(e.message || "OPERATION FAILED", "error");
    }
  }

  function showToast(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

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
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white transition-colors duration-300 relative">
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
                User Email
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="USER@EXAMPLE.COM"
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
                className="bg-neutral-900 border border-neutral-900 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-white hover:text-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white dark:border-white transition-all"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 overflow-hidden border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                <img
                  alt={username || "me"}
                  src={effectivePhotoSrc}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h1 className="font-orbitron text-xl font-bold tracking-tight uppercase text-neutral-900 dark:text-white">
                  Contacts
                </h1>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Directory Listing
                </p>
              </div>
            </div>
          </div>

          {/* Search + Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 group">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SEARCH DATABASE..."
                className="w-full border border-neutral-300 bg-transparent py-2.5 pl-10 pr-3 text-sm font-medium outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:text-white dark:focus:border-white"
              />
            </div>
            
            <button
              className="inline-flex items-center justify-center gap-2 border border-neutral-300 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-900 hover:bg-neutral-50 hover:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-white dark:hover:bg-neutral-800 transition-all"
              onClick={() => setShowModal(true)}
            >
              <UserPlusIcon className="h-4 w-4" />
              <span>Add New</span>
            </button>
          </div>

          {/* Tabs - Industrial Style */}
          <div className="mt-6 flex border-b border-neutral-200 dark:border-neutral-800">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                    active
                      ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                      : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {loading && (
          <div className="py-12 text-center text-xs font-bold uppercase text-neutral-400 animate-pulse">
            Retrieving Data...
          </div>
        )}
        
        {!!err && !loading && (
          <div className="border border-red-200 bg-red-50 p-4 text-center text-xs font-bold uppercase text-red-600 dark:border-red-900 dark:bg-red-900/10 dark:text-red-400">
            System Error: {err}
          </div>
        )}

        {!loading && !err && (
          <div className="space-y-3 pb-24">
            {filtered.map((c) => (
              <ContactRow key={c.id} contact={c} myId={myId} />
            ))}
            {filtered.length === 0 && (
              <EmptyState
                query={query}
                onAddClick={() => setShowModal(true)}
              />
            )}
          </div>
        )}
      </main>
      
      {/* Mobile spacer */}
      <div className="h-16 md:hidden" />
    </div>
  );
}

function ContactRow({ contact, myId }) {
  const otherUser = useMemo(() => {
    if (contact._raw.isGroup) return null;
    return contact._raw.participants.find(
      (p) => p && String(p._id) !== String(myId)
    );
  }, [contact, myId]);

  return (
    <div
      className="group flex cursor-pointer items-center justify-between border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
      onClick={() => {
        localStorage.setItem("activeConversationId", contact.id);
        localStorage.setItem("activeConversationName", contact.name);
        localStorage.setItem("activeConversationAvatar", contact.avatar);
        window.location.href = "/chat";
      }}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          {/* Avatar - Sharp Square */}
          <img
            src={contact.avatar}
            alt={toStr(contact.name)}
            className="h-12 w-12 border border-neutral-200 object-cover dark:border-neutral-700"
          />
          <StatusSquare status={contact.status} />
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
              {toStr(contact.name)}
            </span>
            {contact.favorite && (
              <StarIcon className="h-3 w-3 text-amber-500 fill-amber-500" />
            )}
          </div>
          {otherUser?.email && (
            <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {toStr(otherUser.email)}
            </span>
          )}
        </div>
      </div>

      <button
        title="Open Chat"
        className="flex h-9 w-9 items-center justify-center border border-neutral-200 text-neutral-400 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-neutral-700 dark:hover:border-white dark:hover:bg-white dark:hover:text-neutral-900 transition-all"
      >
        <ChatBubbleOvalLeftIcon className="h-5 w-5" />
      </button>
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
      className={`absolute -bottom-1 -right-1 h-3 w-3 border border-white dark:border-neutral-900 ${map[status] || "bg-neutral-300"}`}
      title={status.toUpperCase()}
    />
  );
}

function EmptyState({ query, onAddClick }) {
  const msg = query
        ? `NO MATCHES FOUND FOR "${query}"`
        : "DATABASE EMPTY. INITIALIZE NEW CONNECTION.";
  
  return (
    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-neutral-300 dark:border-neutral-800">
      <div className="mb-4 flex h-16 w-16 items-center justify-center border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50">
        <UserPlusIcon className="h-8 w-8 text-neutral-400" />
      </div>
      <h3 className="mb-1 text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
        No Contacts
      </h3>
      <p className="mb-6 text-xs font-mono text-neutral-500 dark:text-neutral-400 text-center max-w-xs">
        {msg}
      </p>
      {!query && (
        <button
          onClick={onAddClick}
          className="bg-neutral-900 px-6 py-3 text-xs font-bold uppercase text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Add Contact
        </button>
      )}
    </div>
  );
}