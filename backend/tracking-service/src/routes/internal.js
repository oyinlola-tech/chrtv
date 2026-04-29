const express = require('express');
const geofenceEngine = require('../services/geofenceEngine');

const router = express.Router();

router.post('/geofence-state/reset', async (req, res) => {
  const imei = String(req.body?.imei || '').trim();
  if (!/^\d{15,20}$/.test(imei)) {
    return res.status(400).json({ error: 'imei must be 15-20 digits' });
  }

  await geofenceEngine.resetImeiState(imei);
  return res.json({ ok: true, imei });
});

module.exports = router;
