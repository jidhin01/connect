import { useState, useEffect, useRef } from "react";
import {
  CameraIcon,
  PencilSquareIcon,
  AtSymbolIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CheckBadgeIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

// Helpers
const toStr = (v) => (v == null ? "" : String(v));
function getInitial(name) {
  const s = toStr(name).trim();
  return s ? s[0].toUpperCase() : "A";
}
function initialsAvatar(letter) {
  const l = getInitial(letter);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(l)}`;
}

// Tiny toast
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const colors =
    toast.type === "success"
      ? "bg-green-100 text-green-800"
      : toast.type === "error"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm ${colors}`}>
      <div className="flex items-center gap-2">
        <span>{toast.msg}</span>
        <button onClick={onClose} className="ml-2 text-xs opacity-70 hover:opacity-100">
          Close
        </button>
      </div>
    </div>
  );
}

// Confirmation dialog
function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-50" title="Close">
            <XMarkIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700">{message}</p>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 text-sm"
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lastSeenVisible, setLastSeenVisible] = useState(true);
  const [photoVisible, setPhotoVisible] = useState(true);
  const [profilePic, setProfilePic] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isUsernameEditing, setIsUsernameEditing] = useState(false);

  // Keep a snapshot of last saved server state to support Cancel restore
  const lastSavedRef = useRef({
    username: "",
    bio: "",
    status: "",
    phone: "",
    showLastSeen: true,
    showPhoto: true,
    email: "",
    photoUrl: "",
  });

  // toast + confirm modal
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info", ms = 2500) => {
    setToast({ msg, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const navigate = useNavigate();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  useEffect(() => {
    if (!token) {
      setErr("Not logged in");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        const user = data.user || {};
        setName(user.username || "");
        setUsername(user.username || "");
        setBio(user.bio || "");
        setStatus(user.status || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
        setLastSeenVisible(user.showLastSeen ?? true);
        setPhotoVisible(user.showPhoto ?? true);
        setProfilePic(user.photoUrl || "");

        // snapshot last saved state for restore on cancel
        lastSavedRef.current = {
          username: user.username || "",
          bio: user.bio || "",
          status: user.status || "",
          phone: user.phone || "",
          showLastSeen: user.showLastSeen ?? true,
          showPhoto: user.showPhoto ?? true,
          email: user.email || "",
          photoUrl: user.photoUrl || "",
        };
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function saveProfile() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          bio,
          status,
          showLastSeen: lastSeenVisible,
          showPhoto: photoVisible,
          phone,
        }),
      });
      if (!res.ok) {
        const errRes = await res.json().catch(() => ({}));
        throw new Error(errRes.error || "Failed to save profile");
      }
      // Refresh and also update the last-saved snapshot
      const resUpdated = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
      const dataUpdated = await resUpdated.json();
      const user = dataUpdated.user || {};
      setName(user.username || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      setStatus(user.status || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setLastSeenVisible(user.showLastSeen ?? true);
      setPhotoVisible(user.showPhoto ?? true);
      setProfilePic(user.photoUrl || "");
      lastSavedRef.current = {
        username: user.username || "",
        bio: user.bio || "",
        status: user.status || "",
        phone: user.phone || "",
        showLastSeen: user.showLastSeen ?? true,
        showPhoto: user.showPhoto ?? true,
        email: user.email || "",
        photoUrl: user.photoUrl || "",
      };
      setIsUsernameEditing(false);
      showToast("Profile updated", "success");
    } catch (e) {
      setErr(e.message);
      showToast(e.message || "Failed to update", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const res = await fetch(`${API_BASE}/users/me/photo`, {
        method: "POST",
        headers: authHeader, // no Content-Type for FormData
        body: formData,
      });
      if (!res.ok) {
        const errRes = await res.json().catch(() => ({}));
        throw new Error(errRes.error || "Failed to upload photo");
      }
      const data = await res.json();
      setProfilePic(data.photoUrl || "");
      // Update snapshot photoUrl
      lastSavedRef.current.photoUrl = data.photoUrl || "";
      showToast("Photo updated", "success");
    } catch (err) {
      setErr(err.message);
      showToast(err.message || "Photo upload failed", "error");
    }
  }

  async function handleRemovePhoto() {
    try {
      const res = await fetch(`${API_BASE}/users/me/photo`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) {
        const errRes = await res.json().catch(() => ({}));
        throw new Error(errRes.error || "Failed to remove photo");
      }
      await res.json();
      setProfilePic("");
      lastSavedRef.current.photoUrl = "";
      showToast("Photo removed", "success");
    } catch (err) {
      setErr(err.message);
      showToast(err.message || "Photo remove failed", "error");
    }
  }

  // Open modal instead of native confirm
  function openDeleteConfirm() {
    setConfirmOpen(true);
  }

  async function confirmDeleteAccount() {
    setConfirmBusy(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "DELETE",
        headers: authHeader, // no Content-Type for empty body
      });
      if (!res.ok) {
        const errRes = await res.json().catch(() => ({}));
        throw new Error(errRes.error || `Failed to delete account (${res.status})`);
      }
      showToast("Account deleted", "success");
      setTimeout(() => {
        setConfirmOpen(false);
        localStorage.removeItem("token");
        navigate("/");
      }, 800);
    } catch (e) {
      setErr(e.message);
      showToast(e.message || "Delete failed", "error");
      setConfirmOpen(false);
    } finally {
      setConfirmBusy(false);
    }
  }

  // Cancel handlers to restore last saved values (username focus)
  function cancelUsernameEdit() {
    setUsername(lastSavedRef.current.username || "");
    setIsUsernameEditing(false);
  }

  if (loading) return <div className="p-4">Loading...</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  const initial = getInitial(username || "A");
  const effectivePhotoSrc = initialsAvatar(initial);

  return (
    <div className="min-h-screen bg-seco text-gray-900">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete account"
        message="This action will permanently remove the account and all associated data. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setConfirmOpen(false)}
        loading={confirmBusy}
      />

      <header className="top-0 z-20 rounded-3xl bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-lg font-semibold">Profile</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Avatar Card */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={effectivePhotoSrc}
                alt="Avatar"
                className="h-24 w-24 rounded-2xl object-cover"
              />

              {/* Change Photo (uncomment to enable) */}
              {/* <label className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-xl p-2 shadow hover:bg-gray-50 cursor-pointer">
                <CameraIcon className="h-5 w-5 text-gray-700" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label> */}

              {/* Remove Photo (uncomment to enable) */}
              {/* {!!profilePic && (
                <button
                  onClick={handleRemovePhoto}
                  className="absolute -bottom-2 left-0 bg-white border border-gray-200 rounded-xl p-2 shadow hover:bg-gray-50"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-700" />
                </button>
              )} */}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none"
                />
                <CheckBadgeIcon className="h-5 w-5 text-indigo-500" title="Verified" />
              </div>
              <div className="mt-1 flex items-center text-gray-600">
                <AtSymbolIcon className="h-4 w-4" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Contact</h2>
          <div className="divide-y divide-gray-100">
            <Row
              icon={<EnvelopeIcon className="h-5 w-5 text-gray-600" />}
              label="Email"
              value={email}
              copy
            />
            <EditableRow
              icon={<GlobeAltIcon className="h-5 w-5 text-gray-600" />}
              label="Username"
              value={username}
              onChange={setUsername}
              isEditing={isUsernameEditing}
              onToggleEdit={() => setIsUsernameEditing(!isUsernameEditing)}
              onSave={saveProfile}
              onCancel={cancelUsernameEdit}
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Danger Zone</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <DangerBtn
              icon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
              label="Log out"
              onClick={handleLogout}
            />
            <DangerBtn
              icon={<TrashIcon className="h-5 w-5" />}
              label="Delete account"
              variant="danger"
              onClick={openDeleteConfirm}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function Row({ icon, label, value, actionLabel, onAction, copy = false }) {
  return (
    <div className="py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-sm font-medium truncate text-gray-900">{toStr(value)}</p>
      </div>
      {copy && (
        <button
          onClick={() => navigator.clipboard.writeText(toStr(value))}
          className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
        >
          Copy
        </button>
      )}
      {actionLabel && (
        <button
          onClick={onAction}
          className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function EditableRow({
  icon,
  label,
  value,
  onChange,
  isEditing,
  onToggleEdit,
  onSave,
  onCancel,
}) {
  return (
    <div className="py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        {isEditing ? (
          <input
            type="text"
            value={toStr(value)}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        ) : (
          <p className="text-sm font-medium truncate text-gray-900">{toStr(value)}</p>
        )}
      </div>
      {isEditing ? (
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100"
            title="Save"
          >
            <CheckIcon className="h-5 w-5 text-indigo-600" />
          </button>
          <button
            onClick={onCancel}
            className="p-2 rounded-full bg-red-50 hover:bg-red-100"
            title="Cancel"
          >
            <XMarkIcon className="h-5 w-5 text-red-600" />
          </button>
        </div>
      ) : (
        <button
          onClick={onToggleEdit}
          className="p-2 rounded-full bg-gray-50 hover:bg-gray-100"
          title="Edit"
        >
          <PencilSquareIcon className="h-5 w-5 text-gray-600" />
        </button>
      )}
    </div>
  );
}

function DangerBtn({ icon, label, variant = "warn", onClick }) {
  const styles =
    variant === "danger"
      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
      : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100";
  return (
    <button
      className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 px-4 text-sm font-semibold ${styles}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
