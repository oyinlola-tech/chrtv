const { createHttpClient } = require('../../shared/http');
const { getInternalServiceUrl } = require('../../shared/internalServices');

const client = createHttpClient();

async function publish(payload) {
  const baseUrl = getInternalServiceUrl('TRACKING_SERVICE_URL');
  await client.post(`${baseUrl}/ingest`, payload);
}

module.exports = {
  publish,
};
