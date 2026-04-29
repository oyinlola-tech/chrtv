const { createHttpClient } = require('../../shared/http');
const { getInternalServiceUrl } = require('../../shared/internalServices');

const client = createHttpClient();

async function publish(payload) {
  if (payload?.type === 'ack' && payload?.data?.keyword === '121') {
    return { ignored: true };
  }

  const baseUrl = getInternalServiceUrl('TRACKING_SERVICE_URL');
  await client.post(`${baseUrl}/ingest`, payload);
}

module.exports = {
  publish,
};
