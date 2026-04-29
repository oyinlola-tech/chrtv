const { createHttpClient } = require('../../shared/http');
const { getInternalServiceUrl } = require('../../shared/internalServices');
const { resolveAcknowledgement } = require('./commandSender');

const client = createHttpClient();

async function publish(payload) {
  if (payload?.type === 'ack' && payload?.data?.keyword === '121') {
    const metadata = resolveAcknowledgement(payload.imei, payload.data.keyword, payload);
    if (metadata) {
      const baseUrl = getInternalServiceUrl('ASSET_SERVICE_URL');
      await client.post(`${baseUrl}/internal/geofence-ack`, {
        imei: payload.imei,
        keyword: payload.data.keyword,
        rawMessage: payload.data.rawMessage,
        ...metadata,
      });
    }
    return { ignored: true };
  }

  const baseUrl = getInternalServiceUrl('TRACKING_SERVICE_URL');
  await client.post(`${baseUrl}/ingest`, payload);
}

module.exports = {
  publish,
};
