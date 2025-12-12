import { useState, useEffect, useRef } from "react";
import { useUser } from "../context/UserContext";
import {
  CameraIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon as StatusIcon,
  InformationCircleIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

const toStr = (v) => (v == null ? "" : String(v));
function getInitial(name) {
  const s = toStr(name).trim();
  return s ? s[0].toUpperCase() : "A";
}
function initialsAvatar(letter) {
  const l = getInitial(letter);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(l)}`;
}

// Reusable Components
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const colors =
    toast.type === "success"
      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
      : toast.type === "error"
        ? "bg-rose-50 text-rose-600 border-rose-200"
        : "bg-gray-50 text-gray-800 border-gray-200";
  return (
    <div className={`fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm ${colors}`}>
        <span className="font-medium text-sm">{toast.msg}</span>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Section({ title, children, icon: Icon }) {
  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-2 mb-6 text-gray-900">
        {Icon && <Icon className="h-5 w-5 text-gray-500" />}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function InputGroup({ label, value, onChange, placeholder, icon: Icon, type = "text", disabled = false, multiline = false }) {
  return (
    <div className="group">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
        {label}
      </label>
      <div className={`relative flex items-start transition-all duration-200 rounded-2xl bg-gray-50 ring-1 ring-transparent focus-within:bg-white focus-within:ring-[--color-btn] focus-within:ring-2 ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100/80'}`}>
        <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-[--color-btn] transition-colors">
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            rows={3}
            className="w-full bg-transparent border-none py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 resize-none"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full bg-transparent border-none py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
          />
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-1 group">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors">
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>
        <span className="font-medium text-gray-700">{label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[--color-btn] focus:ring-offset-2 ${checked ? "bg-[--color-btn]" : "bg-gray-200"
          }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${checked ? "translate-x-6" : "translate-x-1"
            }`}
        />
      </button>
    </div>
  );
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const initialDataRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    bio: "",
    showLastSeen: true,
    showPhoto: true,
    photoUrl: ""
  });
  const [isDirty, setIsDirty] = useState(false);

  // Check if form is dirty whenever formData changes
  useEffect(() => {
    if (!initialDataRef.current) return;

    const initial = initialDataRef.current;
    const isChanged =
      initial.username !== formData.username ||
      initial.bio !== formData.bio ||
      initial.showLastSeen !== formData.showLastSeen ||
      initial.showPhoto !== formData.showPhoto;

    setIsDirty(isChanged);
  }, [formData]);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { setUser } = useUser();
  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
      const data = await res.json();
      if (data.user) {
        const initialState = {
          name: data.user.username || "",
          username: data.user.username || "",
          email: data.user.email || "",
          bio: data.user.bio || "",
          showLastSeen: data.user.showLastSeen ?? true,
          showPhoto: data.user.showPhoto ?? true,
          photoUrl: data.user.photoUrl || ""
        };
        setFormData(initialState);
        initialDataRef.current = initialState;
      }
    } catch (e) {
      showToast("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          bio: formData.bio,
          showLastSeen: formData.showLastSeen,
          showPhoto: formData.showPhoto
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      const updatedData = await res.json();

      // Update global context
      const meRes = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
      const meData = await meRes.json();
      setUser(meData.user);

      // Update initial ref to new state so dirty check resets
      initialDataRef.current = { ...formData };
      setIsDirty(false);

      showToast("Profile saved successfully");
    } catch (e) {
      showToast(e.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append("photo", file);

    try {
      const res = await fetch(`${API_BASE}/users/me/photo`, {
        method: "POST",
        headers: authHeader,
        body: uploadData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setFormData(prev => ({ ...prev, photoUrl: data.photoUrl }));

      // Sync initial data's photoUrl too so it doesn't trigger dirty state incorrectly if other fields match
      // Or simply refetch. Let's refetch to be safe/clean.
      // Update global context
      const meRes = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
      const meData = await meRes.json();
      setUser(meData.user);

      showToast("Photo updated");
    } catch (e) {
      showToast("Failed to upload photo", "error");
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/me/photo`, {
        method: "DELETE",
        headers: authHeader,
      });

      if (!res.ok) throw new Error("Remove failed");

      setFormData(prev => ({ ...prev, photoUrl: "" }));

      // Update global context
      const meRes = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
      const meData = await meRes.json();
      setUser(meData.user);

      showToast("Photo removed");
    } catch (e) {
      showToast("Failed to remove photo", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you surely you want to delete your account? This cannot be undone.")) return;

    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (res.ok) {
        handleLogout();
      } else {
        throw new Error("Delete failed");
      }
    } catch (e) {
      showToast("Failed to delete account", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[--color-seco] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-white/20"></div>
          <div className="h-4 w-32 rounded bg-white/20"></div>
        </div>
      </div>
    );
  }

  const effectivePhotoSrc = formData.photoUrl
    ? `${BACKEND_URL}${formData.photoUrl}`
    : initialsAvatar(formData.username);

  return (
    <div className="min-h-screen bg-[--color-seco] text-gray-900 pb-20 font-sans">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">

        {/* Minimal Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tighter text-gray-100">Profile</h1>
          <p className="text-gray-500 mt-2 text-sm">Manage your personal information</p>
        </div>

        {/* Profile Card */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full p-1 bg-white ring-2 ring-gray-100 shadow-sm relative z-10">
              <img
                src={effectivePhotoSrc}
                alt="Profile"
                className="w-full h-full rounded-full object-cover bg-gray-50"
              />
            </div>

            <label className="absolute bottom-0 right-0 z-20 p-2.5 rounded-full bg-gray-900 text-white shadow-lg cursor-pointer hover:bg-[--color-btn] transition-all transform active:scale-90 hover:scale-105">
              <CameraIcon className="w-5 h-5" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>

            {formData.photoUrl && (
              <button
                onClick={handleRemovePhoto}
                className="absolute bottom-0 left-0 z-20 p-2.5 rounded-full bg-white text-rose-500 shadow-md ring-1 ring-gray-200 hover:bg-rose-50 transition-all transform active:scale-90 hover:scale-105"
                title="Remove photo"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <h2 className="text-xl font-bold text-gray-100">{formData.username || "User"}</h2>
            <p className="text-gray-400 text-sm">{formData.email}</p>
          </div>
        </div>

        {/* Personal Details */}
        <div className="space-y-6">
          <Section title="About You" icon={UserCircleIcon}>
            <div className="space-y-5">
              <InputGroup
                label="Display Name"
                value={formData.username}
                onChange={(v) => setFormData({ ...formData, username: v })}
                icon={UserCircleIcon}
                placeholder="How should we call you?"
              />
              <InputGroup
                label="Bio"
                value={formData.bio}
                onChange={(v) => setFormData({ ...formData, bio: v })}
                icon={SparklesIcon}
                placeholder="Share a little about yourself..."
                multiline
              />
              <div className="opacity-60 pointer-events-none grayscale">
                <InputGroup
                  label="Email Address"
                  value={formData.email}
                  disabled
                  icon={EnvelopeIcon}
                />
              </div>
            </div>
          </Section>

          {/* Privacy */}
          <Section title="Privacy" icon={ShieldCheckIcon}>
            <div className="space-y-4">
              <Toggle
                label="Show Online Status"
                checked={formData.showLastSeen}
                onChange={(v) => setFormData({ ...formData, showLastSeen: v })}
                icon={EyeIcon}
              />
              <div className="h-px bg-gray-100 border-none" />
              <Toggle
                label="Public Profile Photo"
                checked={formData.showPhoto}
                onChange={(v) => setFormData({ ...formData, showPhoto: v })}
                icon={UserCircleIcon}
              />
            </div>
          </Section>
        </div>

        {/* Save Button (Conditional) */}
        <div className={`fixed bottom-6 left-0 right-0 px-4 flex justify-center transition-all duration-500 ${isDirty ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full max-w-sm flex justify-center items-center gap-2 py-4 px-8 rounded-full bg-gray-900 text-white font-bold text-base shadow-2xl shadow-gray-900/30 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed backdrop-blur-md"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckIcon className="w-5 h-5" />
            )}
            Save Changes
          </button>
        </div>

        {/* Danger Zone - Minimal */}
        <div className="flex justify-center gap-6 pt-10 pb-20 opacity-60 hover:opacity-100 transition-opacity">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Sign Out
          </button>
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 text-sm font-semibold text-rose-400 hover:text-rose-600 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            Delete Account
          </button>
        </div>

      </main>
    </div>
  );
}
