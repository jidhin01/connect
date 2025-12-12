// backend/routes/conversation.routes.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');

// Create or get a 1:1 conversation
// POST /api/conversations/one-to-one
// body: { userId }
router.post('/one-to-one', auth, async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.body.userId;

    if (!other) return res.status(400).json({ error: 'userId is required' });
    if (other === me) return res.status(400).json({ error: 'Cannot start a chat with yourself' });

    let convo = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [me, other], $size: 2 },
    });

    if (!convo) {
      convo = await Conversation.create({
        participants: [me, other],
        isGroup: false,
      });
    }

    return res.json(convo);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// List conversations for current user with participants and lastMessage populated
// GET /api/conversations
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const convos = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate({
        path: 'participants',
        select: '_id username email photoUrl',
      })
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: '_id username email photoUrl' },
      });

    return res.json({ conversations: convos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
