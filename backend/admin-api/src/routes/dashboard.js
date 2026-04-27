const express = require('express');
const dataAggregator = require('../services/dataAggregator');
const { createHttpClient } = require('../../../shared/http');

const client = createHttpClient();
const router = express.Router();

router.get('/stats', async (_req, res) => {
  try {
    const stats = await dataAggregator.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/positions', async (req, res) => {
  const base = process.env.TRACKING_SERVICE_URL || 'http://localhost:3001';
  const response = await client.get(`${base}/positions/recent`, {
    params: { limit: req.query.limit || 100 },
  });
  res.json(response.data);
});

router.get('/events', async (_req, res) => {
  const base = process.env.TRACKING_SERVICE_URL || 'http://localhost:3001';
  const response = await client.get(`${base}/events/recent`);
  res.json(response.data);
});

module.exports = router;

