const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const requireRole = require('../middleware/requireRole');
const { requireJsonObjectBody, validateCreateUser } = require('../middleware/validators');
const { createUserAccount, listUsers } = require('../services/userAccounts');

const router = express.Router();

router.get('/', asyncHandler(async (_req, res) => {
  const users = await listUsers();
  res.json({ users });
}));

router.post('/', requireRole('admin'), requireJsonObjectBody, validateCreateUser, asyncHandler(async (req, res) => {
  const user = await createUserAccount(req.body);
  res.status(201).json({ ok: true, user });
}));

module.exports = router;
