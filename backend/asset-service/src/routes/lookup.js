const express = require('express');
const assignmentModel = require('../models/assignment');
const orderModel = require('../models/order');

const router = express.Router();

router.get('/assignment/:imei', async (req, res) => {
  if (!/^\d{15,20}$/.test(String(req.params.imei || ''))) {
    return res.status(400).json({ error: 'imei must be 15 to 20 digits' });
  }
  const assignment = await assignmentModel.getAssignmentByImei(req.params.imei);
  if (!assignment) {
    return res.status(404).json({ assignment: null });
  }
  return res.json({ assignment });
});

router.get('/order/:orderId', async (req, res) => {
  if (!/^\d+$/.test(String(req.params.orderId || ''))) {
    return res.status(400).json({ error: 'orderId must be a positive integer' });
  }
  const order = await orderModel.getOrderById(Number(req.params.orderId));
  if (!order) {
    return res.status(404).json({ order: null });
  }
  const facilities = await orderModel.getOrderFacilities(order.id);
  return res.json({ order: { ...order, facilities } });
});

router.post('/geofence-ack', async (req, res) => {
  const { transport_order_id: orderId, facility_id: facilityId, area_name: areaName } = req.body || {};

  if (!Number.isInteger(Number(orderId)) || Number(orderId) < 1) {
    return res.status(400).json({ error: 'transport_order_id must be a positive integer' });
  }

  if (!Number.isInteger(Number(facilityId)) || Number(facilityId) < 1) {
    return res.status(400).json({ error: 'facility_id must be a positive integer' });
  }

  if (typeof areaName !== 'string' || areaName.trim().length === 0) {
    return res.status(400).json({ error: 'area_name is required' });
  }

  await orderModel.activateGeofence(Number(orderId), Number(facilityId), areaName.trim());
  return res.json({ ok: true, acked: true });
});

module.exports = router;
