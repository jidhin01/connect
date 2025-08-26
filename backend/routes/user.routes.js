// backend/routes/user.routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// SET UP MULTER STORAGE
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile_photos/');
  },
  
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.user.id + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// PUT /api/users/me -- update profile (status, username, bio, etc.)
router.put('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, bio, status, showLastSeen, showPhoto, phone, photoUrl } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (typeof username !== 'undefined') user.username = username;
    if (typeof bio !== 'undefined') user.bio = bio;
    if (typeof status !== 'undefined') user.status = status;
    if (typeof showLastSeen !== 'undefined') user.showLastSeen = showLastSeen;
    if (typeof showPhoto !== 'undefined') user.showPhoto = showPhoto;
    if (typeof phone !== 'undefined') user.phone = phone;
    if (typeof photoUrl !== 'undefined') user.photoUrl = photoUrl;

    await user.save();
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/users/me/photo -- upload photo, update user.photoUrl
router.post('/me/photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const photoPath = `/uploads/profile_photos/${req.file.filename}`;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.photoUrl = photoPath;
    await user.save();

    res.json({ message: 'Photo uploaded', photoUrl: photoPath });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Photo upload error' });
  }
});

module.exports = router;
