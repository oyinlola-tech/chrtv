const bcrypt = require('bcryptjs');
const { query } = require('../../../shared/db');
const { getRequiredEnv } = require('../../../shared/env');

async function ensureInitialAdmin() {
  const rows = await query('SELECT COUNT(*) AS total FROM users');
  if (rows[0].total > 0) {
    return { created: false, reason: 'users-exist' };
  }

  const username = getRequiredEnv('INITIAL_ADMIN_USERNAME');
  const password = getRequiredEnv('INITIAL_ADMIN_PASSWORD');
  const passwordHash = await bcrypt.hash(password, 10);

  await query(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, passwordHash, 'admin']
  );

  return { created: true, username };
}

module.exports = {
  ensureInitialAdmin,
};

