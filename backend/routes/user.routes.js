// routes/user.routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profile_photos');
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// GET /api/users/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// PUT /api/users/me
router.put('/me', auth, async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/users/me/photo
router.post('/me/photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const relativePhotoPath = `/uploads/profile_photos/${req.file.filename}`;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.photoUrl = relativePhotoPath;
    await user.save();
    res.json({ message: 'Photo uploaded', photoUrl: relativePhotoPath });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Photo upload error' });
  }
});

// DELETE /api/users/me/photo
router.delete('/me/photo', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.photoUrl) {
      const filePath = path.join(__dirname, '..', user.photoUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not delete photo file:', e.message); }
      }
      user.photoUrl = '';
      await user.save();
    }
    res.json({ message: 'Photo removed' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Photo remove error' });
  }
});

// DELETE /api/users/me
router.delete('/me', auth, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.user.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Delete account error' });
  }
});

module.exports = router;
