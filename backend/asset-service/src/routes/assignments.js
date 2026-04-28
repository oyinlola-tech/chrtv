const express = require('express');
const assignmentModel = require('../models/assignment');
const geofenceConfig = require('../services/geofenceConfig');

const router = express.Router();

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateAssignmentBody(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }

  if (!Number.isInteger(Number(body.transport_order_id)) || Number(body.transport_order_id) < 1) {
    throw badRequest('transport_order_id must be a positive integer');
  }

  if (!/^\d{15,20}$/.test(String(body.imei || ''))) {
    throw badRequest('imei must be 15 to 20 digits');
  }

  if (typeof body.originator_name !== 'string' || body.originator_name.trim().length < 2) {
    throw badRequest('originator_name is required');
  }

  body.transport_order_id = Number(body.transport_order_id);
  body.imei = String(body.imei).trim();
  body.originator_name = body.originator_name.trim();
  body.partner_name = typeof body.partner_name === 'string' ? body.partner_name.trim() : body.partner_name;
  body.license_plate = typeof body.license_plate === 'string' ? body.license_plate.trim() : body.license_plate;
}

router.get('/', async (_req, res) => {
  const assignments = await assignmentModel.listAssignments();
  res.json({ assignments });
});

router.post('/', async (req, res) => {
  try {
    validateAssignmentBody(req.body);
    const assignment = await assignmentModel.createAssignment(req.body);
    const provisioning = await geofenceConfig.sendToDevice(assignment.id);
    res.status(201).json({ assignment, provisioning });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      throw badRequest('id must be a positive integer');
    }
    validateAssignmentBody(req.body);
    const assignment = await assignmentModel.updateAssignment(Number(req.params.id), req.body);
    res.json({ assignment });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
