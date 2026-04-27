const express = require('express');
const assignmentModel = require('../models/assignment');
const orderModel = require('../models/order');

const router = express.Router();

router.get('/assignment/:imei', async (req, res) => {
  const assignment = await assignmentModel.getAssignmentByImei(req.params.imei);
  if (!assignment) {
    return res.status(404).json({ assignment: null });
  }
  return res.json({ assignment });
});

router.get('/order/:orderId', async (req, res) => {
  const order = await orderModel.getOrderById(Number(req.params.orderId));
  if (!order) {
    return res.status(404).json({ order: null });
  }
  const facilities = await orderModel.getOrderFacilities(order.id);
  return res.json({ order: { ...order, facilities } });
});

module.exports = router;

