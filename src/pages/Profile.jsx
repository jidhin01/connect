import { useState, useEffect } from "react";
import {
  CameraIcon,
  PencilSquareIcon,
  EllipsisVerticalIcon,
  UserIcon,
  AtSymbolIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  QrCodeIcon,
  CheckBadgeIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function Profile() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lastSeenVisible, setLastSeenVisible] = useState(true);
  const [photoVisible, setPhotoVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isUsernameEditing, setIsUsernameEditing] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch user on mount
  useEffect(() => {
    if (!token) {
      setErr("Not logged in");
      setLoading(false);
      return;
    }

    async function fetchUser() {
      try {
        const res = await fetch("http://localhost:4000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        const user = data.user;
        setName(user.username || "");
        setUsername(user.username || "");
        setBio(user.bio || "");
        setStatus(user.status || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
        setLastSeenVisible(user.showLastSeen ?? true);
        setPhotoVisible(user.showPhoto ?? true);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [token]);

  async function saveProfile() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("http://localhost:4000/api/users/me", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
        const errRes = await res.json();
        throw new Error(errRes.error || "Failed to save profile");
      }
      // Re-fetch user data to ensure UI is in sync
      const resUpdated = await fetch("http://localhost:4000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataUpdated = await resUpdated.json();
      const user = dataUpdated.user;
      setName(user.username || "");
      setUsername(user.username || "");
      setIsUsernameEditing(false); // Exit editing mode after successful save
      alert("Profile updated successfully!");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-4">Loading...</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="min-h-screen bg-seco text-gray-900">
      {/* Header */}
      <header className=" top-0 z-20 rounded-3xl bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-lg font-semibold">Profile</h1>
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <EllipsisVerticalIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Avatar Card */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={`https://avatars.dicebear.com/api/initials/${encodeURIComponent(
                  username || "A"
                )}.svg`}
                alt="Avatar"
                className="h-24 w-24 rounded-2xl object-cover"
              />
              <button
                title="Change photo"
                className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-xl p-2 shadow hover:bg-gray-50"
                onClick={() => alert("Feature coming soon!")}
              >
                <CameraIcon className="h-5 w-5 text-gray-700" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none"
                />
                <CheckBadgeIcon
                  className="h-5 w-5 text-indigo-500"
                  title="Verified (demo)"
                />
              </div>
              <div className="mt-1 flex items-center gap-2 text-gray-600">
                <AtSymbolIcon className="h-4 w-4" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Status */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current status</p>
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 font-medium border-b border-transparent bg-transparent focus:border-indigo-300 focus:outline-none text-gray-900"
              />
            </div>
            <button
              type="button"
              onClick={saveProfile}
              className="px-4 py-2 rounded bg-btn text-white hover:bg-btn-hover transition"
            >
              Save
            </button>
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
            
            {/* THIS IS THE MODIFIED SECTION */}
            <EditableRow 
                icon={<GlobeAltIcon className="h-5 w-5 text-gray-600" />}
                label="Username"
                value={username}
                onChange={setUsername}
                isEditing={isUsernameEditing}
                onToggleEdit={() => setIsUsernameEditing(!isUsernameEditing)}
                onSave={saveProfile}
                onCancel={() => {
                  setUsername(username); // Revert to current value
                  setIsUsernameEditing(false);
                }}
            />
            {/* END OF MODIFIED SECTION */}
          </div>
        </section>

        {/* Privacy */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Privacy</h2>
          <div className="space-y-3">
            <ToggleRow
              icon={<EyeIcon className="h-5 w-5 text-gray-600" />}
              label="Show Last Seen"
              enabled={lastSeenVisible}
              onChange={() => setLastSeenVisible(!lastSeenVisible)}
            />
            <ToggleRow
              icon={<EyeSlashIcon className="h-5 w-5 text-gray-600" />}
              label="Show Profile Photo"
              enabled={photoVisible}
              onChange={() => setPhotoVisible(!photoVisible)}
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
            />
            <DangerBtn
              icon={<TrashIcon className="h-5 w-5" />}
              label="Delete account"
              variant="danger"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

// Reusable component for read-only rows
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

// New component for the editable row
function EditableRow({ icon, label, value, onChange, isEditing, onToggleEdit, onSave, onCancel }) {
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

function ToggleRow({ icon, label, enabled, onChange }) {
  return (
    <div className="py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
          {icon}
        </div>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
          enabled ? "bg-btn" : "bg-gray-300"
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition ${
            enabled ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function DangerBtn({ icon, label, variant = "warn" }) {
  const styles =
    variant === "danger"
      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
      : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100";
  return (
    <button
      className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 px-4 text-sm font-semibold ${styles}`}
      onClick={() => alert(label)}
    >
      {icon}
      {label}
    </button>
  );
}
