import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeftIcon,
    FaceSmileIcon,
    PaperAirplaneIcon,
    CheckIcon,
    CheckBadgeIcon,
    PaperClipIcon,
    XMarkIcon,
    DocumentIcon,
    ArrowDownTrayIcon,
    PlayIcon,
    ArrowUturnLeftIcon,
    TrashIcon,
    EllipsisVerticalIcon,
    CpuChipIcon,
    StopIcon,
    InformationCircleIcon
} from "@heroicons/react/24/outline";
import { io } from "socket.io-client";
import ContactProfile from "./ContactProfile";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

// 👇 setup socket connection (singleton)
const socket = io(BACKEND_URL, {
    transports: ["websocket"],
    withCredentials: true,
});

// ====================================================================
// 💡 CONFIG & HELPERS
// ====================================================================
const AI_CHAT_ID = "ai-chatbot-genius-gemini";
const AI_CHAT_NAME = "SYSTEM AI";
const AI_AVATAR = "/chatbot.png";

const ALLOWED_FILE_TYPES = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf";
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const toStr = (v) => (v == null ? "" : String(v));

function getInitial(name) {
    const s = toStr(name).trim();
    return s ? s[0].toUpperCase() : "U";
}

const DELETED_USER_LABEL = "DEACTIVATED USER";

function isDeletedOrMissingUser(user) {
    if (!user) return true;
    const hasName = toStr(user.username || user.email).trim().length > 0;
    return !hasName;
}

function resolveAvatar(user) {
    if (isDeletedOrMissingUser(user)) return "/nouser.png";
    if (user.photoUrl) return `${BACKEND_URL}${user.photoUrl}`;
    const name = user.username || user.email || "U";
    const letter = getInitial(name);
    // Industrial style avatar background
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(letter)}&backgroundColor=171717&textColor=ffffff`;
}

function resolveDisplayName(user, fallback = "User") {
    if (isDeletedOrMissingUser(user)) return DELETED_USER_LABEL;
    return user.username || user.email || fallback;
}

function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapServerMsg(m, myId) {
    const mine = String(m?.sender?._id || m?.sender) === String(myId);
    const senderUser = typeof m?.sender === "object" ? m.sender : { _id: m?.sender };
    const authorName = resolveDisplayName(senderUser, "User");

    let replyTo = null;
    if (m.replyTo) {
        const replySender = typeof m.replyTo.sender === "object" ? m.replyTo.sender : { _id: m.replyTo.sender };
        replyTo = {
            id: String(m.replyTo._id),
            text: m.replyTo.deletedForEveryone ? "MESSAGE EXPUNGED" : (m.replyTo.text || ""),
            type: m.replyTo.type || "text",
            senderName: replySender?.username || "UNKNOWN",
            mediaUrl: m.replyTo.mediaUrl ? `${BACKEND_URL}${m.replyTo.mediaUrl}` : null,
            fileName: m.replyTo.fileName || null,
            isDeleted: m.replyTo.deletedForEveryone || false,
        };
    }

    return {
        id: String(m._id),
        author: {
            id: String(senderUser?._id || "unknown"),
            name: authorName,
            avatar: resolveAvatar(senderUser),
        },
        text: m.deletedForEveryone ? "" : (m.text || ""),
        type: m.type || "text",
        mediaUrl: m.deletedForEveryone ? null : (m.mediaUrl ? `${BACKEND_URL}${m.mediaUrl}` : null),
        fileName: m.fileName || null,
        fileSize: m.fileSize || null,
        time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        outgoing: mine,
        status: m.status || (mine ? "sent" : undefined),
        reactions: [],
        replyTo,
        deletedForEveryone: m.deletedForEveryone || false,
    };
}

function mapAiMsg(text, isOutgoing, myId, myName) {
    const senderId = isOutgoing ? myId : AI_CHAT_ID;
    const senderName = isOutgoing ? myName : AI_CHAT_NAME;
    const senderAvatar = isOutgoing
        ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(getInitial(myName))}&backgroundColor=171717&textColor=ffffff`
        : AI_AVATAR;

    return {
        id: `local-${Date.now()}-${Math.random()}`,
        author: {
            id: senderId,
            name: senderName,
            avatar: senderAvatar,
        },
        text: text,
        type: "text",
        mediaUrl: null,
        fileName: null,
        fileSize: null,
        time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        outgoing: isOutgoing,
        status: isOutgoing ? "sent" : "read",
        reactions: [],
    };
}

// ====================================================================
// 💡 COMPONENT
// ====================================================================
export default function ChatWindow({
    conversationId,
    conversationName,
    conversationAvatar,
    isAIChat,
    myId,
    myName,
    conversationRaw,
    onClose
}) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(isAIChat ? false : true);
    const [showProfile, setShowProfile] = useState(false);
    const listRef = useRef(null);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiRef = useRef(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const [viewingMedia, setViewingMedia] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const contextMenuRef = useRef(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const partner = useMemo(() => {
        if (isAIChat) {
            return {
                name: AI_CHAT_NAME,
                avatar: AI_AVATAR,
                status: "active",
            };
        }
        const isDeleted = toStr(conversationName).trim() === DELETED_USER_LABEL;
        const avatar = isDeleted
            ? "/nouser.png"
            : conversationAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(getInitial(conversationName))}&backgroundColor=171717&textColor=ffffff`;
        return {
            name: conversationName,
            avatar,
            status: "online",
        };
    }, [conversationName, conversationAvatar, isAIChat]);

    useEffect(() => {
        const listElement = listRef.current;
        if (listElement) {
            listElement.scrollTop = listElement.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        setMessages([]);
        setInput("");
        setErr("");
        if (!isAIChat) {
            if (conversationId) loadMessages();
        } else {
            const welcome = mapAiMsg("System initialized. Awaiting input.", false, myId, myName);
            setMessages([welcome]);
            setLoading(false);
        }
    }, [conversationId, isAIChat]);

    useEffect(() => {
        if (isAIChat || !conversationId || !myId) return;
        socket.emit("joinConversation", conversationId);

        const handleNewMessage = (m) => {
            if (m?.conversation?._id !== conversationId) return;
            const mapped = mapServerMsg(m, myId);
            setMessages((prev) => {
                const idx = prev.findIndex((msg) => msg.outgoing && msg.text === mapped.text && msg.id.startsWith("temp-"));
                if (idx !== -1) {
                    const copy = [...prev];
                    copy[idx] = mapped;
                    return copy;
                }
                const idIdx = prev.findIndex((msg) => msg.id === mapped.id);
                if (idIdx !== -1) {
                    const copy = [...prev];
                    copy[idIdx] = { ...copy[idIdx], status: mapped.status };
                    return copy;
                }
                return [...prev, mapped];
            });
        };

        const handleMessageDeleted = ({ messageId, deletedForEveryone }) => {
            if (deletedForEveryone) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === messageId
                            ? { ...msg, deletedForEveryone: true, text: "", mediaUrl: null }
                            : msg
                    )
                );
            }
        };

        socket.on("newMessage", handleNewMessage);
        socket.on("messageDeleted", handleMessageDeleted);
        return () => {
            socket.off("newMessage", handleNewMessage);
            socket.off("messageDeleted", handleMessageDeleted);
        };
    }, [conversationId, myId, isAIChat]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
                setContextMenu(null);
            }
            if (emojiRef.current && !emojiRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (filePreview) URL.revokeObjectURL(filePreview);
        };
    }, [filePreview]);

    async function loadMessages() {
        if (!conversationId) return;
        try {
            setLoading(true);
            setErr("");
            const res = await fetch(`${API_BASE}/messages/${conversationId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || "Failed to load messages");
            }
            const data = await res.json();
            const ordered = [...(data.messages || [])].reverse();
            const mapped = ordered.map((m) => mapServerMsg(m, myId));
            setMessages(mapped);
            setIsTyping(false);
        } catch (e) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            setErr(`MAX SIZE EXCEEDED: ${formatFileSize(MAX_FILE_SIZE)}`);
            return;
        }
        setSelectedFile(file);
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
            setFilePreview(URL.createObjectURL(file));
        } else {
            setFilePreview(null);
        }
        setErr("");
    }

    function cancelFileSelection() {
        setSelectedFile(null);
        if (filePreview) {
            URL.revokeObjectURL(filePreview);
            setFilePreview(null);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function uploadFile() {
        if (!selectedFile || uploading) return;
        setUploading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("conversationId", conversationId);
            const xhr = new XMLHttpRequest();
            const uploadPromise = new Promise((resolve, reject) => {
                xhr.upload.addEventListener("progress", (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                });
                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
                    else reject(new Error("Upload failed"));
                });
                xhr.addEventListener("error", () => reject(new Error("Upload failed")));
            });
            xhr.open("POST", `${API_BASE}/messages/upload`);
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            xhr.send(formData);
            await uploadPromise;
            cancelFileSelection();
        } catch (e) {
            setErr(e.message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    }

    function handleReply(message) {
        setReplyingTo(message);
        setContextMenu(null);
    }

    function handleContextMenu(e, message) {
        e.preventDefault();
        if (message.deletedForEveryone || isAIChat) return;
        setContextMenu({ x: e.clientX, y: e.clientY, message });
    }

    async function handleDeleteForMe(message) {
        setContextMenu(null);
        setDeleteConfirm({ message, type: 'me' });
    }

    async function handleDeleteForEveryone(message) {
        setContextMenu(null);
        setDeleteConfirm({ message, type: 'everyone' });
    }

    async function confirmDelete() {
        if (!deleteConfirm) return;
        const { message, type } = deleteConfirm;
        try {
            const endpoint = type === 'everyone' ? `${API_BASE}/messages/${message.id}/everyone` : `${API_BASE}/messages/${message.id}`;
            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete message');
            if (type === 'me') setMessages(prev => prev.filter(m => m.id !== message.id));
        } catch (e) {
            setErr(e.message);
        } finally {
            setDeleteConfirm(null);
        }
    }

    function getReplyPreview(replyTo) {
        if (!replyTo) return '';
        if (replyTo.isDeleted) return 'Content Deleted';
        if (replyTo.type === 'image') return '[PHOTO]';
        if (replyTo.type === 'video') return '[VIDEO]';
        if (replyTo.type === 'pdf') return '[DOCUMENT]';
        return replyTo.text?.substring(0, 50) + (replyTo.text?.length > 50 ? '...' : '') || '';
    }

    async function sendMessage() {
        if (!input.trim() || isTyping) return;
        const text = input.trim();
        setInput("");
        setShowEmojiPicker(false);

        if (isAIChat) {
            const userMsg = mapAiMsg(text, true, myId, myName);
            setMessages((prev) => [...prev, userMsg]);
            setIsTyping(true);
            try {
                const history = messages
                    .filter(m => m.text && m.text.trim().length > 0)
                    .slice(-10)
                    .map(m => ({
                        role: m.outgoing ? 'user' : 'model',
                        parts: [{ text: m.text }]
                    }));
                const currentContents = [...history, { role: 'user', parts: [{ text: text }] }];
                const res = await fetch(`${API_BASE}/chatbot/ask`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: currentContents }),
                });
                if (!res.ok) throw new Error("AI failed to respond");
                const data = await res.json();
                const aiMsg = mapAiMsg(data.reply, false, myId, myName);
                setMessages((prev) => [...prev, aiMsg]);
            } catch (e) {
                setErr(e.message);
            } finally {
                setIsTyping(false);
            }
        } else {
            try {
                const tempId = `temp-${Date.now()}`;
                const optimistic = mapServerMsg({
                    _id: tempId,
                    text,
                    sender: { _id: myId, username: myName },
                    createdAt: new Date(),
                    status: 'sent'
                }, myId);
                setMessages((prev) => [...prev, optimistic]);
                const res = await fetch(`${API_BASE}/messages`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId, text, replyTo: replyingTo?.id || null }),
                });
                if (!res.ok) throw new Error("Failed to send");
                const saved = await res.json();
                const mapped = mapServerMsg(saved, myId);
                setMessages((prev) => prev.map((m) => (m.id === tempId ? mapped : m)));
                setReplyingTo(null);
            } catch (e) {
                setErr(e.message);
            }
        }
    }

    function getFileType(file) {
        if (!file) return "file";
        if (file.type.startsWith("image/")) return "image";
        if (file.type.startsWith("video/")) return "video";
        if (file.type === "application/pdf") return "pdf";
        return "file";
    }

    return (
        <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-950 transition-colors duration-300 relative">
            {/* Profile Modal */}
            {showProfile && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 flex flex-col overflow-hidden max-h-full">
                        <div className="flex-1 overflow-y-auto">
                            <ContactProfile
                                contact={{
                                    name: partner.name,
                                    avatar: partner.avatar,
                                    _raw: conversationRaw
                                }}
                                onClose={() => setShowProfile(false)}
                                onMessage={() => setShowProfile(false)} // Already chatting
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header - Sharp, Industrial */}
            <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-200 dark:bg-neutral-900/95 dark:border-neutral-800">
                <div className="px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-neutral-900 dark:text-white" />
                            </button>
                        )}
                        <div
                            className="h-10 w-10 border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                            onClick={() => setShowProfile(true)}
                        >
                            <img
                                src={partner.avatar}
                                alt={partner.name}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div className="min-w-0 cursor-pointer" onClick={() => setShowProfile(true)}>
                            <p className="font-bold uppercase tracking-widest text-neutral-900 dark:text-white text-sm truncate hover:underline">
                                {partner.name}
                            </p>
                            <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                                {isAIChat ? <CpuChipIcon className="h-3 w-3" /> : (partner.status === "online" && <span className="w-1.5 h-1.5 bg-emerald-500" />)}
                                {isAIChat ? "SYSTEM ONLINE" : (partner.status === "online" ? "CONNECTED" : "OFFLINE")}
                            </p>
                        </div>
                    </div>

                    <button className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors">
                        <EllipsisVerticalIcon className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Message Canvas */}
            <main className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700" ref={listRef}>
                <DayDivider label={isAIChat ? "SESSION START" : "TODAY"} />

                {loading && <div className="text-xs font-mono text-neutral-400 py-4 text-center uppercase animate-pulse">Establishing Link...</div>}

                {
                    !!err && !loading && (
                        <div className="text-xs font-bold text-red-600 border border-red-200 bg-red-50 p-3 mb-4 flex justify-between dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
                            <span>ERROR: {err}</span>
                            <button onClick={() => setErr("")} className="underline decoration-red-400">DISMISS</button>
                        </div>
                    )
                }

                <ul className="space-y-6">
                    {!loading && !err && messages.map((m, idx) => {
                        const prev = messages[idx - 1];
                        const showAvatar = !m.outgoing && (!prev || prev.author.id !== m.author.id);
                        return (
                            <MessageBubble
                                key={m.id}
                                msg={m}
                                showAvatar={showAvatar}
                                onMediaClick={setViewingMedia}
                                onContextMenu={(e) => handleContextMenu(e, m)}
                                onReply={() => handleReply(m)}
                                getReplyPreview={getReplyPreview}
                            />
                        );
                    })}
                </ul>

                {
                    isTyping && (
                        <div className="mt-4 flex items-end gap-2">
                            <div className="h-8 w-8 border border-neutral-200 dark:border-neutral-700">
                                <img src={partner.avatar} className="h-full w-full object-cover" />
                            </div>
                            <TypingIndicator />
                        </div>
                    )
                }
            </main >

            {/* Overlays */}
            {
                selectedFile && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm p-4">
                        <div className="w-full max-w-sm border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Upload Artifact</h3>
                                <button onClick={cancelFileSelection} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="mb-6 flex items-center justify-center border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800">
                                {getFileType(selectedFile) === "image" && filePreview && (
                                    <img src={filePreview} className="max-h-[200px] object-contain" />
                                )}
                                {getFileType(selectedFile) === "video" && filePreview && (
                                    <video src={filePreview} controls className="max-h-[200px]" />
                                )}
                                {getFileType(selectedFile) === "pdf" && (
                                    <div className="text-center">
                                        <DocumentIcon className="h-12 w-12 text-neutral-400 mx-auto mb-2" />
                                        <p className="text-xs font-mono text-neutral-900 dark:text-white">{selectedFile.name}</p>
                                        <p className="text-[10px] font-mono text-neutral-500">{formatFileSize(selectedFile.size)}</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={uploadFile}
                                disabled={uploading}
                                className="w-full bg-neutral-900 border border-neutral-900 py-3 text-xs font-bold uppercase text-white hover:bg-white hover:text-neutral-900 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white dark:border-white transition-all"
                            >
                                {uploading ? `TRANSMITTING ${uploadProgress}%...` : "INITIATE TRANSFER"}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Viewer */}
            {
                viewingMedia && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" onClick={() => setViewingMedia(null)}>
                        <button className="absolute top-4 right-4 p-2 text-white hover:bg-white/10">
                            <XMarkIcon className="h-8 w-8" />
                        </button>
                        {viewingMedia.type === "image" && (
                            <img src={viewingMedia.url} className="max-h-full max-w-full object-contain border border-neutral-700" onClick={(e) => e.stopPropagation()} />
                        )}
                        {viewingMedia.type === "video" && (
                            <video src={viewingMedia.url} controls autoPlay className="max-h-full max-w-full border border-neutral-700" onClick={(e) => e.stopPropagation()} />
                        )}
                    </div>
                )
            }

            {/* Context Menu - Square */}
            {
                contextMenu && (
                    <div
                        ref={contextMenuRef}
                        className="fixed z-40 min-w-[180px] border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
                        style={{ left: Math.min(contextMenu.x, window.innerWidth - 180), top: Math.min(contextMenu.y, window.innerHeight - 200) }}
                    >
                        <button onClick={() => handleReply(contextMenu.message)} className="flex w-full items-center gap-3 px-4 py-3 text-xs font-bold uppercase text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                            <ArrowUturnLeftIcon className="h-4 w-4" /> REPLY
                        </button>
                        <button onClick={() => handleDeleteForMe(contextMenu.message)} className="flex w-full items-center gap-3 px-4 py-3 text-xs font-bold uppercase text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                            <TrashIcon className="h-4 w-4" /> DELETE (LOCAL)
                        </button>
                        {contextMenu.message.outgoing && (
                            <button onClick={() => handleDeleteForEveryone(contextMenu.message)} className="flex w-full items-center gap-3 px-4 py-3 text-xs font-bold uppercase text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                                <TrashIcon className="h-4 w-4" /> DELETE (GLOBAL)
                            </button>
                        )}
                    </div>
                )
            }

            {/* Footer / Input - Industrial Form */}
            <footer className="sticky bottom-0 z-20 border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                {replyingTo && (
                    <div className="mb-3 flex items-center justify-between border-l-4 border-neutral-900 bg-neutral-50 p-3 dark:border-white dark:bg-neutral-900">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase text-neutral-500">Replying To {replyingTo.outgoing ? 'Self' : replyingTo.author?.name}</p>
                            <p className="text-xs font-mono truncate text-neutral-900 dark:text-white">{getReplyPreview(replyingTo)}</p>
                        </div>
                        <button onClick={cancelReply} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"><XMarkIcon className="h-4 w-4" /></button>
                    </div>
                )}

                <div className="flex gap-2">
                    <div className="relative">
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="flex h-12 w-12 items-center justify-center border border-neutral-300 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white transition-colors">
                            <FaceSmileIcon className="h-5 w-5" />
                        </button>
                        {showEmojiPicker && (
                            <div ref={emojiRef} className="absolute bottom-14 left-0 z-50">
                                <EmojiPicker onSelect={(e) => { setInput(p => p + e); }} />
                            </div>
                        )}
                    </div>

                    {!isAIChat && (
                        <button onClick={() => fileInputRef.current?.click()} className="flex h-12 w-12 items-center justify-center border border-neutral-300 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white transition-colors">
                            <PaperClipIcon className="h-5 w-5" />
                            <input ref={fileInputRef} type="file" accept={ALLOWED_FILE_TYPES} onChange={handleFileSelect} className="hidden" />
                        </button>
                    )}

                    <div className="flex-1 border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900 focus-within:border-neutral-900 dark:focus-within:border-white transition-colors">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="ENTER MESSAGE..."
                            className="w-full bg-transparent px-4 py-3 text-sm font-mono text-neutral-900 placeholder-neutral-400 outline-none resize-none min-h-[48px] dark:text-white"
                            rows={1}
                        />
                    </div>

                    <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className="flex h-12 w-12 items-center justify-center bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 disabled:hover:bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                    >
                        <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
                    </button>
                </div>
            </footer>
        </div >
    );
}

// ------------------------------------
// Sub-Components
// ------------------------------------

function EmojiPicker({ onSelect }) {
    const emojis = ["😀", "😂", "🥰", "😎", "🤔", "😭", "👍", "👎", "👋", "🙏", "🔥", "❤️", "✅", "⚠️", "🚫", "💻", "🚀", "🤖"];
    return (
        <div className="w-64 border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="grid grid-cols-6 gap-1">
                {emojis.map((e) => (
                    <button key={e} onClick={() => onSelect(e)} className="p-2 text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">{e}</button>
                ))}
            </div>
        </div>
    );
}

function DayDivider({ label }) {
    return (
        <div className="relative py-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div></div>
            <span className="relative bg-neutral-50 px-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:bg-neutral-950 dark:text-neutral-500">{label}</span>
        </div>
    );
}

function MessageBubble({ msg, showAvatar, onMediaClick, onContextMenu, onReply, getReplyPreview }) {
    // Sharp edges, high contrast
    const outgoingStyle = "bg-neutral-900 text-white ml-auto border border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white";
    const incomingStyle = "bg-white text-neutral-900 mr-auto border border-neutral-200 dark:bg-neutral-900 dark:text-white dark:border-neutral-700";

    if (msg.deletedForEveryone) {
        return (
            <li className={`flex items-end gap-3 mb-2 ${msg.outgoing ? "justify-end" : ""}`}>
                <div className={`px-4 py-3 border border-neutral-200 bg-neutral-50 text-xs font-mono text-neutral-400 uppercase italic dark:border-neutral-800 dark:bg-neutral-900`}>
                    // MESSAGE EXPUNGED
                </div>
            </li>
        );
    }

    return (
        <li className={`flex items-start gap-4 mb-2 group ${msg.outgoing ? "justify-end" : ""}`} onContextMenu={onContextMenu}>
            {!msg.outgoing && (
                <div className="w-10 shrink-0">
                    {showAvatar && <img src={msg.author.avatar} alt="" className="h-10 w-10 border border-neutral-200 dark:border-neutral-700 object-cover" />}
                </div>
            )}

            <div className="relative max-w-[85%] sm:max-w-md">
                <button onClick={onContextMenu} className={`absolute -top-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.outgoing ? 'right-0' : 'left-0'} text-neutral-400`}>
                    <EllipsisVerticalIcon className="h-4 w-4" />
                </button>

                <div className={`p-4 shadow-sm ${msg.outgoing ? outgoingStyle : incomingStyle}`}>
                    {!msg.outgoing && showAvatar && (
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{msg.author.name}</p>
                    )}

                    {msg.replyTo && (
                        <div className={`mb-3 border-l-2 p-2 text-xs ${msg.outgoing ? 'border-neutral-500 bg-neutral-800 text-neutral-300 dark:bg-neutral-100 dark:text-neutral-600' : 'border-neutral-300 bg-neutral-50 text-neutral-500 dark:bg-neutral-800'}`}>
                            <span className="font-bold uppercase block mb-1">{msg.replyTo.senderName}</span>
                            <span className="font-mono truncate block">{getReplyPreview(msg.replyTo)}</span>
                        </div>
                    )}

                    {msg.type === "image" && (
                        <img onClick={() => onMediaClick({ type: "image", url: msg.mediaUrl })} src={msg.mediaUrl} className="mb-2 max-w-full cursor-pointer border border-neutral-500/20" />
                    )}
                    {msg.type === "video" && (
                        <div onClick={() => onMediaClick({ type: "video", url: msg.mediaUrl })} className="mb-2 relative cursor-pointer border border-neutral-500/20">
                            <video src={msg.mediaUrl} className="max-w-full" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30"><PlayIcon className="h-8 w-8 text-white" /></div>
                        </div>
                    )}
                    {msg.type === "pdf" && (
                        <a href={msg.mediaUrl} target="_blank" className={`flex items-center gap-3 border p-2 mb-2 ${msg.outgoing ? 'border-neutral-600 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                            <DocumentIcon className="h-5 w-5" />
                            <span className="text-xs font-mono underline">{msg.fileName}</span>
                        </a>
                    )}

                    {msg.type === "text" && <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.text}</p>}

                    <div className={`mt-2 flex items-center gap-2 justify-end select-none`}>
                        <span className={`text-[10px] font-mono ${msg.outgoing ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-400"}`}>{msg.time}</span>
                        {msg.outgoing && (
                            <span className={msg.status === "read" ? "text-emerald-500" : "text-neutral-500"}>
                                {msg.status === "read" ? <CheckBadgeIcon className="h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
}

function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 p-3 border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <span className="block h-1.5 w-1.5 animate-bounce bg-neutral-400"></span>
            <span className="block h-1.5 w-1.5 animate-bounce bg-neutral-400 delay-100"></span>
            <span className="block h-1.5 w-1.5 animate-bounce bg-neutral-400 delay-200"></span>
        </div>
    );
}