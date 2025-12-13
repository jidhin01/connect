import { useState, useEffect, useRef } from "react";
import { useUser } from "../context/UserContext";
import {
  UserCircleIcon,
  EnvelopeIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  SparklesIcon,
  PencilSquareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

/* ---------- Config ---------- */
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

/* ---------- Helpers ---------- */
const initialsAvatar = (name = "A") =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name[0]?.toUpperCase() || "A"
  )}&backgroundColor=171717&textColor=ffffff`;

/* -------------------- COMPONENTS -------------------- */

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const colorStyles =
    toast.type === "error"
      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400"
      : "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400";

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-4 border-l-4 p-4 shadow-xl dark:border-r dark:border-t dark:border-b dark:border-neutral-800 dark:bg-neutral-900 ${colorStyles}`}>
      <span className="text-xs font-bold uppercase tracking-wide">{toast.msg}</span>
      <button onClick={onClose} className="hover:opacity-70">
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function ConfirmModal({ open, title, desc, confirmText, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
          {title}
        </h3>
        <div className="my-4 h-px w-full bg-neutral-100 dark:bg-neutral-800" />
        <p className="mb-6 text-sm font-mono text-neutral-500 dark:text-neutral-400">{desc}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="border border-neutral-300 px-4 py-2 text-xs font-bold uppercase text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-neutral-900 border border-neutral-900 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-white hover:text-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:border-white transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, multiline, icon: Icon }) {
  return (
    <div className="group">
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-3 h-5 w-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={3}
            className="w-full border border-neutral-300 bg-transparent px-4 py-2.5 pl-10 text-sm font-mono text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:text-white dark:focus:border-white transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full border border-neutral-300 bg-transparent px-4 py-2.5 pl-10 text-sm font-mono text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:text-white dark:focus:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between border px-4 py-3 transition-colors ${
        checked 
          ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900" 
          : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
      }`}
    >
      <span className="text-xs font-bold uppercase tracking-wide text-neutral-900 dark:text-white">
        {label}
      </span>
      <div className={`flex h-5 w-5 items-center justify-center border ${checked ? "border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white" : "border-neutral-300 dark:border-neutral-600"}`}>
        {checked && <CheckIcon className="h-4 w-4 text-white dark:text-neutral-900" />}
      </div>
    </button>
  );
}

/* -------------------- MAIN -------------------- */

export default function Profile() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const initialRef = useRef(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    bio: "",
    showLastSeen: true,
    showPhoto: true,
    photoUrl: "",
  });

  const authHeader = { Authorization: `Bearer ${token}` };

  // Helper to check if form is dirty (simple shallow comparison)
  const isDirty =
    initialRef.current &&
    (form.username !== initialRef.current.username ||
      form.bio !== initialRef.current.bio ||
      form.showLastSeen !== initialRef.current.showLastSeen);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    loadProfile();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadProfile() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
      const data = await res.json();
      const state = {
        username: data.user.username || "",
        email: data.user.email || "",
        bio: data.user.bio || "",
        showLastSeen: data.user.showLastSeen ?? true,
        showPhoto: data.user.showPhoto ?? true,
        photoUrl: data.user.photoUrl || "",
      };
      setForm(state);
      initialRef.current = state;
    } catch {
      showToast("FAILED TO LOAD PROFILE DATA", "error");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    // Dismiss previous confirmation
    setConfirm(null); 
    try {
      await fetch(`${API_BASE}/users/me`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      initialRef.current = form;
      showToast("PROFILE UPDATED SUCCESSFULLY");
    } catch {
      showToast("UPDATE FAILED", "error");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    localStorage.clear();
    setUser(null);
    navigate("/");
  }

  async function deleteAccount() {
    try {
      await fetch(`${API_BASE}/users/me`, {
        method: "DELETE",
        headers: authHeader,
      });
      logout();
    } catch {
      showToast("DELETE FAILED", "error");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 animate-pulse">
          Retrieving Data...
        </span>
      </div>
    );
  }

  const photoSrc = form.photoUrl
    ? `${BACKEND_URL}${form.photoUrl}`
    : initialsAvatar(form.username);

  return (
    <div className="min-h-screen bg-neutral-50 px-4 pb-32 pt-8 dark:bg-neutral-950 transition-colors duration-300">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />

      <main className="mx-auto max-w-lg space-y-8">
        {/* Header */}
        <div className="flex items-center justify-center border-b border-neutral-200 pb-6 dark:border-neutral-800">
           <h1 className="font-orbitron text-xl font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
            User Profile
          </h1>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-32 w-32 border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
            <img
              src={photoSrc}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
            <button className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center border border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-white dark:bg-neutral-900 dark:text-white dark:hover:bg-white dark:hover:text-neutral-900 transition-colors">
               <PencilSquareIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">ID: {form.username}</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="space-y-6 border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <Field
            label="Display Name"
            value={form.username}
            onChange={(v) => setForm({ ...form, username: v })}
            icon={UserCircleIcon}
          />
          <Field
            label="Status / Bio"
            value={form.bio}
            multiline
            onChange={(v) => setForm({ ...form, bio: v })}
            icon={SparklesIcon}
          />
          <Field
            label="Email Address"
            value={form.email}
            disabled
            icon={EnvelopeIcon}
          />
          
          <div className="pt-2">
            <Toggle
              label="Public Online Status"
              checked={form.showLastSeen}
              onChange={(v) => setForm({ ...form, showLastSeen: v })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() =>
              setConfirm({
                open: true,
                title: "TERMINATE SESSION",
                desc: "Are you sure you want to log out from this device?",
                confirmText: "LOG OUT",
                onConfirm: logout,
              })
            }
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Sign Out
          </button>

          <button
            disabled={!isDirty || saving}
            onClick={() =>
              setConfirm({
                open: true,
                title: "CONFIRM CHANGES",
                desc: "Overwrite existing profile data with new values?",
                confirmText: "SAVE CHANGES",
                onConfirm: saveProfile,
              })
            }
            className="bg-neutral-900 border border-neutral-900 px-6 py-3 text-xs font-bold uppercase text-white hover:bg-white hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:border-white transition-all"
          >
            {saving ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="border-t border-dashed border-neutral-300 pt-8 mt-8 dark:border-neutral-800">
          <button
            onClick={() =>
              setConfirm({
                open: true,
                title: "DELETE ACCOUNT",
                desc: "IRREVERSIBLE ACTION: All data associated with this account will be permanently destroyed.",
                confirmText: "DELETE FOREVER",
                onConfirm: deleteAccount,
              })
            }
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            Delete Account
          </button>
        </div>
      </main>
    </div>
  );
}