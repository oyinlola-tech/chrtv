const express = require('express');
const orderModel = require('../models/order');

const router = express.Router();

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateOrderBody(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }

  if (typeof body.order_number !== 'string' || body.order_number.trim().length < 2) {
    throw badRequest('order_number is required');
  }

  if (typeof body.equipment_reference !== 'string' || body.equipment_reference.trim().length < 2) {
    throw badRequest('equipment_reference is required');
  }

  if (!['EXPORT', 'IMPORT'].includes(body.transportation_phase)) {
    throw badRequest('transportation_phase must be EXPORT or IMPORT');
  }

  if (body.mode_of_transport && !['TRUCK', 'RAIL', 'BARGE', 'VESSEL'].includes(body.mode_of_transport)) {
    throw badRequest('mode_of_transport is invalid');
  }

  if (body.status && !['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(body.status)) {
    throw badRequest('status is invalid');
  }

  if (body.facility_sequence != null) {
    if (!Array.isArray(body.facility_sequence) || body.facility_sequence.some((item) => !Number.isInteger(Number(item)) || Number(item) < 1)) {
      throw badRequest('facility_sequence must be an array of positive integers');
    }
    body.facility_sequence = body.facility_sequence.map((item) => Number(item));
  }

  body.order_number = body.order_number.trim();
  body.equipment_reference = body.equipment_reference.trim();
  if (typeof body.carrier_booking_ref === 'string') {
    body.carrier_booking_ref = body.carrier_booking_ref.trim();
  }
}

router.get('/', async (_req, res) => {
  const orders = await orderModel.listOrders();
  const hydrated = await Promise.all(
    orders.map(async (order) => ({
      ...order,
      facilities: await orderModel.getOrderFacilities(order.id),
    }))
  );
  res.json({ orders: hydrated });
});

router.post('/', async (req, res) => {
  try {
    validateOrderBody(req.body);
    const order = await orderModel.createOrder(req.body);
    res.status(201).json({ order });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      throw badRequest('id must be a positive integer');
    }
    validateOrderBody(req.body);
    const order = await orderModel.updateOrder(Number(req.params.id), req.body);
    res.json({ order });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      throw badRequest('id must be a positive integer');
    }
    await orderModel.deleteOrder(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
