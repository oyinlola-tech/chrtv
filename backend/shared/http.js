const axios = require('axios');
const { loadEnv } = require('./env');

loadEnv();

function createHttpClient(config = {}) {
  return axios.create({
    timeout: Number(process.env.HTTP_TIMEOUT_MS || 15000),
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
