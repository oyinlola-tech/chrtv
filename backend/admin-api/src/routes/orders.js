const express = require('express');
const { createHttpClient } = require('../../../shared/http');

const client = createHttpClient();
const router = express.Router();
const base = process.env.ASSET_SERVICE_URL || 'http://localhost:3002';

router.get('/orders', async (_req, res) => {
  const response = await client.get(`${base}/orders`);
  res.json(response.data);
});

router.post('/orders', async (req, res) => {
  const response = await client.post(`${base}/orders`, req.body);
  res.status(response.status).json(response.data);
});

router.put('/orders/:id', async (req, res) => {
  const response = await client.put(`${base}/orders/${req.params.id}`, req.body);
  res.json(response.data);
});

router.delete('/orders/:id', async (req, res) => {
  const response = await client.delete(`${base}/orders/${req.params.id}`);
  res.json(response.data);
});

router.get('/facilities', async (_req, res) => {
  const response = await client.get(`${base}/facilities`);
  res.json(response.data);
});

router.post('/facilities', async (req, res) => {
  const response = await client.post(`${base}/facilities`, req.body);
  res.status(response.status).json(response.data);
});

router.put('/facilities/:id', async (req, res) => {
  const response = await client.put(`${base}/facilities/${req.params.id}`, req.body);
  res.json(response.data);
});

router.delete('/facilities/:id', async (req, res) => {
  const response = await client.delete(`${base}/facilities/${req.params.id}`);
  res.json(response.data);
});

router.get('/assignments', async (_req, res) => {
  const response = await client.get(`${base}/assignments`);
  res.json(response.data);
});

router.post('/assignments', async (req, res) => {
  const response = await client.post(`${base}/assignments`, req.body);
  res.status(response.status).json(response.data);
});

router.put('/assignments/:id', async (req, res) => {
  const response = await client.put(`${base}/assignments/${req.params.id}`, req.body);
  res.json(response.data);
});

module.exports = router;

