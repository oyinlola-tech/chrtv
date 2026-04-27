const express = require('express');
const facilityModel = require('../models/facility');

const router = express.Router();

router.get('/', async (_req, res) => {
  const facilities = await facilityModel.listFacilities();
  res.json({ facilities });
});

router.post('/', async (req, res) => {
  try {
    const facility = await facilityModel.createFacility(req.body);
    res.status(201).json({ facility });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const facility = await facilityModel.updateFacility(Number(req.params.id), req.body);
    res.json({ facility });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await facilityModel.deleteFacility(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

