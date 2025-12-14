// routes/user.routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
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

/**
 * GET /api/users/me
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * PUT /api/users/me
 * Update profile info (username, email, etc.)
 */
router.put('/me', auth, async (req, res) => {
  try {
    const { username, email, ...otherUpdates } = req.body;

    // Ensure username/email are not already taken
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ error: 'Username already taken' });
    }
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ error: 'Email already in use' });
    }

    const updates = { ...otherUpdates };
    if (username) updates.username = username;
    if (email) updates.email = email;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * PUT /api/users/me/password
 * Change password
 */
router.put('/me/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check old password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Password change error' });
  }
});

/**
 * POST /api/users/me/photo
 * Upload profile photo
 */
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

/**
 * DELETE /api/users/me/photo
 * Remove profile photo
 */
router.delete('/me/photo', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.photoUrl) {
      const filePath = path.join(__dirname, '..', user.photoUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not delete photo file:', e.message);
        }
      }
      user.photoUrl = '';
      await user.save();
    }
    res.json({ message: 'Photo removed' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Photo remove error' });
  }
});

/**
 * DELETE /api/users/me
 * Delete account
 */
router.delete('/me', auth, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.user.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Delete account error' });
  }
});

/**
 * POST /api/users/block/:userId
 * Block a user
 */
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const userToBlock = req.params.userId;
    const me = req.user.id;

    if (userToBlock === me) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const user = await User.findById(me);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if already blocked
    if (user.blockedUsers.map(String).includes(userToBlock)) {
      return res.status(400).json({ error: 'User already blocked' });
    }

    user.blockedUsers.push(userToBlock);
    await user.save();

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Block user error' });
  }
});

/**
 * DELETE /api/users/block/:userId
 * Unblock a user
 */
router.delete('/block/:userId', auth, async (req, res) => {
  try {
    const userToUnblock = req.params.userId;
    const me = req.user.id;

    const user = await User.findById(me);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const idx = user.blockedUsers.map(String).indexOf(userToUnblock);
    if (idx === -1) {
      return res.status(400).json({ error: 'User is not blocked' });
    }

    user.blockedUsers.splice(idx, 1);
    await user.save();

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unblock user error' });
  }
});

/**
 * GET /api/users/blocked
 * Get list of blocked user IDs
 */
router.get('/blocked', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('blockedUsers');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ blockedUsers: user.blockedUsers || [] });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Get blocked users error' });
  }
});

/**
 * GET /api/users/block/status/:userId
 * Check if a specific user is blocked
 */
router.get('/block/status/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const me = req.user.id;

    const user = await User.findById(me).select('blockedUsers');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isBlocked = user.blockedUsers.map(String).includes(targetUserId);
    res.json({ isBlocked });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Check block status error' });
  }
});

module.exports = router;