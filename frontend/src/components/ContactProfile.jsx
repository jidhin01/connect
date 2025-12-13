import React from "react";
import {
    XMarkIcon,
    ChatBubbleOvalLeftIcon,
    NoSymbolIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";

export default function ContactProfile({ contact, onClose, onMessage }) {
    if (!contact) return null;

    const myId = localStorage.getItem("userId");
    const otherUser = contact._raw?.participants?.find(
        (p) => String(p._id) !== String(myId)
    );

    const bio = otherUser?.bio || "No bio available";
    const username = otherUser?.username || "";
    // If showLastSeen is false, we might mask status, but for now let's just use what we have or infer it.
    // inferStatus in Contacts.jsx does simple time diff. We can reuse that prop passed in `contact.status` or recalculate.

    return (
        <div className="flex h-full w-full flex-col bg-neutral-50 dark:bg-neutral-950">
            <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-neutral-900 shadow-xl border-l border-neutral-200 dark:border-neutral-800">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                        Profile Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white transition-all"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col items-center px-8 py-10">
                        {/* Avatar */}
                        <div className="relative mb-6 group">
                            <div className="h-40 w-40 overflow-hidden border-4 border-white bg-neutral-100 shadow-2xl dark:border-neutral-800 dark:bg-neutral-800 transition-transform duration-500 group-hover:scale-105">
                                <img
                                    src={contact.avatar}
                                    alt={contact.name}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            {/* Status Dot */}
                            <div className={`absolute bottom-2 right-2 h-5 w-5 border-2 border-white dark:border-neutral-800 ${contact.status === 'online' ? 'bg-emerald-500' :
                                    contact.status === 'recent' ? 'bg-amber-500' : 'bg-neutral-400'
                                }`} title={contact.status} />
                        </div>

                        {/* Name & Username */}
                        <h3 className="mb-1 text-2xl font-bold uppercase tracking-tight text-neutral-900 dark:text-white text-center">
                            {contact.name}
                        </h3>
                        {username && (
                            <p className="mb-6 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                @{username}
                            </p>
                        )}

                        {/* Bio Section */}
                        <div className="w-full mb-8 text-center">
                            <div className="relative inline-block px-8 py-6 bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-100 dark:border-neutral-800 rounded-lg">
                                <p className="text-sm font-serif italic text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xs mx-auto">
                                    "{bio}"
                                </p>
                            </div>
                        </div>

                        {/* Info Grid (Optional - can add more details here later) */}
                        {/* 
                        <div className="w-full grid grid-cols-2 gap-4 mb-8">
                             ... 
                        </div> 
                        */}

                        {/* Primary Action */}
                        <button
                            onClick={() => onMessage(contact)}
                            className="group relative w-full mb-8 flex items-center justify-center gap-3 bg-neutral-900 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-neutral-900/20 hover:bg-neutral-800 hover:shadow-xl hover:-translate-y-0.5 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 dark:shadow-none transition-all duration-300"
                        >
                            <ChatBubbleOvalLeftIcon className="h-5 w-5" />
                            <span>Start Private Chat</span>
                        </button>

                        {/* Secondary Actions */}
                        <div className="w-full space-y-3 pt-8 border-t border-neutral-100 dark:border-neutral-800">
                            <button
                                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-900/10 dark:hover:text-red-400 transition-colors rounded-md group"
                                onClick={() => alert("Block feature coming soon")}
                            >
                                <span>Block User</span>
                                <NoSymbolIcon className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors rounded-md group"
                                onClick={() => alert("Clear chat feature coming soon")}
                            >
                                <span>Clear History</span>
                                <TrashIcon className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
