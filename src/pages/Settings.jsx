import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cog6ToothIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  KeyIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  InboxArrowDownIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  EyeIcon,
  EyeSlashIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowUpOnSquareIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ClipboardIcon,
  KeyIcon as KeyOutlineIcon,
} from "@heroicons/react/24/outline";

/* ---------- Config ---------- */
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

/* ---------- Helpers ---------- */
const toStr = (v) => (v == null ? "" : String(v));

/* ---------- Toast ---------- */
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

/* ---------- Confirm Dialog ---------- */
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

/* ---------- Change Password Dialog ---------- */
function ChangePasswordDialog({ open, onClose, onSuccess, apiBase, authHeader, showToast }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // reset when opened/closed
  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNew("");
      setErrMsg("");
      setSubmitting(false);
    }
  }, [open]);

  function validate() {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNew.trim()) {
      setErrMsg("All fields are required");
      return false;
    }
    if (newPassword.length < 8) {
      setErrMsg("New password must be at least 8 characters");
      return false;
    }
    if (newPassword !== confirmNew) {
      setErrMsg("New passwords do not match");
      return false;
    }
    setErrMsg("");
    return true;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Recommended dedicated endpoint for password change
      const res = await fetch(`${apiBase}/users/me/password`, {
        method: "PUT", // or PATCH/POST based on backend
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to change password");
      }
      showToast?.("Password changed", "success");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setErrMsg(err.message || "Failed to change password");
      showToast?.(err.message || "Failed to change password", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Change password</h3>
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-50" title="Close">
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {errMsg ? <p className="text-xs text-red-600">{errMsg}</p> : null}

            <div>
              <label className="text-xs text-gray-600">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-800 focus:ring-gray-800"
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Confirm new password</label>
              <input
                type="password"
                value={confirmNew}
                onChange={(e) => setConfirmNew(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg bg-btn text-white hover:bg-sky-800 disabled:opacity-50 text-sm"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Settings() {
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info", ms = 2000) => {
    setToast({ msg, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  return (
    <div className="min-h-screen bg-seco text-gray-900">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <header className="top-0 z-20 rounded-3xl bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Cog6ToothIcon className="h-6 w-6 text-gray-700" />
              <h1 className="text-lg font-semibold">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <AccountSection showToast={showToast} />
        {/* <PrivacySecuritySection />
        <ChatsSection />
        <NotificationsSection />
        <HelpAboutSection /> */}
        <DangerZone showToast={showToast} />
      </main>

      <div className="h-14 md:hidden" />
    </div>
  );
}

/* ---------------- Account ---------------- */
function AccountSection({ showToast }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [isUsernameEditing, setIsUsernameEditing] = useState(false);
  const [changePwdOpen, setChangePwdOpen] = useState(false);

  const lastSavedRef = useRef({ email: "", username: "" });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!token) {
      setErr("Not logged in");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
        if (!res.ok) throw new Error("Failed to load user");
        const data = await res.json();
        const user = data.user || {};
        setEmail(user.email || "");
        setUsername(user.username || "");
        lastSavedRef.current = { email: user.email || "", username: user.username || "" };
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function saveUsername() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const errRes = await res.json().catch(() => ({}));
        throw new Error(errRes.error || "Failed to save username");
      }
      const resUpdated = await fetch(`${API_BASE}/auth/me`, { headers: authHeader });
      const dataUpdated = await resUpdated.json();
      const user = dataUpdated.user || {};
      setEmail(user.email || "");
      setUsername(user.username || "");
      lastSavedRef.current = { email: user.email || "", username: user.username || "" };
      setIsUsernameEditing(false);
      showToast?.("Account updated", "success");
    } catch (e) {
      setErr(e.message);
      showToast?.(e.message || "Failed to update", "error");
    } finally {
      setLoading(false);
    }
  }

  function cancelUsernameEdit() {
    setUsername(lastSavedRef.current.username || "");
    setIsUsernameEditing(false);
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(toStr(email));
      showToast?.("Email copied", "success");
    } catch {
      showToast?.("Failed to copy", "error");
    }
  }

  if (loading) return <Section title="Account">Loading user details...</Section>;
  if (err) return <Section title="Account">Error: {err}</Section>;

  return (
    <Section title="Account" icon={<KeyIcon className="h-5 w-5 text-gray-700" />}>
      {/* Email copy-only row */}
      <CopyRow
        label="Email"
        value={email}
        icon={<InboxArrowDownIcon className="h-5 w-5 text-gray-600" />}
        onCopy={copyEmail}
      />

      {/* Username editable row */}
      <EditableRow
        label="Username"
        value={username}
        onChange={setUsername}
        prefix="@"
        icon={<GlobeAltIcon className="h-5 w-5 text-gray-600" />}
        isEditing={isUsernameEditing}
        onToggleEdit={() => setIsUsernameEditing((v) => !v)}
        onSave={saveUsername}
        onCancel={cancelUsernameEdit}
      />

      <div className="mt-3 flex gap-2">
        <Button variant="outline" onClick={() => setChangePwdOpen(true)} icon={<KeyOutlineIcon className="h-5 w-5" />}>
          Change password
        </Button>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordDialog
        open={changePwdOpen}
        onClose={() => setChangePwdOpen(false)}
        onSuccess={() => {
          // Optional: some backends invalidate token after password change
          // showToast("Password changed. Please sign in again.", "success");
          // localStorage.removeItem("token");
          // window.location.href = "/";
        }}
        apiBase={API_BASE}
        authHeader={authHeader}
        showToast={showToast}
      />
    </Section>
  );
}

/* ---------------- Privacy & Security ---------------- */
function PrivacySecuritySection() {
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [showTyping, setShowTyping] = useState(true);
  const [e2ee, setE2ee] = useState(true);
  const [disappearing, setDisappearing] = useState(false);

  return (
    <Section title="Privacy & Security" icon={<ShieldCheckIcon className="h-5 w-5 text-gray-700" />}>
      <Toggle
        label="Show Last Seen/Online"
        enabled={showLastSeen}
        onChange={() => setShowLastSeen((v) => !v)}
        iconOn={<EyeIcon className="h-5 w-5 text-gray-600" />}
        iconOff={<EyeSlashIcon className="h-5 w-5 text-gray-600" />}
      />
      <Toggle
        label="Read receipts"
        enabled={showReadReceipts}
        onChange={() => setShowReadReceipts((v) => !v)}
        iconOn={<ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />}
      />
      <Toggle
        label="Typing indicators"
        enabled={showTyping}
        onChange={() => setShowTyping((v) => !v)}
        iconOn={<ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />}
      />
      <Toggle
        label="End-to-end encryption"
        description="Protect messages with device-based keys."
        enabled={e2ee}
        onChange={() => setE2ee((v) => !v)}
        iconOn={<ShieldCheckIcon className="h-5 w-5 text-gray-600" />}
      />
      <Toggle
        label="Default disappearing messages"
        description="New chats will auto-delete messages after the set duration."
        enabled={disappearing}
        onChange={() => setDisappearing((v) => !v)}
        iconOn={<TrashIcon className="h-5 w-5 text-gray-600" />}
      />
    </Section>
  );
}

/* ---------------- Chats ---------------- */
function ChatsSection() {
  const [theme, setTheme] = useState("System");
  const [fontSize, setFontSize] = useState("Medium");

  return (
    <Section title="Chats" icon={<PaintBrushIcon className="h-5 w-5 text-gray-700" />}>
      <SelectRow label="Theme" value={theme} onChange={setTheme} options={["System", "Light", "Dark"]} />
      <SelectRow label="Font size" value={fontSize} onChange={setFontSize} options={["Small", "Medium", "Large"]} />
    </Section>
  );
}

/* ---------------- Notifications ---------------- */
function NotificationsSection() {
  const [enabled, setEnabled] = useState(true);
  const [mentionsOnly, setMentionsOnly] = useState(false);

  return (
    <Section title="Notifications" icon={<BellIcon className="h-5 w-5 text-gray-700" />}>
      <Toggle
        label="Enable notifications"
        enabled={enabled}
        onChange={() => setEnabled((v) => !v)}
        iconOn={<SpeakerWaveIcon className="h-5 w-5 text-gray-600" />}
        iconOff={<SpeakerXMarkIcon className="h-5 w-5 text-gray-600" />}
      />
      <Toggle
        label="Mentions only"
        description="Only alert when you are mentioned or replied to."
        enabled={mentionsOnly}
        onChange={() => setMentionsOnly((v) => !v)}
        iconOn={<ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />}
      />
    </Section>
  );
}

/* ---------------- Help & About ---------------- */
function HelpAboutSection() {
  return (
    <Section title="Help & About" icon={<QuestionMarkCircleIcon className="h-5 w-5 text-gray-700" />}>
      <LinkRow label="Help center" onClick={() => alert("Help Center")} />
      <LinkRow label="Report a problem" onClick={() => alert("Report a problem")} />
      <LinkRow label="Send feedback" onClick={() => alert("Send feedback")} />
      <LinkRow label="About • v1.0.0" onClick={() => alert("App version 1.0.0")} />
    </Section>
  );
}

/* ---------------- Danger Zone ---------------- */
function DangerZone({ showToast }) {
  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  function openDeleteConfirm() {
    setConfirmOpen(true);
  }

  async function confirmDeleteAccount() {
    setConfirmBusy(true);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) {
        const errRes = await res.json().catch(() => ({}));
        throw new Error(errRes.error || `Failed to delete account (${res.status})`);
      }
      showToast?.("Account deleted", "success");
      setTimeout(() => {
        setConfirmOpen(false);
        localStorage.removeItem("token");
        navigate("/");
      }, 800);
    } catch (e) {
      showToast?.(e.message || "Delete failed", "error");
      setConfirmOpen(false);
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <Section title="Danger zone" icon={<TrashIcon className="h-5 w-5 text-rose-600" />}>
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

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="warn" icon={<ArrowRightOnRectangleIcon className="h-5 w-5" />} onClick={handleLogout}>
          Log out
        </Button>
        <Button variant="danger" icon={<TrashIcon className="h-5 w-5" />} onClick={openDeleteConfirm}>
          Delete account
        </Button>
      </div>
    </Section>
  );
}

/* ---------------- Reusable UI ---------------- */
function Section({ title, icon, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </section>
  );
}

function CopyRow({ icon, label, value, onCopy }) {
  return (
    <div className="py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-sm font-medium truncate text-gray-900">{toStr(value)}</p>
      </div>
      <button
        onClick={onCopy}
        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
        title="Copy"
      >
        <ClipboardIcon className="h-4 w-4" />
        Copy
      </button>
    </div>
  );
}

function EditableRow({
  icon,
  label,
  value,
  onChange,
  prefix,
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
          <div className="mt-0.5 flex items-center gap-2">
            {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none text-sm font-medium text-gray-900"
            />
          </div>
        ) : (
          <p className="text-sm font-medium truncate text-gray-900 mt-0.5">
            {prefix && <span className="text-gray-500">{prefix}</span>}
            {value}
          </p>
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

function Toggle({ label, description, enabled, onChange, iconOn, iconOff }) {
  return (
    <div className="py-3 flex items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
          {enabled ? iconOn || null : iconOff || iconOn || null}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {description && <p className="text-xs text-gray-600 mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          enabled ? "bg-btn" : "bg-gray-300"
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            enabled ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div className="py-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-600 mt-0.5">Current: {value}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function LinkRow({ label, onClick }) {
  return (
    <button
      className="w-full text-left py-3 flex items-center justify-between text-sm hover:bg-gray-50 rounded-lg px-2"
      onClick={onClick}
    >
      <span className="text-gray-800">{label}</span>
      <ArrowUpOnSquareIcon className="h-5 w-5 text-gray-400 rotate-90" />
    </button>
  );
}

function Button({ children, variant = "solid", icon = null, onClick }) {
  const base = "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm";
  const styles =
    variant === "solid"
      ? "bg-btn text-white hover:bg-indigo-700"
      : variant === "outline"
      ? "border border-gray-200 text-gray-800 hover:bg-gray-50"
      : variant === "warn"
      ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
      : variant === "danger"
      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
      : "";
  return (
    <button className={`${base} ${styles}`} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}
