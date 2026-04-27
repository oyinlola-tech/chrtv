const express = require('express');
const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');
const asyncHandler = require('../middleware/asyncHandler');
const { requireJsonObjectBody, validateIntegrationConfigUpdate } = require('../middleware/validators');

const client = createHttpClient();
const router = express.Router();
const base = getInternalServiceUrl('INTEGRATION_SERVICE_URL');

router.get('/config', asyncHandler(async (_req, res) => {
  const response = await client.get(`${base}/config`);
  res.json(response.data);
}));

router.put('/config', requireJsonObjectBody, validateIntegrationConfigUpdate, asyncHandler(async (req, res) => {
  const response = await client.put(`${base}/config`, req.body);
  res.json(response.data);
}));

router.get('/logs', asyncHandler(async (_req, res) => {
  const response = await client.get(`${base}/logs/recent`);
  res.json(response.data);
}));

module.exports = router;
