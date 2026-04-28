const express = require('express');
const eventBuilder = require('../services/eventBuilder');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    if (!req.body.event_type || !req.body.timestamp) {
      return res.status(400).json({ error: 'event_type and timestamp are required' });
    }

    await eventBuilder.buildAndSend(req.body);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
