const express = require('express');
const { sendCommand } = require('../commandSender');

const router = express.Router();

router.post('/', (req, res) => {
  const { imei, keyword, params } = req.body || {};
  if (!imei || !keyword) {
    return res.status(400).json({ error: 'imei and keyword are required' });
  }

  const command = params ? `${keyword},${params}` : keyword;

  try {
    const formatted = sendCommand(imei, command);
    return res.json({ ok: true, formatted });
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
});

module.exports = router;

