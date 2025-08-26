const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    isGroup: { type: Boolean, default: false },
    groupName: { type: String },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

// Ensure at least 2 participants
conversationSchema.path('participants').validate(function (v) {
  return Array.isArray(v) && v.length >= 2;
}, 'Conversation must have at least 2 participants');

module.exports = mongoose.model('Conversation', conversationSchema);
