const express = require('express');
const throttleManager = require('../services/throttleManager');

const router = express.Router();

router.post('/', async (req, res) => {
  const { imei, lat, lng, timestamp, assignment } = req.body || {};
  if (!imei || lat == null || lng == null || !timestamp || !assignment) {
    return res.status(400).json({ error: 'imei, lat, lng, timestamp and assignment are required' });
  }

  throttleManager.upsertCoordinate({ imei, lat, lng, timestamp, assignment });
  return res.json({ queued: true });
});

module.exports = router;

