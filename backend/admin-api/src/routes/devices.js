const express = require('express');
const { createHttpClient } = require('../../../shared/http');

const client = createHttpClient();
const router = express.Router();
const base = process.env.DEVICE_GATEWAY_URL || 'http://localhost:5001';

router.get('/', async (_req, res) => {
  const response = await client.get(`${base}/devices`);
  res.json(response.data);
});

router.post('/command', async (req, res) => {
  const response = await client.post(`${base}/command`, req.body);
  res.status(response.status).json(response.data);
});

module.exports = router;
