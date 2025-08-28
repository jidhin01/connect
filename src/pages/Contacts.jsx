import { useEffect, useMemo, useState } from "react";
import {
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  ChatBubbleOvalLeftIcon,
  StarIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

const BACKEND_URL = "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;
const tabs = [{ key: "all", label: "All" }];

// Utility to extract first letter initial
function getInitial(name) {
  if (!name) return "U";
  return name.trim()[0].toUpperCase();
}

// Avatar resolver for contacts (same as in chats)
function resolveContactAvatar(conversation, myId) {
  if (conversation.isGroup) {
    const letter = getInitial(conversation.groupName || "G");
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(letter)}`;
  }

  const otherUser =
    conversation.participants?.find(
      (p) => p && typeof p === "object" && String(p._id) !== String(myId)
    ) || {};

  if (otherUser.photoUrl) {
    return `${BACKEND_URL}${otherUser.photoUrl}`;
  }

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

const inferStatus = (c) => {
  const updated = new Date(c.updatedAt || c.createdAt || Date.now());
  const minAgo = (Date.now() - updated.getTime()) / 60000;
  if (minAgo < 5) return "online";
  if (minAgo < 180) return "recent";
  return "offline";
};

export default function Contacts() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [toast, setToast] = useState(null);

  const [profilePic, setProfilePic] = useState("");
  const [username, setUsername] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const myId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // Fetch current user's profile for header avatar with fallback to initials
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
      } catch (e) {
        // silent fail
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const mapped = (data.conversations || []).map((c) => ({
        id: c._id,
        name: formatTitle(c, myId),
        avatar: resolveContactAvatar(c, myId),
        status: inferStatus(c),
        lastSeen:
          inferStatus(c) === "online"
            ? "Online"
            : `Last active ${new Date(c.updatedAt || c.createdAt).toLocaleString()}`,
        favorite: false,
        _raw: c,
      }));

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
        showToast("Please enter a valid email.", "error");
        return;
      }

      const myEmail = localStorage.getItem("email");
      if (myEmail && myEmail.toLowerCase() === email) {
        showToast("Cannot add yourself.", "error");
        return;
      }

      const user = await lookupUserByEmail(email);
      await createOrGetOneToOne(user._id);
      await reloadConversations();
      setShowModal(false);
      setEmailInput("");
      showToast(`Added or found chat with ${user.username || user.email}.`, "success");
    } catch (e) {
      showToast(e.message || "Failed to add contact", "error");
    }
  }

  function showToast(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.lastSeen && c.lastSeen.toLowerCase().includes(q))
    );
  }, [query, contacts]);

  // Header top letter initial for fallback avatar
  const topLetter = getInitial(username);
  const effectivePhotoSrc = profilePic
    ? `${BACKEND_URL}${profilePic}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(topLetter)}`;

  return (
    <div className="h-screen bg-seco text-gray-900 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm ${
            toast.type === "success"
              ? "bg-green-100 text-green-800"
              : toast.type === "error"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {toast.type === "success" && <CheckCircleIcon className="h-5 w-5" />}
          {toast.type === "error" && <ExclamationCircleIcon className="h-5 w-5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Add Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center  bg-white/10 backdrop-blur-lg bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Contact</h2>
              <button onClick={() => setShowModal(false)}>
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter user email"
              className="w-full mb-4 px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                className="px-4 py-2 rounded-xl bg-btn text-white hover:opacity-90"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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
                <h1 className="text-lg font-semibold">Contacts</h1>
                <p className="text-xs text-gray-500">Find people and start chats</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <EllipsisVerticalIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Search + Actions */}
          <div className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search contacts"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50"
                onClick={() => setShowModal(true)}
                title="Add by email"
              >
                <UserPlusIcon className="h-5 w-5 text-gray-700" />
                <span className="hidden sm:inline text-sm">Add</span>
              </button>
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
            My Contacts
          </span>
          <button className="text-xs text-btn hover:underline">Sort A–Z</button>
        </div>

        {loading && (
          <div className="py-8 text-sm text-gray-600">Loading conversations...</div>
        )}
        {!!err && !loading && (
          <div className="py-8 text-sm text-red-600">Error: {err}</div>
        )}

        {!loading && !err && (
          <ul className="space-y-2 pb-24">
            {filtered.map((c) => (
              <ContactRow key={c.id} contact={c} />
            ))}
            {filtered.length === 0 && <EmptyState tab={activeTab} query={query} />}
          </ul>
        )}
      </main>
      <div className="h-14 md:hidden" />
    </div>
  );
}

function ContactRow({ contact }) {
  return (
    <li
      className="group bg-white border border-gray-200 rounded-2xl p-3 hover:border-indigo-200 transition cursor-pointer"
      onClick={() => {
        localStorage.setItem("activeConversationId", contact.id);
        localStorage.setItem("activeConversationName", contact.name);
        window.location.href = "/chat";
      }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={contact.avatar}
            alt={contact.name}
            className="h-12 w-12 rounded-full object-cover"
          />
          <StatusDot status={contact.status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{contact.name}</p>
            {contact.favorite && (
              <StarIcon className="h-4 w-4 text-amber-500" aria-label="Favourite" />
            )}
          </div>
          <p className="text-sm text-gray-600 truncate">{contact.lastSeen || "—"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ActionMini title="Message">
            <ChatBubbleOvalLeftIcon className="h-5 w-5 text-gray-700" />
          </ActionMini>
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

function ActionMini({ children, title }) {
  return (
    <button
      title={title}
      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100"
    >
      {children}
    </button>
  );
}

function EmptyState({ tab, query }) {
  const msg =
    tab === "invites"
      ? "No pending invites. Share your QR or link to invite contacts."
      : query
      ? `No contacts match "${query}".`
      : "No contacts yet. Add or invite someone to get started.";
  return (
    <div className="text-center py-16">
      <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
        <UserPlusIcon className="h-6 w-6 text-btn" />
      </div>
      <h3 className="text-lg text-white font-semibold mb-1">Nothing here</h3>
      <p className="text-sm text-gray-300">{msg}</p>
    </div>
  );
}
