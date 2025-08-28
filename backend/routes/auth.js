// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Helper: sign JWT
function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

// Register
// POST /api/auth/register
// body: { username, email, password }
router.post('/register', async (req, res) => {
  try {
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }

    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: String(username).trim(),
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
      user: { id: user._id, username: user.username, email: user.email },
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
