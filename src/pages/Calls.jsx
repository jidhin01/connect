import { useMemo, useState } from "react";
import {
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  VideoCameraIcon,
  PhoneArrowUpRightIcon,
  PhoneArrowDownLeftIcon,
  PhoneXMarkIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

const mockCalls = [
  {
    id: "cl1",
    name: "Alice Johnson",
    avatar: "https://i.pravatar.cc/80?img=1",
    type: "audio", // audio | video
    direction: "incoming", // incoming | outgoing | missed
    time: "Today, 12:15",
    duration: "06:12",
  },
  {
    id: "cl2",
    name: "Bob Williams",
    avatar: "https://i.pravatar.cc/80?img=2",
    type: "video",
    direction: "outgoing",
    time: "Today, 09:40",
    duration: "22:48",
  },
  {
    id: "cl3",
    name: "Design Squad",
    avatar: "https://i.pravatar.cc/80?img=8",
    type: "audio",
    direction: "missed",
    time: "Yesterday, 18:05",
    duration: null,
  },
  {
    id: "cl4",
    name: "Carla Gomez",
    avatar: "https://i.pravatar.cc/80?img=3",
    type: "audio",
    direction: "incoming",
    time: "Mon, 11:03",
    duration: "03:27",
  },
];

const tabs = [
  { key: "all", label: "All" },
  { key: "missed", label: "Missed" },
];

export default function Calls() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = mockCalls;
    if (activeTab === "missed") list = list.filter((c) => c.direction === "missed");
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.time.toLowerCase().includes(q)
      );
    }
    return list;
  }, [query, activeTab]);

  return (
    <div className="h-screen bg-seco  text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b rounded-3xl border-gray-200">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                alt="me"
                src="https://i.pravatar.cc/64?img=5"
                className="h-10 w-10 rounded-full ring-2 ring-indigo-100"
              />
              <div>
                <h1 className="text-lg font-semibold">Calls</h1>
                <p className="text-xs text-gray-500">History and quick dial</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <EllipsisVerticalIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Search + New call */}
          <div className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search calls"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50"
                title="New call"
              >
                <PlusIcon className="h-5 w-5 text-gray-700" />
                <span className="hidden sm:inline text-sm">New</span>
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
        {/* Section label */}
        <div className="flex items-center justify-between pt-4 pb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Recent Calls
          </span>
          <button className="text-xs text-btn hover:underline">
            Clear
          </button>
        </div>

        {/* List */}
        <ul className="space-y-2 pb-24">
          {filtered.map((c) => (
            <CallRow key={c.id} call={c} />
          ))}
          {filtered.length === 0 && <EmptyState tab={activeTab} query={query} />}
        </ul>
      </main>

      {/* Bottom padding for mobile nav if you use it */}
      <div className="h-14 md:hidden" />
    </div>
  );
}

function CallRow({ call }) {
  return (
    <li className="group bg-white border border-gray-200 rounded-2xl p-3 hover:border-indigo-200 transition">
      <div className="flex items-center gap-3">
        <img
          src={call.avatar}
          alt={call.name}
          className="h-12 w-12 rounded-full object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{call.name}</p>
            <DirectionIcon direction={call.direction} />
          </div>
          <p className="text-sm text-gray-600 truncate">
            {call.time}
            {call.duration ? ` • ${call.duration}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {call.type === "audio" ? (
            <ActionMini title="Call">
              <PhoneIcon className="h-5 w-5 text-gray-700" />
            </ActionMini>
          ) : (
            <ActionMini title="Video call">
              <VideoCameraIcon className="h-5 w-5 text-gray-700" />
            </ActionMini>
          )}
          <button
            className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 hover:bg-gray-50"
            title="Details"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Row hover actions (desktop) */}
      <div className="mt-2 hidden gap-2 group-hover:flex">
        <InlineBtn label="Audio">
          <PhoneIcon className="h-4 w-4" />
        </InlineBtn>
        <InlineBtn label="Video">
          <VideoCameraIcon className="h-4 w-4" />
        </InlineBtn>
        <InlineBtn label="More">
          <EllipsisVerticalIcon className="h-4 w-4" />
        </InlineBtn>
      </div>
    </li>
  );
}

function DirectionIcon({ direction }) {
  if (direction === "incoming") {
    return <PhoneArrowDownLeftIcon className="h-4 w-4 text-emerald-500" title="Incoming" />;
  }
  if (direction === "outgoing") {
    return <PhoneArrowUpRightIcon className="h-4 w-4 text-indigo-500" title="Outgoing" />;
  }
  if (direction === "missed") {
    return <PhoneXMarkIcon className="h-4 w-4 text-rose-500" title="Missed" />;
  }
  return null;
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

function InlineBtn({ children, label }) {
  return (
    <button className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">
      <span className="text-gray-600">{children}</span>
      <span className="text-gray-700">{label}</span>
    </button>
  );
}

function EmptyState({ tab, query }) {
  const msg =
    tab === "missed"
      ? "No missed calls. Nice!"
      : query
      ? `No calls match "${query}".`
      : "No calls yet. Start a new call to see it here.";
  return (
    <div className="text-center py-16">
      <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
        <PhoneIcon className="h-6 w-6 text-btn" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Nothing here</h3>
      <p className="text-sm text-gray-600">{msg}</p>
    </div>
  );
}
