const express = require('express');
const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');
const asyncHandler = require('../middleware/asyncHandler');
const { requireJsonObjectBody, validateDeviceCommand } = require('../middleware/validators');

const client = createHttpClient();
const router = express.Router();
function getBase() {
  return getInternalServiceUrl('DEVICE_GATEWAY_URL');
}

router.get('/', asyncHandler(async (_req, res) => {
  const response = await client.get(`${getBase()}/devices`);
  res.json(response.data);
}));

router.post('/command', requireJsonObjectBody, validateDeviceCommand, asyncHandler(async (req, res) => {
  const response = await client.post(`${getBase()}/command`, req.body);
  res.status(response.status).json(response.data);
}));

module.exports = router;
