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
const base = getInternalServiceUrl('ASSET_SERVICE_URL');

router.get('/orders', asyncHandler(async (_req, res) => {
  const response = await client.get(`${base}/orders`);
  res.json(response.data);
}));

router.post('/orders', requireJsonObjectBody, asyncHandler(async (req, res) => {
  const response = await client.post(`${base}/orders`, req.body);
  res.status(response.status).json(response.data);
}));

router.put('/orders/:id', validateNumericIdParam(), requireJsonObjectBody, asyncHandler(async (req, res) => {
  const response = await client.put(`${base}/orders/${req.params.id}`, req.body);
  res.json(response.data);
}));

router.delete('/orders/:id', validateNumericIdParam(), asyncHandler(async (req, res) => {
  const id = String(Number.parseInt(req.params.id, 10));
  const response = await client.delete(`${base}/orders/${id}`);
  res.json(response.data);
}));

router.get('/facilities', asyncHandler(async (_req, res) => {
  const response = await client.get(`${base}/facilities`);
  res.json(response.data);
}));

router.post('/facilities', requireJsonObjectBody, asyncHandler(async (req, res) => {
  const response = await client.post(`${base}/facilities`, req.body);
  res.status(response.status).json(response.data);
}));

router.put('/facilities/:id', validateNumericIdParam(), requireJsonObjectBody, asyncHandler(async (req, res) => {
  const response = await client.put(`${base}/facilities/${req.params.id}`, req.body);
  res.json(response.data);
}));

router.delete('/facilities/:id', validateNumericIdParam(), asyncHandler(async (req, res) => {
  const response = await client.delete(`${base}/facilities/${req.params.id}`);
  res.json(response.data);
}));

router.get('/assignments', asyncHandler(async (_req, res) => {
  const response = await client.get(`${base}/assignments`);
  res.json(response.data);
}));

router.post('/assignments', requireJsonObjectBody, asyncHandler(async (req, res) => {
  const response = await client.post(`${base}/assignments`, req.body);
  res.status(response.status).json(response.data);
}));

router.put('/assignments/:id', validateNumericIdParam(), requireJsonObjectBody, asyncHandler(async (req, res) => {
  const response = await client.put(`${base}/assignments/${req.params.id}`, req.body);
  res.json(response.data);
}));

module.exports = router;
