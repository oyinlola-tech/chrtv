const { loadEnv } = require('./env');

loadEnv();

const SERVICE_DEFAULTS = {
  ASSET_SERVICE_URL: 'http://127.0.0.1:3002',
  TRACKING_SERVICE_URL: 'http://127.0.0.1:3001',
  INTEGRATION_SERVICE_URL: 'http://127.0.0.1:3003',
  DEVICE_GATEWAY_URL: 'http://127.0.0.1:5001',
};

const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost']);
const ALLOWED_PROTOCOLS = new Set(['http:']);

function getInternalServiceUrl(name) {
  const raw = process.env[name] || SERVICE_DEFAULTS[name];
  const url = new URL(raw);

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error(`Invalid protocol for ${name}`);
  }

  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(`Invalid host for ${name}`);
  }

  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error(`Invalid URL shape for ${name}`);
  }

  return url.origin;
}

module.exports = {
  getInternalServiceUrl,
};

