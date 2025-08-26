const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    text: { type: String, default: '' },
    mediaUrl: { type: String, default: null },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
  },
  { timestamps: true }
);

// For text messages, require non-empty text
messageSchema.pre('validate', function (next) {
  if (this.type === 'text' && (!this.text || this.text.trim() === '')) {
    return next(new Error('Text message must have non-empty text'));
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
