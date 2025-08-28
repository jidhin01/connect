import { useState, useEffect } from "react";
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
} from "@heroicons/react/24/outline";

export default function Settings() {
  return (
    <div className="min-h-screen bg-seco text-gray-900">
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
        <AccountSection />
        <PrivacySecuritySection />
        <ChatsSection />
        <NotificationsSection />
        <HelpAboutSection />
        <DangerZone />
      </main>

      <div className="h-14 md:hidden" />
    </div>
  );
}

/* ---------------- Account ---------------- */
function AccountSection() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // fetch user
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
        if (!res.ok) throw new Error("Failed to load user");
        const data = await res.json();
        const user = data.user;
        setEmail(user.email || "");
        setUsername(user.username || "");
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [token]);

  const handleSaveAccount = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/auth/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, username }),
      });
      if (!res.ok) throw new Error("Failed to update account");
      alert("Account updated successfully!");
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading)
    return <Section title="Account">Loading user details...</Section>;
  if (err) return <Section title="Account">Error: {err}</Section>;

  return (
    <Section title="Account" icon={<KeyIcon className="h-5 w-5 text-gray-700" />}>
      <Field
        label="Email"
        value={email}
        onChange={setEmail}
       
      />
      <Field
        label="Username"
        value={username}
        onChange={setUsername}
        prefix="@"
        icon={<GlobeAltIcon className="h-5 w-5 text-gray-600" />}
        onEdit={handleSaveAccount}
      />
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          onClick={() => alert("Change password clicked")}
        >
          Change password
        </Button>
      </div>
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
    <Section
      title="Privacy & Security"
      icon={<ShieldCheckIcon className="h-5 w-5 text-gray-700" />}
    >
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
    <Section
      title="Chats"
      icon={<PaintBrushIcon className="h-5 w-5 text-gray-700" />}
    >
      <SelectRow
        label="Theme"
        value={theme}
        onChange={setTheme}
        options={["System", "Light", "Dark"]}
      />
      <SelectRow
        label="Font size"
        value={fontSize}
        onChange={setFontSize}
        options={["Small", "Medium", "Large"]}
      />
    </Section>
  );
}

/* ---------------- Notifications ---------------- */
function NotificationsSection() {
  const [enabled, setEnabled] = useState(true);
  const [mentionsOnly, setMentionsOnly] = useState(false);

  return (
    <Section
      title="Notifications"
      icon={<BellIcon className="h-5 w-5 text-gray-700" />}
    >
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
    <Section
      title="Help & About"
      icon={<QuestionMarkCircleIcon className="h-5 w-5 text-gray-700" />}
    >
      <LinkRow label="Help center" onClick={() => alert("Help Center")} />
      <LinkRow label="Report a problem" onClick={() => alert("Report a problem")} />
      <LinkRow label="Send feedback" onClick={() => alert("Send feedback")} />
      <LinkRow label="About • v1.0.0" onClick={() => alert("App version 1.0.0")} />
    </Section>
  );
}

/* ---------------- Danger Zone ---------------- */
function DangerZone() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch("http://localhost:4000/api/auth/delete", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to delete account");
      localStorage.removeItem("token");
      navigate("/");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <Section
      title="Danger zone"
      icon={<TrashIcon className="h-5 w-5 text-rose-600" />}
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="warn"
          icon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
          onClick={handleLogout}
        >
          Log out
        </Button>
        <Button
          variant="danger"
          icon={<TrashIcon className="h-5 w-5" />}
          onClick={handleDeleteAccount}
        >
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

function Field({ label, value, onChange, icon, prefix, onEdit }) {
  return (
    <div className="py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none text-sm font-medium text-gray-900"
          />
        </div>
      </div>
      <button
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
        onClick={onEdit}
      >
        Edit
      </button>
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
          {description && (
            <p className="text-xs text-gray-600 mt-0.5">{description}</p>
          )}
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