const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*', // safer in production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Import route modules (each must export an Express router)
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversation.routes');
const messageRoutes = require('./routes/message.routes');
const userRoutes = require('./routes/user.routes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Health check for Render (shows backend is alive)
app.get('/', (req, res) => {
  res.send('✅ Backend is running on Render');
});

// Optional protected ping for debugging tokens
const auth = require('./middleware/auth');
app.get('/api/ping', auth, (req, res) => res.json({ ok: true, userId: req.user.id }));

// Start server after DB connects
const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Backend running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });