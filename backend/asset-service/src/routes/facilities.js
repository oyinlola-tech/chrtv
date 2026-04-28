const express = require('express');
const facilityModel = require('../models/facility');

const router = express.Router();

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateFacilityBody(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }

  if (typeof body.name !== 'string' || body.name.trim().length < 2) {
    throw badRequest('name is required');
  }

  if (!['DEPO', 'CLOC', 'POTE', 'RAMP'].includes(body.facility_type_code)) {
    throw badRequest('facility_type_code is invalid');
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const radius = Number(body.radius_meters ?? 500);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw badRequest('latitude must be between -90 and 90');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw badRequest('longitude must be between -180 and 180');
  }
  if (!Number.isInteger(radius) || radius < 50 || radius > 100000) {
    throw badRequest('radius_meters must be between 50 and 100000');
  }

  if (body.address_json != null && (typeof body.address_json !== 'object' || Array.isArray(body.address_json))) {
    throw badRequest('address_json must be an object when provided');
  }

  body.name = body.name.trim();
  body.location_code = typeof body.location_code === 'string' ? body.location_code.trim() : body.location_code;
  body.latitude = latitude;
  body.longitude = longitude;
  body.radius_meters = radius;
}

router.get('/', async (_req, res) => {
  const facilities = await facilityModel.listFacilities();
  res.json({ facilities });
});

router.post('/', async (req, res) => {
  try {
    validateFacilityBody(req.body);
    const facility = await facilityModel.createFacility(req.body);
    res.status(201).json({ facility });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      throw badRequest('id must be a positive integer');
    }
    validateFacilityBody(req.body);
    const facility = await facilityModel.updateFacility(Number(req.params.id), req.body);
    res.json({ facility });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      throw badRequest('id must be a positive integer');
    }
    await facilityModel.deleteFacility(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

module.exports = router;
