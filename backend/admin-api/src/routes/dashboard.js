const express = require('express');
const dataAggregator = require('../services/dataAggregator');
const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');
const asyncHandler = require('../middleware/asyncHandler');
const { validateDashboardLimit } = require('../middleware/validators');

const client = createHttpClient();
const router = express.Router();
const trackingBase = getInternalServiceUrl('TRACKING_SERVICE_URL');

router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await dataAggregator.getStats();
  res.json(stats);
}));

router.get('/positions', validateDashboardLimit, asyncHandler(async (req, res) => {
  const response = await client.get(`${trackingBase}/positions/recent`, {
    params: { limit: req.query.limit || 100 },
  });
  res.json(response.data);
}));

router.get('/events', asyncHandler(async (_req, res) => {
  const response = await client.get(`${trackingBase}/events/recent`);
  res.json(response.data);
}));

module.exports = router;
