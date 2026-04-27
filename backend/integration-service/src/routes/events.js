const express = require('express');
const eventBuilder = require('../services/eventBuilder');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    await eventBuilder.buildAndSend(req.body);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

