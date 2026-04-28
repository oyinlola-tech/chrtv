const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../../../shared/db');
const { getRequiredEnv } = require('../../../shared/env');
const { signUser, verifyToken } = require('../../../shared/jwt');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');
const {
  requireJsonObjectBody,
  validateCredentials,
  requireLoopback,
} = require('../middleware/validators');

const router = express.Router();
const authReadRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });
const bootstrapRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });
const loginRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, skipSuccessfulRequests: true });

router.post('/login', loginRateLimit, requireJsonObjectBody, validateCredentials, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const users = await query('SELECT * FROM users WHERE username = ?', [username]);
  const user = users[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signUser(user);
  const csrfToken = crypto.randomBytes(32).toString('hex');
  return res.json({
    token,
    csrfToken,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
}));

router.post('/bootstrap', bootstrapRateLimit, requireLoopback, asyncHandler(async (req, res) => {
  const rows = await query('SELECT COUNT(*) AS total FROM users');
  if (rows[0].total > 0) {
    return res.status(409).json({ error: 'Bootstrap already completed' });
  }

  const username = getRequiredEnv('INITIAL_ADMIN_USERNAME');
  const password = getRequiredEnv('INITIAL_ADMIN_PASSWORD');
  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, passwordHash, 'admin']
  );

  return res.status(201).json({ ok: true, username });
}));

router.get('/me', authReadRateLimit, (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const user = verifyToken(token);
    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
