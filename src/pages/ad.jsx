import { useState } from "react";
import {
  CameraIcon,
  PencilSquareIcon,
  EllipsisVerticalIcon,
  UserIcon,
  AtSymbolIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  QrCodeIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

export default function Profile() {
  const [name, setName] = useState("John Doe");
  const [username, setUsername] = useState("john_doe");
  const [bio, setBio] = useState("Building a modern messaging app.");
  const [status, setStatus] = useState("Available");
  const [email, setEmail] = useState("john@example.com");
  const [phone, setPhone] = useState("+1 202 555 0123");
  const [lastSeenVisible, setLastSeenVisible] = useState(true);
  const [photoVisible, setPhotoVisible] = useState(true);

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
                src="https://i.pravatar.cc/160?img=5"
                alt="Avatar"
                className="h-24 w-24 rounded-2xl object-cover"
              />
              <button
                title="Change photo"
                className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-xl p-2 shadow hover:bg-gray-50"
              >
                <CameraIcon className="h-5 w-5 text-gray-700" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none"
                />
                <CheckBadgeIcon className="h-5 w-5 text-indigo-500" title="Verified (demo)" />
              </div>
              <div className="mt-1 flex items-center gap-2 text-gray-600">
                <AtSymbolIcon className="h-4 w-4" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none text-sm"
                />
                <QrCodeIcon className="h-4 w-4 text-gray-500 ml-1" title="Share QR" />
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Add a bio"
                className="mt-3 w-full resize-none text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
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
                className="mt-0.5 text-gray-900 font-medium bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none"
              />
            </div>
            <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <PencilSquareIcon className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </section>

        {/* Contact Info */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Contact</h2>
          <div className="divide-y divide-gray-100">
            <Row
              icon={<PhoneIcon className="h-5 w-5 text-gray-600" />}
              label="Phone"
              value={phone}
              actionLabel="Edit"
              onAction={() => {}}
            />
            <Row
              icon={<EnvelopeIcon className="h-5 w-5 text-gray-600" />}
              label="Email"
              value={email}
              actionLabel="Edit"
              onAction={() => {}}
            />
            <Row
              icon={<GlobeAltIcon className="h-5 w-5 text-gray-600" />}
              label="Username link"
              value={`app.example/${username}`}
              copy
            />
          </div>
        </section>

        {/* Privacy */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Privacy</h2>
          <div className="space-y-3">
            <ToggleRow
              icon={<EyeIcon className="h-5 w-5 text-gray-600" />}
              label="Show Last Seen/Online"
              enabled={lastSeenVisible}
              onChange={() => setLastSeenVisible((v) => !v)}
            />
            <ToggleRow
              icon={<UserIcon className="h-5 w-5 text-gray-600" />}
              label="Show Profile Photo"
              enabled={photoVisible}
              onChange={() => setPhotoVisible((v) => !v)}
              onIconOff={<EyeSlashIcon className="h-5 w-5 text-gray-600" />}
            />
          </div>
        </section>

        {/* Security */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Security</h2>
          <div className="divide-y divide-gray-100">
            <Row
              icon={<DevicePhoneMobileIcon className="h-5 w-5 text-gray-600" />}
              label="Linked Devices"
              value="2 active"
              actionLabel="Manage"
              onAction={() => {}}
            />
            <Row
              icon={<LockClosedIcon className="h-5 w-5 text-gray-600" />}
              label="Two-Factor Authentication"
              value="Off"
              actionLabel="Set up"
              onAction={() => {}}
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Danger zone</h2>
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

      <div className="h-14 md:hidden" />
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
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
      {copy && (
        <button
          onClick={() => navigator.clipboard?.writeText(value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
        >
          Copy
        </button>
      )}
      {actionLabel && (
        <button
          onClick={onAction}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ToggleRow({ icon, label, enabled, onChange, onIconOff = null }) {
  return (
    <div className="py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
          {enabled ? icon : onIconOff || icon}
        </div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
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

function DangerBtn({ icon, label, variant = "warn" }) {
  const styles =
    variant === "danger"
      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
  return (
    <button
      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border ${styles}`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
