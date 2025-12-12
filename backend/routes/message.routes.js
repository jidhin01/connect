const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads", "chat_files");
fs.mkdirSync(uploadsDir, { recursive: true });

// File size limits (in bytes)
const FILE_LIMITS = {
  image: 5 * 1024 * 1024,  // 5MB
  video: 25 * 1024 * 1024, // 25MB
  pdf: 10 * 1024 * 1024,   // 10MB
};

// Allowed MIME types
const ALLOWED_TYPES = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "application/pdf": "pdf",
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${req.user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, videos, and PDFs are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // Max limit (video size)
});
// POST /api/messages
// body: { conversationId, text, replyTo? }
router.post("/", auth, async (req, res) => {
  try {
    const { conversationId, text, replyTo } = req.body;
    const userId = req.user.id;

    if (!conversationId)
      return res.status(400).json({ error: "conversationId is required" });
    if (!text || !text.trim())
      return res.status(400).json({ error: "text is required" });

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!convo.participants.map(String).includes(String(userId))) {
      return res
        .status(403)
        .json({ error: "Not a participant of this conversation" });
    }

    // Validate replyTo message if provided
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || String(replyMessage.conversation) !== conversationId) {
        return res.status(400).json({ error: "Invalid reply message" });
      }
    }

    const msg = await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "text",
      text: text.trim(),
      status: "sent",
      replyTo: replyTo || null,
    });

    // Update conversation lastMessage
    convo.lastMessage = msg._id;
    await convo.save();

    // Populate sender + conversation + replyTo
    const populated = await Message.findById(msg._id)
      .populate("sender", "_id username email photoUrl")
      .populate("conversation", "participants")
      .populate({
        path: "replyTo",
        select: "_id text type sender mediaUrl fileName",
        populate: { path: "sender", select: "_id username" }
      });

    // ---- 🔥 Emit message in real-time via Socket.IO ----
    const io = req.app.get("io");
    io.to(conversationId).emit("newMessage", populated);

    return res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Error creating message:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/messages/:conversationId?limit=20&before=<ISO or timestamp>
router.get("/:conversationId", auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 20, before } = req.query;
    const userId = req.user.id;

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!convo.participants.map(String).includes(String(userId))) {
      return res
        .status(403)
        .json({ error: "Not a participant of this conversation" });
    }

    const q = {
      conversation: conversationId,
      deletedFor: { $ne: userId }, // Exclude messages deleted for this user
    };
    if (before) q.createdAt = { $lt: new Date(before) };

    const msgs = await Message.find(q)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("sender", "_id username email photoUrl")
      .populate({
        path: "replyTo",
        select: "_id text type sender mediaUrl fileName deletedForEveryone",
        populate: { path: "sender", select: "_id username" }
      });

    return res.json({ messages: msgs });
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/messages/upload - Upload file message
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.id;

    if (!conversationId) {
      // Clean up uploaded file if validation fails
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "conversationId is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const convo = await Conversation.findById(conversationId);
    if (!convo) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (!convo.participants.map(String).includes(String(userId))) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "Not a participant of this conversation" });
    }

    // Determine file type from MIME
    const fileType = ALLOWED_TYPES[req.file.mimetype] || "file";

    // Validate file size per type
    const sizeLimit = FILE_LIMITS[fileType] || FILE_LIMITS.image;
    if (req.file.size > sizeLimit) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `File too large. Max size for ${fileType}: ${Math.round(sizeLimit / (1024 * 1024))}MB`,
      });
    }

    const relativeMediaPath = `/uploads/chat_files/${req.file.filename}`;

    // Create message
    const msg = await Message.create({
      conversation: conversationId,
      sender: userId,
      type: fileType,
      text: "", // No text for file messages
      mediaUrl: relativeMediaPath,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: "sent",
    });

    // Update conversation lastMessage
    convo.lastMessage = msg._id;
    await convo.save();

    // Populate sender + conversation
    const populated = await Message.findById(msg._id)
      .populate("sender", "_id username email photoUrl")
      .populate("conversation", "participants");

    // Emit message in real-time via Socket.IO
    const io = req.app.get("io");
    io.to(conversationId).emit("newMessage", populated);

    return res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Error uploading file message:", err);
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// DELETE /api/messages/:messageId/everyone - Delete for everyone
// NOTE: This route MUST be defined BEFORE /:messageId to match correctly
router.delete("/:messageId/everyone", auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const msg = await Message.findById(messageId).populate("conversation");
    if (!msg) return res.status(404).json({ error: "Message not found" });

    // Get sender ID (handle both ObjectId and populated sender)
    const senderId = msg.sender?._id ? String(msg.sender._id) : String(msg.sender);

    // Only sender can delete for everyone
    if (senderId !== String(userId)) {
      return res.status(403).json({ error: "Only sender can delete for everyone" });
    }

    // Mark as deleted for everyone
    msg.deletedForEveryone = true;
    msg.text = "";
    msg.mediaUrl = null;
    msg.fileName = null;
    await msg.save();

    // Notify all participants
    const io = req.app.get("io");
    const conversationId = msg.conversation?._id ? String(msg.conversation._id) : String(msg.conversation);
    io.to(conversationId).emit("messageDeleted", {
      messageId: String(msg._id),
      deletedForEveryone: true,
    });

    return res.json({ success: true, message: "Message deleted for everyone" });
  } catch (err) {
    console.error("❌ Error deleting message for everyone:", err.message, err.stack);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// DELETE /api/messages/:messageId - Delete for me
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const msg = await Message.findById(messageId).populate("conversation");
    if (!msg) return res.status(404).json({ error: "Message not found" });

    // Check if user is participant
    if (!msg.conversation.participants.map(String).includes(String(userId))) {
      return res.status(403).json({ error: "Not a participant" });
    }

    // Add user to deletedFor array
    if (!msg.deletedFor.includes(userId)) {
      msg.deletedFor.push(userId);
      await msg.save();
    }

    return res.json({ success: true, message: "Message deleted for you" });
  } catch (err) {
    console.error("❌ Error deleting message:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;