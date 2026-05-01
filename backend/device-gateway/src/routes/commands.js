const express = require('express');
const { sendCommand, normalizeAckTimeoutMs } = require('../commandSender');

const router = express.Router();
const COMMAND_KEYWORD_RE = /^[A-Za-z0-9]{1,20}$/;
const COMMAND_PARAMS_RE = /^[A-Za-z0-9,.:+\-_/ ]{0,500}$/;

function validateCommandRequest(req) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { imei, keyword, params } = req.body;

  if (!/^\d{15,20}$/.test(String(imei || ''))) {
    return { valid: false, error: 'imei must be 15-20 digits' };
  }

  if (typeof keyword !== 'string' || !keyword) {
    return { valid: false, error: 'keyword is required' };
  }

  const normalizedKeyword = String(keyword).trim();
  if (!COMMAND_KEYWORD_RE.test(normalizedKeyword) || normalizedKeyword.length === 0) {
    return { valid: false, error: 'keyword must be 1-20 alphanumeric characters' };
  }

  if (params != null) {
    const normalizedParams = String(params).trim();
    if (!COMMAND_PARAMS_RE.test(normalizedParams)) {
      return { valid: false, error: 'params contains unsupported characters' };
    }
  }

  return { valid: true, normalizedKeyword, normalizedParams: String(params || '').trim() };
}

router.post('/', async (req, res) => {
  const validation = validateCommandRequest(req);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const { imei } = req.body;
  const command = validation.normalizedParams ? `${validation.normalizedKeyword},${validation.normalizedParams}` : validation.normalizedKeyword;

  try {
    const timeoutMs = normalizeAckTimeoutMs(req.body.timeoutMs);
    const result = await sendCommand(imei, command, {
      waitForAck: req.body.waitForAck === true,
      timeoutMs,
      ackContext: req.body.ackContext || null,
    });
    return res.json({
      ok: true,
      formatted: result.formatted,
      acked: req.body.waitForAck === true ? true : undefined,
      acknowledgement: result.acknowledgement || undefined,
    });
  } catch (error) {
    if (error.message.includes('No active socket')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.code === 'ACK_TIMEOUT') {
      return res.status(202).json({
        ok: true,
        acked: false,
        timeout: true,
        error: error.message,
      });
    }
    if (error.code === 'ACK_PENDING') {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to send command' });
  }
});

module.exports = router;
