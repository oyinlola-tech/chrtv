const { createHttpClient } = require('../../shared/http');

const client = createHttpClient();

async function publish(payload) {
  const baseUrl = process.env.TRACKING_SERVICE_URL || 'http://localhost:3001';
  await client.post(`${baseUrl}/ingest`, payload);
}

module.exports = {
  publish,
};

