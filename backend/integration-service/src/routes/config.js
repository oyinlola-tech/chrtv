const express = require('express');
const configModel = require('../models/config');
const throttleManager = require('../services/throttleManager');

const router = express.Router();

router.get('/', async (_req, res) => {
  const config = await configModel.ensureRow();
  res.json({ config });
});

router.put('/', async (req, res) => {
  const merged = {
    ...(await configModel.ensureRow()),
    ...req.body,
  };
  const config = await configModel.updateConfig(merged);
  throttleManager.start(config.option1_coordinates_interval_seconds);
  res.json({ config });
});

module.exports = router;

