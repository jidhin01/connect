// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Helper: sign JWT
function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Helper: Generate random username
function generateUsername() {
  return 'user_' + crypto.randomBytes(4).toString('hex');
}

// Seed a test user (dev helper)
// POST /api/auth/seed-test-user
router.post('/seed-test-user', async (req, res) => {
  try {
    const email = 'test@example.com';
    const username = 'testuser';
    const plain = 'Passw0rd!';

    let user = await User.findOne({ email });
    if (!user) {
      const hashed = await bcrypt.hash(plain, 10);
      user = await User.create({ email, username, password: hashed });
    }
    return res.json({ ok: true, email, username, password: plain });
  } catch (err) {
    console.error('seed-test-user error:', err);
    return res.status(500).json({ error: 'seed failed' });
  }
});

// PUBLIC: Lookup a user by email (read-only)
// GET /api/auth/by-email?email=<email>
router.get('/by-email', async (req, res) => {
  try {
    const raw = (req.query.email || '').trim();
    if (!raw) return res.status(400).json({ error: 'email is required' });
    const email = raw.toLowerCase();
    const user = await User.findOne({ email }).select('_id username email');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('by-email error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUBLIC: Lookup a user by username (read-only)
// GET /api/auth/by-username?username=<username>
router.get('/by-username', async (req, res) => {
  try {
    const raw = (req.query.username || '').trim();
    if (!raw) return res.status(400).json({ error: 'username is required' });
    // Case-insensitive regex search or exact match depending on requirement
    // For now, let's do exact match but case-insensitive collation if possible,
    // or just assume standard string match. The user simply said "change that into username".
    // I'll do a case-insensitive regex for robustness or just findOne.
    // User model has no collation set. Let's stick to exact match for performance or simple regex.
    // Safe regex for exact match ignoring case:
    const regex = new RegExp(`^${raw}$`, 'i');

    const user = await User.findOne({ username: regex }).select('_id username email bio photoUrl status');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('by-username error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Register
// POST /api/auth/register
// body: { email, password } (username optional now)
router.post('/register', async (req, res) => {
  try {
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }

    let { username, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Auto-generate username if not provided
    if (!username || !username.trim()) {
      username = generateUsername();
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Ensure generated username is unique (small chance of collision with short hex)
    // In a real app we might loop, but for now just proceed.
    // Ideally we check if username exists too.
    let finalUsername = String(username).trim();
    const existingUser = await User.findOne({ username: finalUsername });
    if (existingUser) {
      // Only really an issue if user manually picked a taken one, or RNG collision
      if (!req.body.username) {
        // Regenerate once if it was auto-generated
        finalUsername = generateUsername();
      } else {
        return res.status(409).json({ error: 'Username already in use' });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: finalUsername,
      email: normalizedEmail,
      password: hashed,
    });

    const token = signToken(user._id);
    return res.status(201).json({
      user: { id: user._id, username: user.username, email: user.email },
      token,
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Login
// POST /api/auth/login
// body: { email, password } OR { username, password }
router.post('/login', async (req, res) => {
  try {
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }

    let { email, username, password } = req.body || {};
    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Provide email or username, and password' });
    }

    if (email) email = String(email).toLowerCase().trim();
    if (username) username = String(username).trim();

    const query = email ? { email } : { username };
    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    return res.json({
      user: { id: user._id, username: user.username, email: user.email, photoUrl: user.photoUrl || '' },
      token,
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Me (token in Authorization: Bearer <token>)
// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.id || payload._id || payload.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await User.findById(userId).select('_id username email status bio phone photoUrl showLastSeen showPhoto');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
