// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },

    status: { type: String, default: "" },
    bio: { type: String, default: "" },
    phone: { type: String, default: "" },
    photoUrl: { type: String, default: "" },

    showLastSeen: { type: Boolean, default: true },
    showPhoto: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
