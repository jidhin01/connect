const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// POST /api/messages
// body: { conversationId, text }
router.post("/", auth, async (req, res) => {
  try {
    const { conversationId, text } = req.body;
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

    const msg = await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "text",
      text: text.trim(),
      status: "sent",
    });

    // Update conversation lastMessage
    convo.lastMessage = msg._id;
    await convo.save();

    // Populate sender + conversation
    const populated = await Message.findById(msg._id)
      .populate("sender", "_id username email")
      .populate("conversation", "participants");

    // ---- 🔥 Emit message in real-time via Socket.IO ----
    const io = req.app.get("io");  // ✅ get io here, inside route
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

    const q = { conversation: conversationId };
    if (before) q.createdAt = { $lt: new Date(before) };

    const msgs = await Message.find(q)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("sender", "_id username email");

    return res.json({ messages: msgs });
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;