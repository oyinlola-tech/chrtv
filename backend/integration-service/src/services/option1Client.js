const { createHttpClient, withRetries } = require('../../../shared/http');
const configModel = require('../models/config');
const logModel = require('../models/log');
const { buildAuthHeaders } = require('../utils/apiAuth');

const client = createHttpClient();

async function post(direction, path, payload) {
  const config = await configModel.getConfig();
  const baseUrl = config.option1_api_base_url || '';
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(config.option1_auth_token),
  };

  try {
    const response = await withRetries(() => client.post(url, payload, { headers }), 3);
    await logModel.createLog(direction, payload, response.status, response.data);
    return response.data;
  } catch (error) {
    await logModel.createLog(
      direction,
      payload,
      error.response?.status || 500,
      error.response?.data || error.message
    );
    throw error;
  }
}

async function sendCoordinates(payload) {
  const path = process.env.OPTION1_COORDINATES_PATH || '/coordinates';
  return post('coordinates', path, payload);
}

async function sendEvent(payload) {
  const path = process.env.OPTION1_EVENTS_PATH || '/events';
  return post('event', path, payload);
}

module.exports = {
  sendCoordinates,
  sendEvent,
};

