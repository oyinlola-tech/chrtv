const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../../../shared/db');

const router = express.Router();

router.get('/', async (_req, res) => {
  const users = await query(
    'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
  );
  res.json({ users });
});

router.post('/', async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, passwordHash, role || 'operator']
  );
  res.status(201).json({ ok: true });
});

module.exports = router;

