const axios = require('axios');
const http = require('http');
const https = require('https');
const { loadEnv } = require('./env');

loadEnv();

const socketTimeout = Number(process.env.HTTP_SOCKET_TIMEOUT_MS || 30000);
const maxSockets = Number(process.env.HTTP_MAX_SOCKETS || 100);
const maxFreeSockets = Number(process.env.HTTP_MAX_FREE_SOCKETS || 20);

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: Number(process.env.HTTP_KEEPALIVE_MS || 10000),
  maxSockets,
  maxFreeSockets,
  timeout: socketTimeout,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: Number(process.env.HTTP_KEEPALIVE_MS || 10000),
  maxSockets,
  maxFreeSockets,
  timeout: socketTimeout,
});

function createHttpClient(config = {}) {
  return axios.create({
    timeout: Number(process.env.HTTP_TIMEOUT_MS || 15000),
    httpAgent,
    httpsAgent,
    proxy: false,
    ...config,
  });
}

async function withRetries(fn, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw error;
      }
    }
  }

  throw lastError;
}

module.exports = {
  createHttpClient,
  withRetries,
};
