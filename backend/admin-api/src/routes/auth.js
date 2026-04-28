const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../../../shared/db');
const { getRequiredEnv } = require('../../../shared/env');
const { signUser, verifyToken } = require('../../../shared/jwt');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');
const {
  requireJsonObjectBody,
  validateCredentials,
  validateOtpRequest,
  validatePasswordReset,
  requireLoopback,
} = require('../middleware/validators');
const {
  createUserAccount,
  findUserByIdentifier,
  issuePasswordResetOtp,
  resetPasswordWithOtp,
  normalizeEmail,
} = require('../services/userAccounts');

const router = express.Router();
const authReadRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });
const bootstrapRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });
const loginRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, skipSuccessfulRequests: true });
const otpRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
const resetRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/login', loginRateLimit, requireJsonObjectBody, validateCredentials, asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const csrfToken = crypto.randomBytes(32).toString('hex');
  const token = signUser(user, csrfToken);
  return res.json({
    token,
    csrfToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
}));

router.post('/request-reset', otpRateLimit, requireJsonObjectBody, validateOtpRequest, asyncHandler(async (req, res) => {
  await issuePasswordResetOtp(req.body.identifier);
  return res.json({
    ok: true,
    message: 'If that account exists, an OTP has been sent to its email address.',
  });
}));

router.post('/reset-password', resetRateLimit, requireJsonObjectBody, validatePasswordReset, asyncHandler(async (req, res) => {
  await resetPasswordWithOtp(req.body);
  return res.json({ ok: true, message: 'Password reset successful. You can sign in now.' });
}));

router.post('/bootstrap', bootstrapRateLimit, requireLoopback, asyncHandler(async (req, res) => {
  const rows = await query('SELECT COUNT(*) AS total FROM users');
  if (rows[0].total > 0) {
    return res.status(409).json({ error: 'Bootstrap already completed' });
  }

  const username = getRequiredEnv('INITIAL_ADMIN_USERNAME');
  const email = normalizeEmail(getRequiredEnv('INITIAL_ADMIN_EMAIL'));
  const password = getRequiredEnv('INITIAL_ADMIN_PASSWORD');
  await createUserAccount({ username, email, password, role: 'admin' });

  return res.status(201).json({ ok: true, username, email });
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
