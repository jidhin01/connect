import React, { useState } from "react";
import {
    XMarkIcon,
    ChatBubbleOvalLeftIcon,
    NoSymbolIcon,
    TrashIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

function getInitial(name) {
    if (!name) return "U";
    const s = String(name).trim();
    return s ? s[0].toUpperCase() : "U";
}

// Avatar with fallback to first letter
function AvatarWithFallback({ src, alt, name, className }) {
    const [error, setError] = useState(false);
    const initial = getInitial(name);

    if (error || !src) {
        return (
            <div className={`${className} flex items-center justify-center bg-neutral-800 text-white font-bold text-2xl uppercase`}>
                {initial}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt || name}
            className={className}
            onError={() => setError(true)}
        />
    );
}

export default function ContactProfile({
    contact,
    onClose,
    onMessage,
    onBlockUser,
    onUnblockUser,
    onClearChat,
    isBlocked = false,
    conversationId
}) {
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!contact) return null;

    const myId = localStorage.getItem("userId");
    const otherUser = contact._raw?.participants?.find(
        (p) => String(p._id) !== String(myId)
    );

    const bio = otherUser?.bio || "No bio available";
    const username = otherUser?.username || "";

    const handleBlockClick = () => {
        setShowBlockConfirm(true);
    };

    const confirmBlock = async () => {
        setLoading(true);
        try {
            if (isBlocked) {
                await onUnblockUser?.();
            } else {
                await onBlockUser?.();
            }
        } finally {
            setLoading(false);
            setShowBlockConfirm(false);
        }
    };

    const handleClearClick = () => {
        setShowClearConfirm(true);
    };

    const confirmClear = async () => {
        setLoading(true);
        try {
            await onClearChat?.();
        } finally {
            setLoading(false);
            setShowClearConfirm(false);
        }
    };

    return (
        <div className="flex h-full w-full flex-col bg-neutral-50 dark:bg-neutral-950">
            <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-neutral-900 shadow-xl border-l border-neutral-200 dark:border-neutral-800">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 px-4 sm:px-6 py-4 sm:py-5 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                        Profile Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white transition-all active:bg-neutral-200 dark:active:bg-neutral-700"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col items-center px-4 sm:px-8 py-6 sm:py-10">
                        {/* Avatar */}
                        <div className="relative mb-6 group">
                            <div className="h-32 w-32 sm:h-40 sm:w-40 overflow-hidden border-4 border-white bg-neutral-100 shadow-2xl dark:border-neutral-800 dark:bg-neutral-800 transition-transform duration-500 group-hover:scale-105">
                                <AvatarWithFallback
                                    src={contact.avatar}
                                    alt={contact.name}
                                    name={contact.name}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            {/* Status Dot */}
                            <div className={`absolute bottom-2 right-2 h-5 w-5 border-2 border-white dark:border-neutral-800 ${contact.status === 'online' ? 'bg-emerald-500' :
                                contact.status === 'recent' ? 'bg-amber-500' : 'bg-neutral-400'
                                }`} title={contact.status} />

                            {/* Blocked indicator */}
                            {isBlocked && (
                                <div className="absolute -top-2 -right-2 h-8 w-8 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-800">
                                    <NoSymbolIcon className="h-4 w-4 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Name & Username */}
                        <h3 className="mb-1 text-xl sm:text-2xl font-bold uppercase tracking-tight text-neutral-900 dark:text-white text-center">
                            {contact.name}
                        </h3>
                        {username && (
                            <p className="mb-6 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                @{username}
                            </p>
                        )}

                        {/* Blocked Status Banner */}
                        {isBlocked && (
                            <div className="w-full mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-center gap-2">
                                <NoSymbolIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-xs font-bold uppercase text-red-600 dark:text-red-400">
                                    You have blocked this user
                                </span>
                            </div>
                        )}

                        {/* Bio Section */}
                        <div className="w-full mb-6 sm:mb-8 text-center">
                            <div className="relative inline-block px-6 sm:px-8 py-4 sm:py-6 bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-100 dark:border-neutral-800 rounded-lg">
                                <p className="text-sm font-serif italic text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xs mx-auto">
                                    "{bio}"
                                </p>
                            </div>
                        </div>

                        {/* Primary Action */}
                        <button
                            onClick={() => onMessage(contact)}
                            disabled={isBlocked}
                            className="group relative w-full mb-6 sm:mb-8 flex items-center justify-center gap-3 bg-neutral-900 px-6 sm:px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-neutral-900/20 hover:bg-neutral-800 hover:shadow-xl hover:-translate-y-0.5 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 dark:shadow-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 min-h-[52px] active:bg-neutral-700 dark:active:bg-neutral-200"
                        >
                            <ChatBubbleOvalLeftIcon className="h-5 w-5" />
                            <span>{isBlocked ? 'Blocked' : 'Start Private Chat'}</span>
                        </button>

                        {/* Secondary Actions */}
                        <div className="w-full space-y-2 sm:space-y-3 pt-6 sm:pt-8 border-t border-neutral-100 dark:border-neutral-800">
                            <button
                                className={`w-full flex items-center justify-between px-4 py-4 text-xs font-bold uppercase tracking-wide transition-colors rounded-md group min-h-[52px] ${isBlocked
                                        ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/10'
                                        : 'text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/10'
                                    } active:bg-red-100 dark:active:bg-red-900/20`}
                                onClick={handleBlockClick}
                            >
                                <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                                <NoSymbolIcon className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-4 py-4 text-xs font-bold uppercase tracking-wide text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors rounded-md group min-h-[52px] active:bg-neutral-100 dark:active:bg-neutral-700"
                                onClick={handleClearClick}
                            >
                                <span>Clear History</span>
                                <TrashIcon className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Block Confirmation Modal */}
            {showBlockConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`flex h-10 w-10 items-center justify-center ${isBlocked ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                {isBlocked ? (
                                    <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <NoSymbolIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
                                    {isBlocked ? 'Unblock User' : 'Block User'}
                                </h3>
                                <p className="text-[10px] font-mono text-neutral-500">
                                    {isBlocked
                                        ? 'You will be able to send and receive messages again'
                                        : 'You will no longer be able to exchange messages'
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBlockConfirm(false)}
                                disabled={loading}
                                className="flex-1 border border-neutral-300 py-3 text-xs font-bold uppercase text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors min-h-[44px] disabled:opacity-50"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={confirmBlock}
                                disabled={loading}
                                className={`flex-1 py-3 text-xs font-bold uppercase text-white transition-colors min-h-[44px] disabled:opacity-50 ${isBlocked
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {loading ? 'PROCESSING...' : (isBlocked ? 'UNBLOCK' : 'BLOCK')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Chat Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center bg-amber-100 dark:bg-amber-900/30">
                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
                                    Clear Chat History
                                </h3>
                                <p className="text-[10px] font-mono text-neutral-500">
                                    All messages will be removed from your view only
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                disabled={loading}
                                className="flex-1 border border-neutral-300 py-3 text-xs font-bold uppercase text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors min-h-[44px] disabled:opacity-50"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={confirmClear}
                                disabled={loading}
                                className="flex-1 bg-amber-600 py-3 text-xs font-bold uppercase text-white hover:bg-amber-700 transition-colors min-h-[44px] disabled:opacity-50"
                            >
                                {loading ? 'CLEARING...' : 'CLEAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
