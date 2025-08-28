import { useState, useEffect } from "react";
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

const BACKEND_URL = import.meta.env.VITE_API_BASE || "http://localhost:4000"; // e.g. https://your-backend.onrender.com
const API_BASE = `${BACKEND_URL}/api`;

// Utility: Get single uppercase initial from name
function getInitial(name) {
  if (!name) return "A";
  return name.trim()[0].toUpperCase();
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
  const [profilePic, setProfilePic] = useState(""); // stores server path (e.g. /uploads/profile_photos/abc.jpg)
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isUsernameEditing, setIsUsernameEditing] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const navigate = useNavigate();

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // Fetch user on mount
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
      // refresh
      const resUpdated = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
      const dataUpdated = await resUpdated.json();
      const user = dataUpdated.user || {};
      setName(user.username || "");
      setUsername(user.username || "");
      setIsUsernameEditing(false);
      alert("Profile updated successfully!");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Upload profile photo (IMPORTANT: POST to match backend)
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const res = await fetch(`${API_BASE}/users/me/photo`, {
        method: "POST",
        headers: authHeader, // do NOT set Content-Type manually for FormData
        body: formData,
      });
      if (!res.ok) {
        const errRes = await res.json().catch(() => ({}));
        throw new Error(errRes.error || "Failed to upload photo");
      }
      const data = await res.json();
      setProfilePic(data.photoUrl || "");
    } catch (err) {
      setErr(err.message);
    }
  }

  // Remove profile photo
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
      const data = await res.json();
      setProfilePic(""); // fallback to DiceBear
    } catch (err) {
      setErr(err.message);
    }
  }

  if (loading) return <div className="p-4">Loading...</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  // Use only the first letter of username for DiceBear seed fallback
  const initial = getInitial(username || "A");
  const effectivePhotoSrc = profilePic
    ? `${BACKEND_URL}${profilePic}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initial)}`;

  return (
    <div className="min-h-screen bg-seco text-gray-900">
      {/* Header */}
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

              {/* Change Photo */}
              {/* <label className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-xl p-2 shadow hover:bg-gray-50 cursor-pointer">
                <CameraIcon className="h-5 w-5 text-gray-700" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label> */}

              {/* Remove Photo */}
              {/* {profilePic && (
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
                  onChange={(e) => setEmail(e.target.value)} // fix: was setUsername before
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
              onCancel={() => {
                setIsUsernameEditing(false);
              }}
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
              onClick={() => alert("Delete account clicked")}
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
        <p className="text-sm font-medium truncate text-gray-900">{value}</p>
      </div>
      {copy && (
        <button
          onClick={() => navigator.clipboard.writeText(value)}
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        ) : (
          <p className="text-sm font-medium truncate text-gray-900">{value}</p>
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
