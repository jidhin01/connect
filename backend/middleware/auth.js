// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id || payload._id || payload.sub };
    if (!req.user.id) return res.status(401).json({ error: 'Invalid token payload' });
    next();
  } catch (err) {
    console.error('❌ Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
