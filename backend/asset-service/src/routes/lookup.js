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
  return res.json({
    ok: true,
    acked: false,
    ignored: true,
    reason: '121 acknowledgements are no longer used for geofence provisioning',
  });
});

module.exports = router;
