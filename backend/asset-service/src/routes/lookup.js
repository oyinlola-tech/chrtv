const express = require('express');
const assignmentModel = require('../models/assignment');
const orderModel = require('../models/order');
const geofenceAckRegistry = require('../services/geofenceAckRegistry');

const router = express.Router();

function resolveAreaName(pending) {
  if (pending?.area_name) {
    return pending.area_name;
  }

  return `area${String(pending.sequence_order || 1).padStart(2, '0')}`;
}

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
  const { imei, keyword } = req.body || {};

  if (!/^\d{15,20}$/.test(String(imei || ''))) {
    return res.status(400).json({ error: 'imei must be 15 to 20 digits' });
  }

  if (String(keyword || '') !== '121') {
    return res.status(400).json({ error: 'keyword must be 121' });
  }

  const normalizedImei = String(imei);
  const pending = geofenceAckRegistry.acknowledge(normalizedImei)
    || await orderModel.findNextPendingGeofenceForImei(normalizedImei);
  if (!pending) {
    return res.json({ ok: true, acked: false, reason: 'no_pending_geofence' });
  }

  const areaName = resolveAreaName(pending);

  await orderModel.activateGeofence(
    pending.transport_order_id,
    pending.facility_id,
    areaName
  );
  geofenceAckRegistry.remove(
    normalizedImei,
    (item) => item.transport_order_id === pending.transport_order_id
      && item.facility_id === pending.facility_id
  );

  return res.json({ ok: true, acked: true, area_name: areaName });
});

module.exports = router;
