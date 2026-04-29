const express = require('express');
const configModel = require('../models/config');
const throttleManager = require('../services/throttleManager');

const router = express.Router();

function validateConfigBody(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    const error = new Error('Request body must be a JSON object');
    error.status = 400;
    throw error;
  }

  if (body.active_option && !['option1', 'option2'].includes(body.active_option)) {
    const error = new Error('active_option must be option1 or option2');
    error.status = 400;
    throw error;
  }

  if (body.option1_coordinates_interval_seconds != null) {
    const interval = Number(body.option1_coordinates_interval_seconds);
    if (!Number.isInteger(interval) || interval < 300 || interval > 600) {
      const error = new Error('option1_coordinates_interval_seconds must be between 300 and 600 seconds (5 to 10 minutes)');
      error.status = 400;
      throw error;
    }
    body.option1_coordinates_interval_seconds = interval;
  }

  if (body.option1_api_base_url) {
    let parsed;
    try {
      parsed = new URL(body.option1_api_base_url);
    } catch (_error) {
      const error = new Error('option1_api_base_url must be a valid absolute URL');
      error.status = 400;
      throw error;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      const error = new Error('option1_api_base_url must use http or https');
      error.status = 400;
      throw error;
    }

    body.option1_api_base_url = parsed.origin;
  }

  if (body.option1_auth_token != null && (typeof body.option1_auth_token !== 'string' || body.option1_auth_token.length > 1024)) {
    const error = new Error('option1_auth_token must be a string up to 1024 characters');
    error.status = 400;
    throw error;
  }
}

router.get('/', async (_req, res) => {
  try {
    const config = await configModel.ensureRow();
    res.json({ config });
  } catch (error) {
    console.error('get config failed', error);
    res.status(500).json({ error: 'Failed to retrieve config' });
  }
});

router.put('/', async (req, res) => {
  try {
    validateConfigBody(req.body);
    const merged = {
      ...(await configModel.ensureRow()),
      ...req.body,
    };

    if (merged.active_option === 'option1') {
      if (typeof merged.option1_api_base_url !== 'string' || merged.option1_api_base_url.trim().length === 0) {
        const error = new Error('option1_api_base_url is required when active_option is option1');
        error.status = 400;
        throw error;
      }

      if (typeof merged.option1_auth_token !== 'string' || merged.option1_auth_token.trim().length === 0) {
        const error = new Error('option1_auth_token is required when active_option is option1');
        error.status = 400;
        throw error;
      }
    }

    const config = await configModel.updateConfig(merged);
    throttleManager.start(config.option1_coordinates_interval_seconds);
    res.json({ config });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('update config failed', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

module.exports = router;
