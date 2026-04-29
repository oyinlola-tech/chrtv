const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../../../shared/db');
const { sendMail } = require('../../../shared/email');

const OTP_TTL_MINUTES = Number(process.env.PASSWORD_RESET_OTP_TTL_MINUTES );
const OTP_MAX_ATTEMPTS = Number(process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || '').trim();
}

function hasWhitespace(value) {
  for (const char of value) {
    if (char.trim() === '') {
      return true;
    }
  }

  return false;
}

function isEmailLocalPart(value) {
  return value.length > 0 && !value.includes('@') && !hasWhitespace(value);
}

function isEmailDomainPart(value) {
  if (!value || value.startsWith('.') || value.endsWith('.')) {
    return false;
  }

  const labels = value.split('.');
  if (labels.length < 2) {
    return false;
  }

  return labels.every(
    (label) => label.length > 0 && !label.includes('@') && !label.includes('.') && !hasWhitespace(label)
  );
}

function isEmail(value) {
  const normalized = normalizeEmail(value);
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0 || atIndex !== normalized.lastIndexOf('@')) {
    return false;
  }

  const localPart = normalized.slice(0, atIndex);
  const domainPart = normalized.slice(atIndex + 1);
  return isEmailLocalPart(localPart) && isEmailDomainPart(domainPart);
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function findUserByIdentifier(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();
  if (!normalizedIdentifier) {
    return null;
  }

  const rows = await query(
    isEmail(normalizedIdentifier)
      ? 'SELECT * FROM users WHERE email = ? LIMIT 1'
      : 'SELECT * FROM users WHERE username = ? LIMIT 1',
    [isEmail(normalizedIdentifier) ? normalizeEmail(normalizedIdentifier) : normalizeUsername(normalizedIdentifier)]
  );

  return rows[0] || null;
}

async function listUsers() {
  return query(
    'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
  );
}

async function createUserAccount({ username, email, password, role }) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);
  const existing = await query(
    'SELECT username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
    [normalizedUsername, normalizedEmail]
  );
  if (existing[0]) {
    const error = new Error(
      existing[0].username === normalizedUsername
        ? 'username already exists'
        : 'email already exists'
    );
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await query(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [normalizedUsername, normalizedEmail, passwordHash, role || 'operator']
  );

  return {
    username: normalizedUsername,
    email: normalizedEmail,
    role: role || 'operator',
  };
}

async function issuePasswordResetOtp(identifier) {
  await purgeExpiredOtps();
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    return { delivered: false };
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await query(
    `UPDATE password_reset_otps
     SET consumed_at = COALESCE(consumed_at, CURRENT_TIMESTAMP)
     WHERE user_id = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP()`,
    [user.id]
  );

  await query(
    `INSERT INTO password_reset_otps (user_id, otp_hash, purpose, expires_at)
     VALUES (?, ?, 'password_reset', ?)`,
    [user.id, otpHash, expiresAt]
  );

  await sendMail({
    to: user.email,
    subject: 'CH RTV password reset OTP',
    text: `Your CH RTV password reset OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #081221;">
        <h2>CH RTV Password Reset</h2>
        <p>Your one-time password is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otp}</p>
        <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>
    `,
  });

  return { delivered: true };
}

async function resetPasswordWithOtp({ email, otp, password }) {
  await purgeExpiredOtps();
  const normalizedEmail = normalizeEmail(email);
  const rows = await query(
    `SELECT pro.id, pro.otp_hash, pro.expires_at, pro.attempt_count, u.id AS user_id
     FROM password_reset_otps pro
     INNER JOIN users u ON u.id = pro.user_id
     WHERE u.email = ? AND pro.purpose = 'password_reset' AND pro.consumed_at IS NULL
     ORDER BY pro.created_at DESC
     LIMIT 1`,
    [normalizedEmail]
  );

  const record = rows[0];
  if (!record) {
    const error = new Error('Invalid or expired OTP');
    error.status = 400;
    throw error;
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await query('UPDATE password_reset_otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id]);
    const error = new Error('OTP has expired');
    error.status = 400;
    throw error;
  }

  if (hashOtp(otp) !== record.otp_hash) {
    const nextAttempts = Number(record.attempt_count || 0) + 1;
    await query(
      `UPDATE password_reset_otps
       SET attempt_count = ?,
           consumed_at = CASE WHEN ? >= ? THEN CURRENT_TIMESTAMP ELSE consumed_at END
       WHERE id = ?`,
      [nextAttempts, nextAttempts, OTP_MAX_ATTEMPTS, record.id]
    );
    const error = new Error('Invalid or expired OTP');
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, record.user_id]);
  await query('UPDATE password_reset_otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id]);
}

async function purgeExpiredOtps() {
  await query(
    `DELETE FROM password_reset_otps
     WHERE expires_at < UTC_TIMESTAMP()
        OR (consumed_at IS NOT NULL AND created_at < (UTC_TIMESTAMP() - INTERVAL 7 DAY))`
  );
}

module.exports = {
  normalizeEmail,
  isEmail,
  findUserByIdentifier,
  listUsers,
  createUserAccount,
  issuePasswordResetOtp,
  resetPasswordWithOtp,
};
