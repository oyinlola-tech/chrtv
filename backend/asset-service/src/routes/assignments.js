const express = require('express');
const assignmentModel = require('../models/assignment');
const geofenceConfig = require('../services/geofenceConfig');

const router = express.Router();

router.get('/', async (_req, res) => {
  const assignments = await assignmentModel.listAssignments();
  res.json({ assignments });
});

router.post('/', async (req, res) => {
  try {
    const assignment = await assignmentModel.createAssignment(req.body);
    await geofenceConfig.sendToDevice(assignment.id);
    res.status(201).json({ assignment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const assignment = await assignmentModel.updateAssignment(Number(req.params.id), req.body);
    res.json({ assignment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

