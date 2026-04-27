const express = require('express');
const orderModel = require('../models/order');

const router = express.Router();

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
    const order = await orderModel.createOrder(req.body);
    res.status(201).json({ order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const order = await orderModel.updateOrder(Number(req.params.id), req.body);
    res.json({ order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await orderModel.deleteOrder(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

