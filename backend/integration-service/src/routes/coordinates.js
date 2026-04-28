const express = require('express');
const throttleManager = require('../services/throttleManager');

const router = express.Router();

router.post('/', async (req, res) => {
  const { imei, lat, lng, timestamp, assignment } = req.body || {};
  if (!imei || lat == null || lng == null || !timestamp || !assignment) {
    return res.status(400).json({ error: 'imei, lat, lng, timestamp and assignment are required' });
  }

  if (!/^\d{15,20}$/.test(String(imei))) {
    return res.status(400).json({ error: 'imei must be 15 to 20 digits' });
  }

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return res.status(400).json({ error: 'lat and lng must be numeric values' });
  }

  if (Number.isNaN(new Date(timestamp).getTime())) {
    return res.status(400).json({ error: 'timestamp must be a valid ISO date or datetime string' });
  }

  throttleManager.upsertCoordinate({ imei, lat, lng, timestamp, assignment });
  return res.json({ queued: true });
});

module.exports = router;
