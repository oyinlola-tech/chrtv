const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

function loadEnv() {
  if (!loaded) {
    dotenv.config({
      path: path.resolve(__dirname, '../../.env'),
      quiet: true,
    });
    loaded = true;
  }
}

function getRequiredEnv(name) {
  loadEnv();
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  loadEnv,
  getRequiredEnv,
};
