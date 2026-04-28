const express = require('express');
const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');
const asyncHandler = require('../middleware/asyncHandler');
const { requireJsonObjectBody, validateIntegrationConfigUpdate } = require('../middleware/validators');

const client = createHttpClient();
const router = express.Router();
function getBase() {
  return getInternalServiceUrl('INTEGRATION_SERVICE_URL');
}

router.get('/config', asyncHandler(async (_req, res) => {
  const response = await client.get(`${getBase()}/config`);
  res.json(response.data);
}));

router.put('/config', requireJsonObjectBody, validateIntegrationConfigUpdate, asyncHandler(async (req, res) => {
  const response = await client.put(`${getBase()}/config`, req.body);
  res.json(response.data);
}));

router.get('/logs', asyncHandler(async (_req, res) => {
  const response = await client.get(`${getBase()}/logs/recent`);
  res.json(response.data);
}));

module.exports = router;
