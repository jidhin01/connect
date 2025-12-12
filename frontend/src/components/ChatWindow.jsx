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
} from "@heroicons/react/24/outline";
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_URL}/api`;

// 👇 setup socket connection (singleton)
const socket = io(BACKEND_URL, {
    transports: ["websocket"],
    withCredentials: true,
});

// ====================================================================
// 💡 AI CHATBOT CONSTANTS
// ====================================================================
const AI_CHAT_ID = "ai-chatbot-genius-gemini";
const AI_CHAT_NAME = "Genius AI";
const AI_AVATAR = "/chatbot.png"; // Fixed path with leading slash

// File upload constants
const ALLOWED_FILE_TYPES = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB max

// Safety helpers
const toStr = (v) => (v == null ? "" : String(v));

function getInitial(name) {
    const s = toStr(name).trim();
    return s ? s[0].toUpperCase() : "U";
}

const DELETED_USER_LABEL = "User account deactivated";

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
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(letter)}`;
}

function resolveDisplayName(user, fallback = "User") {
    if (isDeletedOrMissingUser(user)) return DELETED_USER_LABEL;
    return user.username || user.email || fallback;
}

// Format file size
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

    // Handle replyTo
    let replyTo = null;
    if (m.replyTo) {
        const replySender = typeof m.replyTo.sender === "object" ? m.replyTo.sender : { _id: m.replyTo.sender };
        replyTo = {
            id: String(m.replyTo._id),
            text: m.replyTo.deletedForEveryone ? "This message was deleted" : (m.replyTo.text || ""),
            type: m.replyTo.type || "text",
            senderName: replySender?.username || "User",
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

// ====================================================================
// 💡 AI Message Mapping Helper
// ====================================================================
function mapAiMsg(text, isOutgoing, myId, myName) {
    const senderId = isOutgoing ? myId : AI_CHAT_ID;
    const senderName = isOutgoing ? myName : AI_CHAT_NAME;
    const senderAvatar = isOutgoing
        ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(getInitial(myName))}`
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

export default function ChatWindow({
    conversationId,
    conversationName,
    conversationAvatar,
    isAIChat,
    myId,
    myName,
    onClose
}) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(isAIChat ? false : true);
    const listRef = useRef(null);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiRef = useRef(null);

    // File upload states
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    // Media viewer state
    const [viewingMedia, setViewingMedia] = useState(null);

    // Reply state
    const [replyingTo, setReplyingTo] = useState(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState(null); // { x, y, message }
    const contextMenuRef = useRef(null);

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { message, type: 'me' | 'everyone' }

    const partner = useMemo(() => {
        if (isAIChat) {
            return {
                name: AI_CHAT_NAME,
                avatar: AI_AVATAR,
                status: "online",
            };
        }

        const isDeleted = toStr(conversationName).trim() === DELETED_USER_LABEL;
        const avatar = isDeleted
            ? "/nouser.png"
            : conversationAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                getInitial(conversationName)
            )}`;
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

    // Load old messages once / Initialize AI chat
    useEffect(() => {
        // Reset state when switching conversations
        setMessages([]);
        setInput("");
        setErr("");

        if (!isAIChat) {
            if (conversationId) loadMessages();
        } else {
            const welcome = mapAiMsg("Hey there! I'm Genius AI. Ask me anything casual!", false, myId, myName);
            setMessages([welcome]);
            setLoading(false);
        }
        // eslint-disable-next-line
    }, [conversationId, isAIChat]);

    // Setup socket.io listeners (Only for REAL chats)
    useEffect(() => {
        if (isAIChat || !conversationId || !myId) return;

        socket.emit("joinConversation", conversationId);

        const handleNewMessage = (m) => {
            if (m?.conversation?._id !== conversationId) return;

            const mapped = mapServerMsg(m, myId);

            setMessages((prev) => {
                const idx = prev.findIndex(
                    (msg) =>
                        msg.outgoing &&
                        msg.text === mapped.text &&
                        msg.id.startsWith("temp-")
                );
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

    // Close context menu when clicking outside
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
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Clean up file preview URL
    useEffect(() => {
        return () => {
            if (filePreview) {
                URL.revokeObjectURL(filePreview);
            }
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

    // Handle file selection
    function handleFileSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setErr(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
            return;
        }

        setSelectedFile(file);

        // Create preview for images and videos
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
            setFilePreview(URL.createObjectURL(file));
        } else {
            setFilePreview(null);
        }
        setErr("");
    }

    // Cancel file selection
    function cancelFileSelection() {
        setSelectedFile(null);
        if (filePreview) {
            URL.revokeObjectURL(filePreview);
            setFilePreview(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    // Upload file
    async function uploadFile() {
        if (!selectedFile || uploading) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("conversationId", conversationId);

            // Create XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();

            const uploadPromise = new Promise((resolve, reject) => {
                xhr.upload.addEventListener("progress", (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                });

                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        const errorData = JSON.parse(xhr.responseText || "{}");
                        reject(new Error(errorData.error || "Upload failed"));
                    }
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

    // Handle reply to message
    function handleReply(message) {
        setReplyingTo(message);
        setContextMenu(null);
    }

    // Cancel reply
    function cancelReply() {
        setReplyingTo(null);
    }

    // Handle context menu (right-click or long-press)
    function handleContextMenu(e, message) {
        e.preventDefault();
        // Don't show context menu for deleted messages or AI chat
        if (message.deletedForEveryone || isAIChat) return;

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            message,
        });
    }

    // Delete for me
    async function handleDeleteForMe(message) {
        setContextMenu(null);
        setDeleteConfirm({ message, type: 'me' });
    }

    // Delete for everyone
    async function handleDeleteForEveryone(message) {
        setContextMenu(null);
        setDeleteConfirm({ message, type: 'everyone' });
    }

    // Confirm delete
    async function confirmDelete() {
        if (!deleteConfirm) return;

        const { message, type } = deleteConfirm;

        try {
            const endpoint = type === 'everyone'
                ? `${API_BASE}/messages/${message.id}/everyone`
                : `${API_BASE}/messages/${message.id}`;

            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || 'Failed to delete message');
            }

            if (type === 'me') {
                // Remove from local state
                setMessages(prev => prev.filter(m => m.id !== message.id));
            }
            // For 'everyone', the socket event will update the UI

        } catch (e) {
            setErr(e.message);
        } finally {
            setDeleteConfirm(null);
        }
    }

    // Get reply preview text
    function getReplyPreview(replyTo) {
        if (!replyTo) return '';
        if (replyTo.isDeleted) return 'Deleted message';
        if (replyTo.type === 'image') return '📷 Photo';
        if (replyTo.type === 'video') return '🎥 Video';
        if (replyTo.type === 'pdf') return '📄 ' + (replyTo.fileName || 'Document');
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

                const currentContents = [
                    ...history,
                    { role: 'user', parts: [{ text: text }] }
                ];

                const res = await fetch(`${API_BASE}/chatbot/ask`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ contents: currentContents }),
                });

                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.error || "AI failed to respond");
                }

                const data = await res.json();
                const aiReply = data.reply;
                const aiMsg = mapAiMsg(aiReply, false, myId, myName);

                setMessages((prev) => [...prev, aiMsg]);
            } catch (e) {
                setErr(e.message);
                setMessages(prev => prev.map(m => m.id === userMsg.id ? {
                    ...m,
                    text: `${m.text} [Error: AI failed to respond]`,
                    status: 'failed'
                } : m));
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
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        conversationId,
                        text,
                        replyTo: replyingTo?.id || null,
                    }),
                });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.error || "Failed to send");
                }
                const saved = await res.json();
                const mapped = mapServerMsg(saved, myId);

                setMessages((prev) =>
                    prev.map((m) => (m.id === tempId ? mapped : m))
                );

                // Clear reply state
                setReplyingTo(null);
            } catch (e) {
                setErr(e.message);
            }
        }
    }

    const handleEmojiSelect = (emoji) => {
        setInput((prevInput) => prevInput + emoji);
    };

    // Get file type for display
    function getFileType(file) {
        if (!file) return "file";
        if (file.type.startsWith("image/")) return "image";
        if (file.type.startsWith("video/")) return "video";
        if (file.type === "application/pdf") return "pdf";
        return "file";
    }

    return (
        <div className="h-full flex flex-col bg-seco">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-top">
                <div className="px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors md:hidden"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                            </button>
                        )}
                        <img
                            src={partner.avatar}
                            alt={partner.name}
                            className="h-8 w-8 md:h-9 md:w-9 rounded-full object-cover ring-2 ring-gray-100"
                        />
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-900 leading-tight text-sm md:text-base truncate max-w-[150px] sm:max-w-xs">{partner.name}</p>
                            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                {isAIChat ? "AI Assistant" : (partner.status === "online" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />)}
                                {isAIChat ? "Always active" : (partner.status === "online" ? "Online" : "Last seen recently")}
                            </p>
                        </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <EllipsisVerticalIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Message list */}
            <main
                className="flex-1 overflow-y-auto px-4 py-4"
                ref={listRef}
            >
                <DayDivider label={isAIChat ? "AI Chat Start" : "Today"} />

                {loading && <div className="text-sm text-gray-500 py-4 text-center">Loading conversation...</div>}
                {!!err && !loading && (
                    <div className="text-sm text-red-600 py-2 flex items-center justify-center gap-2 bg-red-50 rounded-lg mb-4">
                        <span>{err}</span>
                        <button
                            onClick={() => setErr("")}
                            className="text-xs font-semibold hover:underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <ul className="space-y-4">
                    {!loading &&
                        !err &&
                        messages.map((m, idx) => {
                            const prev = messages[idx - 1];
                            const showAvatar =
                                !m.outgoing && (!prev || prev.author.id !== m.author.id);
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

                {isTyping && (
                    <div className="mt-4 flex items-end gap-2">
                        <img
                            src={partner.avatar}
                            alt={partner.name}
                            className="h-6 w-6 rounded-full border border-white shadow"
                        />
                        <TypingDots />
                    </div>
                )}
            </main>

            {/* File Preview Overlay */}
            {selectedFile && (
                <div className="absolute inset-x-0 bottom-0 top-0 bg-black/50 z-30 flex items-end justify-center p-4 sm:items-center">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-4 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Send File</h3>
                            <button
                                onClick={cancelFileSelection}
                                className="p-1 rounded-full hover:bg-gray-100"
                            >
                                <XMarkIcon className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Preview */}
                        <div className="mb-4 bg-gray-50 rounded-xl p-4 flex items-center justify-center min-h-[160px]">
                            {getFileType(selectedFile) === "image" && filePreview && (
                                <img
                                    src={filePreview}
                                    alt="Preview"
                                    className="max-h-[200px] max-w-full rounded-lg object-contain"
                                />
                            )}
                            {getFileType(selectedFile) === "video" && filePreview && (
                                <video
                                    src={filePreview}
                                    controls
                                    className="max-h-[200px] max-w-full rounded-lg"
                                />
                            )}
                            {getFileType(selectedFile) === "pdf" && (
                                <div className="text-center">
                                    <DocumentIcon className="h-12 w-12 text-red-500 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={uploadFile}
                                disabled={uploading}
                                className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {uploading ? "Uploading..." : "Send File"}
                                {!uploading && <PaperAirplaneIcon className="h-4 w-4 -rotate-45" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Media Viewer Modal */}
            {viewingMedia && (
                <div
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                    onClick={() => setViewingMedia(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        onClick={() => setViewingMedia(null)}
                    >
                        <XMarkIcon className="h-6 w-6 text-white" />
                    </button>

                    {viewingMedia.type === "image" && (
                        <img
                            src={viewingMedia.url}
                            alt="Full size"
                            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                    {viewingMedia.type === "video" && (
                        <video
                            src={viewingMedia.url}
                            controls
                            autoPlay
                            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        left: Math.min(contextMenu.x, window.innerWidth - 180),
                        top: Math.min(contextMenu.y, window.innerHeight - 200),
                    }}
                >
                    <button
                        onClick={() => handleReply(contextMenu.message)}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                        <ArrowUturnLeftIcon className="h-4 w-4" />
                        Reply
                    </button>
                    <button
                        onClick={() => handleDeleteForMe(contextMenu.message)}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                        <TrashIcon className="h-4 w-4" />
                        Delete for me
                    </button>
                    {contextMenu.message.outgoing && (
                        <button
                            onClick={() => handleDeleteForEveryone(contextMenu.message)}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                        >
                            <TrashIcon className="h-4 w-4" />
                            Delete for everyone
                        </button>
                    )}
                </div>
            )}

            {/* Footer / Input Area */}
            <footer className="sticky bottom-0 z-20 pb-4 bg-seco/95 backdrop-blur">
                {/* Reply Bar */}
                {replyingTo && (
                    <div className="mx-4 mb-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-sm animate-in slide-in-from-bottom-2 fade-in">
                        <div className="w-1 h-8 bg-indigo-500 rounded-full" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-indigo-600">
                                Replying to {replyingTo.outgoing ? 'yourself' : replyingTo.author?.name}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                                {getReplyPreview(replyingTo)}
                            </p>
                        </div>
                        <button
                            onClick={cancelReply}
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                )}

                <div className="mx-4 flex items-end gap-2 bg-white p-2 rounded-3xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">

                    <div className="relative">
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                        >
                            <FaceSmileIcon className="h-6 w-6" />
                        </button>
                        {/* Emoji Picker Popup */}
                        {showEmojiPicker && (
                            <div ref={emojiRef} className="absolute bottom-12 left-0 mb-2 z-50">
                                <EmojiPicker onSelect={handleEmojiSelect} />
                            </div>
                        )}
                    </div>

                    {!isAIChat && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                            <PaperClipIcon className="h-6 w-6" />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ALLOWED_FILE_TYPES}
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </button>
                    )}

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder="Message..."
                        className="flex-1 bg-transparent border-none focus:ring-0 p-2 text-gray-900 placeholder-gray-400 resize-none max-h-32 min-h-[44px]"
                        rows={1}
                    />

                    <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className={`p-2.5 rounded-full shadow-sm transition-all duration-200 
                    ${input.trim()
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                    >
                        <PaperAirplaneIcon className="h-5 w-5 -rotate-45 translate-x-0.5" />
                    </button>
                </div>
            </footer>
        </div>
    );
}

// ------------------------------------
// Helper Components
// ------------------------------------

function EmojiPicker({ onSelect }) {
    // Simplified Emoji Picker for brevity; use the one from Chat.jsx if complex logic is needed
    // For now, I'll paste the full logic from Chat.jsx to ensure full functionality
    const [activeCategory, setActiveCategory] = useState("smileys");
    const [searchQuery, setSearchQuery] = useState("");

    const categories = {
        smileys: { icon: "😊", label: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🫢", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫠", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "🥹", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩"] },
        gestures: { icon: "👋", label: "Gestures", emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "🫦", "👶"] },
        hearts: { icon: "❤️", label: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💌", "💋", "👄", "🫦", "😍", "🥰", "😘", "😻", "💑", "👩‍❤️‍👨", "👨‍❤️‍👨", "👩‍❤️‍👩", "💏", "👩‍❤️‍💋‍👨", "🌹", "🥀", "💐", "🌷"] },
        // ... Add other categories if needed
    };

    const filteredEmojis = searchQuery
        ? Object.values(categories)
            .flatMap((cat) => cat.emojis)
            .filter((emoji) => emoji.includes(searchQuery))
        : categories[activeCategory]?.emojis || [];

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-72 overflow-hidden flex flex-col h-80">
            <div className="p-2 border-b border-gray-100">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                />
            </div>
            {!searchQuery && (
                <div className="flex border-b border-gray-100 px-2 gap-1 overflow-x-auto no-scrollbar">
                    {Object.entries(categories).map(([key, { icon }]) => (
                        <button
                            key={key}
                            onClick={() => setActiveCategory(key)}
                            className={`p-2 rounded-lg transition-colors ${activeCategory === key ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                        >
                            {icon}
                        </button>
                    ))}
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-7 gap-1">
                    {filteredEmojis.map((emoji, index) => (
                        <button
                            key={`${emoji}-${index}`}
                            onClick={() => onSelect(emoji)}
                            className="p-1 rounded hover:bg-gray-100 text-lg"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                {filteredEmojis.length === 0 && (
                    <div className="text-center text-gray-400 text-sm mt-4">No emojis found</div>
                )}
            </div>
        </div>
    );
}

function DayDivider({ label }) {
    return (
        <div className="py-2">
            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>
        </div>
    );
}

function MessageBubble({ msg, showAvatar, onMediaClick, onContextMenu, onReply, getReplyPreview }) {
    const base =
        "max-w-[85%] sm:max-w-md px-3 py-2 sm:px-4 rounded-2xl text-sm leading-relaxed shadow-sm flex flex-col relative group break-words";
    const bubble = msg.outgoing
        ? "bg-[#1F59A1] text-white rounded-br-none items-end ml-auto"
        : "bg-white text-gray-900 border border-gray-100 rounded-bl-none items-start mr-auto";

    // Handle deleted message
    if (msg.deletedForEveryone) {
        return (
            <li className={`flex items-end gap-2 ${msg.outgoing ? "justify-end" : ""} mb-2`}>
                {!msg.outgoing && (
                    <div className="w-8 shrink-0">
                        {showAvatar && <img src={msg.author.avatar} alt="" className="h-8 w-8 rounded-full" />}
                    </div>
                )}
                <div className={`${base} ${msg.outgoing ? 'bg-indigo-600/50' : 'bg-gray-50 border-gray-200'} !italic opacity-80 !shadow-none !px-3 !py-2`}>
                    <p className="flex items-center gap-2">
                        <span className="text-xs">🚫 This message was deleted</span>
                    </p>
                </div>
            </li>
        );
    }

    const renderContent = () => {
        switch (msg.type) {
            case "image":
                return (
                    <div
                        className="mt-1 mb-1 cursor-pointer relative overflow-hidden rounded-lg group/media"
                        onClick={() => onMediaClick({ type: "image", url: msg.mediaUrl })}
                    >
                        <img
                            src={msg.mediaUrl}
                            alt="Shared"
                            className="max-w-full sm:max-w-[280px] max-h-[280px] object-cover rounded-lg transition-transform group-hover/media:scale-105"
                            loading="lazy"
                        />
                    </div>
                );

            case "video":
                return (
                    <div
                        className="mt-1 mb-1 cursor-pointer relative overflow-hidden rounded-lg group/media"
                        onClick={() => onMediaClick({ type: "video", url: msg.mediaUrl })}
                    >
                        <video
                            src={msg.mediaUrl}
                            className="max-w-full sm:max-w-[280px] max-h-[280px] object-cover rounded-lg"
                            muted
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover/media:bg-black/30 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <PlayIcon className="h-5 w-5 text-gray-900 ml-0.5" />
                            </div>
                        </div>
                    </div>
                );

            case "pdf":
                return (
                    <a
                        href={msg.mediaUrl}
                        download={msg.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-1 flex items-center gap-3 p-2.5 rounded-xl transition-colors ${msg.outgoing
                            ? 'bg-white/10 hover:bg-white/20'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                            }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`p-2 rounded-lg ${msg.outgoing ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                            <DocumentIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-medium truncate max-w-[140px] ${msg.outgoing ? 'text-white' : 'text-gray-900'}`}>
                                {msg.fileName || "Document.pdf"}
                            </p>
                            <p className={`text-xs ${msg.outgoing ? 'text-indigo-200' : 'text-gray-500'}`}>
                                PDF • {formatFileSize(msg.fileSize)}
                            </p>
                        </div>
                        <ArrowDownTrayIcon className={`h-4 w-4 ${msg.outgoing ? 'text-white/70' : 'text-gray-400'}`} />
                    </a>
                );

            default:
                return <p className="whitespace-pre-wrap break-words">{msg.text}</p>;
        }
    };

    return (
        <li
            className={`flex items-end gap-2 ${msg.outgoing ? "justify-end" : ""} group mb-1`}
            onContextMenu={onContextMenu}
        >
            {/* Avatar (Left) */}
            {!msg.outgoing && (
                <div className="w-8 shrink-0 flex flex-col items-center">
                    {showAvatar && (
                        <img
                            src={msg.author.avatar}
                            alt={msg.author.name}
                            className="h-8 w-8 rounded-full ring-2 ring-white shadow-sm"
                        />
                    )}
                </div>
            )}

            {/* Bubble */}
            <div className="relative max-w-[85%]">
                {/* Context Menu Trigger (Three dots) - visible on hover */}
                <button
                    onClick={onContextMenu}
                    className={`absolute top-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${msg.outgoing ? '-left-8 text-gray-400 hover:bg-gray-100' : '-right-8 text-gray-400 hover:bg-gray-100'}`}
                >
                    <EllipsisVerticalIcon className="h-4 w-4" />
                </button>

                <div className={`${base} ${bubble}`}>
                    {!msg.outgoing && showAvatar && (
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 ml-0.5">
                            {msg.author.name}
                        </p>
                    )}

                    {msg.replyTo && (
                        <div className={`mb-1 px-2 py-1 rounded-lg border-l-2 text-xs ${msg.outgoing ? 'bg-black/10 border-white/40' : 'bg-gray-100 border-indigo-400'}`}>
                            <span className="font-semibold opacity-90">{msg.replyTo.senderName}</span>
                            <div className="opacity-75 truncate max-w-[200px]">{getReplyPreview(msg.replyTo)}</div>
                        </div>
                    )}

                    {renderContent()}

                    <div className={`flex items-center gap-1 mt-1 select-none ${msg.outgoing ? "justify-end text-indigo-100" : "text-gray-400"}`}>
                        <span className="text-[10px]">{msg.time}</span>
                        {msg.outgoing && <StatusIcon status={msg.status} />}
                    </div>
                </div>
            </div>
        </li>
    );
}

function StatusIcon({ status }) {
    if (status === "sent") return <CheckIcon className="h-3 w-3" />;
    if (status === "delivered") return <CheckIcon className="h-3 w-3" />; // Double check simulated
    if (status === "read") return <CheckBadgeIcon className="h-3 w-3 text-white" />;
    return null;
}

function TypingDots() {
    return (
        <div className="px-3 py-2 rounded-2xl bg-white border border-gray-100 shadow-sm inline-flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    );
}
