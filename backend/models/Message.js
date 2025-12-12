const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'video', 'pdf', 'file'], default: 'text' },
    text: { type: String, default: '' },
    mediaUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    // Reply/Quote support
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    // Soft delete support
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Users who deleted for themselves
    deletedForEveryone: { type: Boolean, default: false }, // Delete for everyone
  },
  { timestamps: true }
);

// For text messages, require non-empty text (but skip for deleted messages)
messageSchema.pre('validate', function (next) {
  // Skip validation for deleted messages
  if (this.deletedForEveryone) {
    return next();
  }
  if (this.type === 'text' && (!this.text || this.text.trim() === '')) {
    return next(new Error('Text message must have non-empty text'));
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
