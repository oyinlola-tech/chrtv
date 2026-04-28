const express = require('express');
const { sendCommand } = require('../commandSender');

const router = express.Router();
const COMMAND_KEYWORD_RE = /^[A-Za-z0-9]{1,20}$/;
const COMMAND_PARAMS_RE = /^[A-Za-z0-9,.:+\-_/ ]{0,500}$/;

router.post('/', (req, res) => {
  const { imei, keyword, params } = req.body || {};
  if (!/^\d{15,20}$/.test(String(imei || '')) || !keyword) {
    return res.status(400).json({ error: 'imei and keyword are required' });
  }

  const normalizedKeyword = String(keyword).trim();
  const normalizedParams = params == null ? '' : String(params).trim();
  if (!COMMAND_KEYWORD_RE.test(normalizedKeyword)) {
    return res.status(400).json({ error: 'keyword contains unsupported characters' });
  }

  if (!COMMAND_PARAMS_RE.test(normalizedParams)) {
    return res.status(400).json({ error: 'params contains unsupported characters' });
  }

  const command = normalizedParams ? `${normalizedKeyword},${normalizedParams}` : normalizedKeyword;

  try {
    const formatted = sendCommand(imei, command);
    return res.json({ ok: true, formatted });
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
});

module.exports = router;
