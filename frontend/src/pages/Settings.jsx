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

  // Minimalist border-based styling instead of soft backgrounds
  const typeStyles =
    toast.type === "success"
      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
      : toast.type === "error"
        ? "border-red-500 text-red-600 dark:text-red-400"
        : "border-neutral-500 text-neutral-600 dark:text-neutral-400";

  return (
    <div className={`fixed top-4 right-4 z-50 min-w-[300px] border-l-4 bg-white p-4 shadow-xl dark:bg-neutral-900 dark:border-r dark:border-t dark:border-b dark:border-neutral-800 ${typeStyles}`}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{toast.msg}</span>
        <button
          onClick={onClose}
          className="text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100"
        >
          Dismiss
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
            {title}
          </h3>
          <button onClick={onCancel} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? "PROCESSING..." : confirmLabel}
          </Button>
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
      const res = await fetch(`${apiBase}/users/me/password`, {
        method: "PUT",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
              Security
            </h3>
            <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-6 py-6">
            {errMsg && (
              <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                {errMsg}
              </div>
            )}

            <div className="group">
              <label className="mb-1 block text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:text-white dark:focus:border-white"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="group">
              <label className="mb-1 block text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:text-white dark:focus:border-white"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <div className="group">
              <label className="mb-1 block text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Confirm Password</label>
              <input
                type="password"
                value={confirmNew}
                onChange={(e) => setConfirmNew(e.target.value)}
                className="w-full border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:text-white dark:focus:border-white"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" disabled={submitting}>
              {submitting ? "SAVING..." : "UPDATE KEY"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Main Component ---------- */
export default function Settings() {
  const [activeTab, setActiveTab] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info", ms = 2000) => {
    setToast({ msg, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  const navItems = [
    { id: "account", label: "Identity", icon: KeyIcon, component: <AccountSection showToast={showToast} /> },
    { id: "privacy", label: "Privacy Protocols", icon: ShieldCheckIcon, component: <PrivacySecuritySection /> },
    { id: "interface", label: "Interface", icon: PaintBrushIcon, component: <ChatsSection /> },
    { id: "alerts", label: "Alerts", icon: BellIcon, component: <NotificationsSection /> },
    { id: "system", label: "System", icon: QuestionMarkCircleIcon, component: <HelpAboutSection /> },
    { id: "danger", label: "Danger Zone", icon: TrashIcon, component: <DangerZone showToast={showToast} />, danger: true },
  ];

  const activeItem = navItems.find(i => i.id === activeTab);

  return (
    <div className="flex h-full overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white transition-colors duration-300 relative">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Left Sidebar (List) */}
      <div
        className={`flex h-full flex-col border-r border-neutral-200 bg-white transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-950 
        ${activeTab ? "hidden md:flex w-full md:w-80 lg:w-96" : "w-full max-w-4xl mx-auto md:w-80 md:mx-0 lg:w-96"}`}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
              <Cog6ToothIcon className="h-5 w-5" />
            </div>
            <h1 className="font-orbitron text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
              SETTINGS
            </h1>
          </div>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group flex items-center gap-4 border border-transparent p-4 transition-all hover:bg-neutral-50 dark:hover:bg-neutral-900
                ${activeTab === item.id
                  ? "bg-neutral-100 border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800"
                  : "bg-white dark:bg-neutral-950"}
                ${item.danger ? "hover:border-red-200 hover:bg-red-50 dark:hover:border-red-900/30 dark:hover:bg-red-900/10" : ""}
                `}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center border ${activeTab === item.id ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"} ${item.danger ? "group-hover:text-red-600 group-hover:border-red-200" : ""}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-start">
                <span className={`font-bold uppercase tracking-tight ${activeTab === item.id ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"} ${item.danger ? "group-hover:text-red-700 dark:group-hover:text-red-400" : ""}`}>
                  {item.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Side (Content or System Idle) */}
      {activeTab ? (
        <div className="fixed inset-0 z-50 flex h-full w-full flex-col bg-neutral-50 md:relative md:z-0 dark:bg-neutral-950">
          {/* Mobile Header for Detail View */}
          <div className="md:hidden flex items-center border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
            <button onClick={() => setActiveTab(null)} className="mr-3">
              <ArrowRightOnRectangleIcon className="h-5 w-5 rotate-180" />
            </button>
            <h2 className="font-bold uppercase tracking-widest">{activeItem?.label}</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-2xl">
              {activeItem?.component}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State for Split View */
        <div className="hidden flex-1 items-center justify-center bg-neutral-100 md:flex dark:bg-neutral-900">
          <div className="flex flex-col items-center border border-dashed border-neutral-300 p-12 dark:border-neutral-700">
            <div className="mb-6 flex h-16 w-16 items-center justify-center border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800">
              <Cog6ToothIcon className="h-8 w-8 text-neutral-400" />
            </div>
            <h2 className="mb-2 font-orbitron text-lg font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
              System Idle
            </h2>
            <p className="max-w-xs text-center text-xs font-mono text-neutral-500 dark:text-neutral-400">
              Select a configuration module from the left panel to modify system parameters.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Account ---------------- */
function AccountSection({ showToast }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
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
        setPhotoUrl(user.photoUrl || "");
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

  if (loading) return <Section title="Account" icon={<KeyIcon className="h-5 w-5" />}>Loading user details...</Section>;
  if (err) return <Section title="Account" icon={<KeyIcon className="h-5 w-5" />}>Error: {err}</Section>;

  return (
    <Section title="User Identity" icon={<KeyIcon className="h-5 w-5" />}>
      {/* Avatar Preview - Square */}
      <div className="flex items-center gap-6 py-4">
        <div className="h-20 w-20 flex-shrink-0 border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
          {photoUrl ? (
            <img
              src={`${API_BASE.replace('/api', '')}${photoUrl}`}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-neutral-300 dark:text-neutral-600">
              {(username || email || "U")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => setChangePwdOpen(true)} icon={<KeyOutlineIcon className="h-4 w-4" />}>
            CHANGE PASSWORD
          </Button>
          <p className="text-xs text-neutral-400">Manage your avatar via external provider.</p>
        </div>
      </div>

      <CopyRow
        label="Email Address"
        value={email}
        icon={<InboxArrowDownIcon className="h-5 w-5" />}
        onCopy={copyEmail}
      />

      <EditableRow
        label="Username"
        value={username}
        onChange={setUsername}
        prefix="@"
        icon={<GlobeAltIcon className="h-5 w-5" />}
        isEditing={isUsernameEditing}
        onToggleEdit={() => setIsUsernameEditing((v) => !v)}
        onSave={saveUsername}
        onCancel={cancelUsernameEdit}
      />

      <ChangePasswordDialog
        open={changePwdOpen}
        onClose={() => setChangePwdOpen(false)}
        onSuccess={() => { }}
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
    <Section title="Privacy Protocols" icon={<ShieldCheckIcon className="h-5 w-5" />}>
      <Toggle
        label="Activity Status"
        description="Visible online status"
        enabled={showLastSeen}
        onChange={() => setShowLastSeen((v) => !v)}
      />
      <Toggle
        label="Read Receipts"
        enabled={showReadReceipts}
        onChange={() => setShowReadReceipts((v) => !v)}
      />
      <Toggle
        label="Typing Indicators"
        enabled={showTyping}
        onChange={() => setShowTyping((v) => !v)}
      />
      <Toggle
        label="E2E Encryption"
        description="Device-based keys active"
        enabled={e2ee}
        onChange={() => setE2ee((v) => !v)}
      />
      <Toggle
        label="Auto-Deletion"
        description="Clear history automatically"
        enabled={disappearing}
        onChange={() => setDisappearing((v) => !v)}
      />
    </Section>
  );
}

/* ---------------- Chats ---------------- */
function ChatsSection() {
  const [theme, setTheme] = useState("System");
  const [fontSize, setFontSize] = useState("Medium");

  return (
    <Section title="Interface" icon={<PaintBrushIcon className="h-5 w-5" />}>
      <SelectRow label="Color Theme" value={theme} onChange={setTheme} options={["System", "Light", "Dark"]} />
      <SelectRow label="Typography Size" value={fontSize} onChange={setFontSize} options={["Small", "Medium", "Large"]} />
    </Section>
  );
}

/* ---------------- Notifications ---------------- */
function NotificationsSection() {
  const [enabled, setEnabled] = useState(true);
  const [mentionsOnly, setMentionsOnly] = useState(false);

  return (
    <Section title="Alerts" icon={<BellIcon className="h-5 w-5" />}>
      <Toggle
        label="Push Notifications"
        enabled={enabled}
        onChange={() => setEnabled((v) => !v)}
      />
      <Toggle
        label="Mentions Only"
        description="Filter broadcast messages"
        enabled={mentionsOnly}
        onChange={() => setMentionsOnly((v) => !v)}
      />
    </Section>
  );
}

/* ---------------- Help & About ---------------- */
function HelpAboutSection() {
  return (
    <Section title="System" icon={<QuestionMarkCircleIcon className="h-5 w-5" />}>
      <LinkRow label="Documentation" onClick={() => alert("Help Center")} />
      <LinkRow label="Submit Issue Ticket" onClick={() => alert("Report a problem")} />
      <LinkRow label="Send Feedback" onClick={() => alert("Send feedback")} />
      <LinkRow label="Build Version v1.0.0" onClick={() => alert("App version 1.0.0")} />
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
    <Section title="Danger Zone" icon={<TrashIcon className="h-5 w-5 text-red-600" />} borderColor="border-red-200 dark:border-red-900/30">
      <ConfirmDialog
        open={confirmOpen}
        title="IRREVERSIBLE ACTION"
        message="This will permanently obliterate your account and all associated encrypted data. Proceed?"
        confirmLabel="DELETE ACCOUNT"
        cancelLabel="ABORT"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setConfirmOpen(false)}
        loading={confirmBusy}
      />

      <div className="flex flex-col gap-4 pt-2 sm:flex-row">
        <Button variant="warn" icon={<ArrowRightOnRectangleIcon className="h-4 w-4" />} onClick={handleLogout}>
          TERMINATE SESSION
        </Button>
        <Button variant="danger" icon={<TrashIcon className="h-4 w-4" />} onClick={openDeleteConfirm}>
          DELETE ACCOUNT
        </Button>
      </div>
    </Section>
  );
}

/* ---------------- Reusable UI Components (Modernized) ---------------- */

function Section({ title, icon, children, borderColor = "border-neutral-200 dark:border-neutral-800" }) {
  return (
    <section className={`bg-white border ${borderColor} p-6 shadow-sm dark:bg-neutral-900`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
          {icon}
        </div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">{title}</h2>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">{children}</div>
    </section>
  );
}

function CopyRow({ icon, label, value, onCopy }) {
  return (
    <div className="py-4 flex items-center gap-4 group">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="font-mono text-sm text-neutral-900 truncate dark:text-white mt-1">{toStr(value)}</p>
      </div>
      <button
        onClick={onCopy}
        className="flex items-center gap-2 border border-neutral-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-white dark:hover:text-neutral-900 transition-colors"
        title="Copy"
      >
        <ClipboardIcon className="h-3 w-3" />
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
    <div className="py-4 flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
        {isEditing ? (
          <div className="mt-1 flex items-center gap-2">
            {prefix && <span className="font-mono text-sm text-neutral-400">{prefix}</span>}
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-neutral-50 border-b border-neutral-900 px-2 py-1 font-mono text-sm text-neutral-900 focus:outline-none dark:bg-neutral-800 dark:border-white dark:text-white"
              autoFocus
            />
          </div>
        ) : (
          <p className="font-mono text-sm text-neutral-900 truncate dark:text-white mt-1">
            {prefix && <span className="text-neutral-400">{prefix}</span>}
            {value}
          </p>
        )}
      </div>
      {isEditing ? (
        <div className="flex gap-2">
          <button onClick={onSave} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
            <CheckIcon className="h-5 w-5" />
          </button>
          <button onClick={onCancel} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button onClick={onToggleEdit} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
          <PencilSquareIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function Toggle({ label, description, enabled, onChange }) {
  return (
    <div className="py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-neutral-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-neutral-500 mt-1 dark:text-neutral-400">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-12 items-center border border-neutral-300 transition-colors duration-200 dark:border-neutral-600 ${enabled ? "bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white" : "bg-neutral-100 dark:bg-neutral-800"
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform bg-neutral-400 transition-transform duration-200 dark:bg-neutral-500 ${enabled ? "translate-x-7 bg-white dark:bg-neutral-900" : "translate-x-1"
            }`}
        />
      </button>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div className="py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-neutral-900 dark:text-white">{label}</p>
        <p className="text-xs text-neutral-500 mt-1 dark:text-neutral-400">Current: {value}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-white"
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
      className="group w-full py-4 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-2 px-2 transition-colors"
      onClick={onClick}
    >
      <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 dark:text-neutral-300 dark:group-hover:text-white">{label}</span>
      <ArrowUpOnSquareIcon className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white rotate-90" />
    </button>
  );
}

function Button({ children, variant = "solid", icon = null, onClick, type = "button", disabled }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const styles =
    variant === "solid"
      ? "bg-neutral-900 text-white border border-neutral-900 hover:bg-white hover:text-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white dark:border-white"
      : variant === "outline"
        ? "border border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
        : variant === "warn"
          ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-500"
          : variant === "danger"
            ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-500 dark:hover:bg-red-600 dark:hover:text-white"
            : "";

  return (
    <button type={type} className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  );
}