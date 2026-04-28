const express = require('express');
const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');
const asyncHandler = require('../middleware/asyncHandler');
const {
  requireJsonObjectBody,
  validateNumericIdParam,
} = require('../middleware/validators');

const client = createHttpClient();
const router = express.Router();
function getBase() {
  return getInternalServiceUrl('ASSET_SERVICE_URL');
}

router.get('/orders', asyncHandler(async (_req, res) => {
  const response = await client.get(`${getBase()}/orders`);
  res.json(response.data);
}));

router.post('/orders', requireJsonObjectBody, asyncHandler(async (req, res) => {
  const response = await client.post(`${getBase()}/orders`, req.body);
  res.status(response.status).json(response.data);
}));

router.put('/orders/:id', validateNumericIdParam(), requireJsonObjectBody, asyncHandler(async (req, res) => {
  const id = String(Number.parseInt(req.params.id, 10));
  const response = await client.put(`${getBase()}/orders/${id}`, req.body);
  res.json(response.data);
}));

router.delete('/orders/:id', validateNumericIdParam(), asyncHandler(async (req, res) => {
  const id = String(Number.parseInt(req.params.id, 10));
  const response = await client.delete(`${getBase()}/orders/${id}`);
  res.json(response.data);
}));

router.get('/facilities', asyncHandler(async (_req, res) => {
  const response = await client.get(`${getBase()}/facilities`);
  res.json(response.data);
}));

router.post('/facilities', requireJsonObjectBody, asyncHandler(async (req, res) => {
  const response = await client.post(`${getBase()}/facilities`, req.body);
  res.status(response.status).json(response.data);
}));

router.put('/facilities/:id', validateNumericIdParam(), requireJsonObjectBody, asyncHandler(async (req, res) => {
  const id = String(Number.parseInt(req.params.id, 10));
  const response = await client.put(`${getBase()}/facilities/${id}`, req.body);
  res.json(response.data);
}));

router.delete('/facilities/:id', validateNumericIdParam(), asyncHandler(async (req, res) => {
  const id = String(Number.parseInt(req.params.id, 10));
  const response = await client.delete(`${getBase()}/facilities/${id}`);
  res.json(response.data);
}));

router.get('/assignments', asyncHandler(async (_req, res) => {
  const response = await client.get(`${getBase()}/assignments`);
  res.json(response.data);
}));

router.post('/assignments', requireJsonObjectBody, asyncHandler(async (req, res) => {
  const response = await client.post(`${getBase()}/assignments`, req.body);
  res.status(response.status).json(response.data);
}));

router.put('/assignments/:id', validateNumericIdParam(), requireJsonObjectBody, asyncHandler(async (req, res) => {
  const id = String(Number.parseInt(req.params.id, 10));
  const response = await client.put(`${getBase()}/assignments/${id}`, req.body);
  res.json(response.data);
}));

router.delete('/assignments/:id', validateNumericIdParam(), asyncHandler(async (req, res) => {
  const id = String(Number.parseInt(req.params.id, 10));
  const response = await client.delete(`${getBase()}/assignments/${id}`);
  res.json(response.data);
}));

module.exports = router;
