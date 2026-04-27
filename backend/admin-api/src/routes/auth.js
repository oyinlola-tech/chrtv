const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../../../shared/db');
const { signUser, verifyToken } = require('../../../shared/jwt');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

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
  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
});

router.post('/bootstrap', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const rows = await query('SELECT COUNT(*) AS total FROM users');
  if (rows[0].total > 0) {
    return res.status(409).json({ error: 'Bootstrap already completed' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, passwordHash, 'admin']
  );

  return res.status(201).json({ ok: true });
});

router.get('/me', (req, res) => {
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
