const deviceManager = require('./deviceManager');

const HARD_MIN_ACK_TIMEOUT_MS = 100;
const HARD_MAX_ACK_TIMEOUT_MS = 60000;

function normalizeConfigTimeoutMs(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const rounded = Math.trunc(parsed);
  return Math.min(HARD_MAX_ACK_TIMEOUT_MS, Math.max(HARD_MIN_ACK_TIMEOUT_MS, rounded));
}

const MIN_ACK_TIMEOUT_MS = normalizeConfigTimeoutMs(process.env.DEVICE_COMMAND_ACK_TIMEOUT_MIN_MS, 1000);
const MAX_ACK_TIMEOUT_MS = normalizeConfigTimeoutMs(process.env.DEVICE_COMMAND_ACK_TIMEOUT_MAX_MS, 60000);
const DEFAULT_ACK_TIMEOUT_MS = Math.min(
  MAX_ACK_TIMEOUT_MS,
  Math.max(
    MIN_ACK_TIMEOUT_MS,
    normalizeConfigTimeoutMs(process.env.DEVICE_COMMAND_ACK_TIMEOUT_MS, 30000),
  ),
);
const pendingAcknowledgements = new Map();

function pendingKey(imei, keyword) {
  return `${imei}:${keyword}`;
}

function extractKeyword(command) {
  return String(command || '').split(',')[0].trim();
}

function normalizeAckTimeoutMs(value) {
  if (value == null || value === '') {
    return DEFAULT_ACK_TIMEOUT_MS;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ACK_TIMEOUT_MS;
  }

  const rounded = Math.trunc(parsed);
  return Math.min(MAX_ACK_TIMEOUT_MS, Math.max(MIN_ACK_TIMEOUT_MS, rounded));
}

function waitForAcknowledgement(imei, keyword, timeoutMs, metadata) {
  const key = pendingKey(imei, keyword);

  if (pendingAcknowledgements.has(key)) {
    const error = new Error(`Acknowledgement already pending for IMEI ${imei} keyword ${keyword}`);
    error.code = 'ACK_PENDING';
    throw error;
  }

  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      pendingAcknowledgements.delete(key);
      const error = new Error(`Timed out waiting for acknowledgement ${keyword} from IMEI ${imei}`);
      error.code = 'ACK_TIMEOUT';
      reject(error);
    }, timeoutMs);

    pendingAcknowledgements.set(key, {
      metadata,
      resolve(value) {
        clearTimeout(timeoutHandle);
        resolve(value);
      },
      reject(error) {
        clearTimeout(timeoutHandle);
        reject(error);
      },
    });
  });
}

function sendCommand(imei, command, options = {}) {
  const socket = deviceManager.getSocket(imei);
  if (!socket || socket.destroyed || !socket.writable) {
    throw new Error(`No active socket for IMEI ${imei}`);
  }

  const formatted = `**,imei:${imei},${command}`;
  socket.write(formatted);

  if (!options.waitForAck) {
    return { formatted };
  }

  const keyword = extractKeyword(command);
  const timeoutMs = normalizeAckTimeoutMs(options.timeoutMs);
  return waitForAcknowledgement(imei, keyword, timeoutMs, options.ackContext).then((acknowledgement) => ({
    formatted,
    acknowledgement,
  }));
}

function resolveAcknowledgement(imei, keyword, payload) {
  const key = pendingKey(imei, keyword);
  const pending = pendingAcknowledgements.get(key);
  if (!pending) {
    return null;
  }

  pendingAcknowledgements.delete(key);
  pending.resolve({
    payload,
    metadata: pending.metadata || null,
  });
  return pending.metadata || null;
}

module.exports = {
  MIN_ACK_TIMEOUT_MS,
  MAX_ACK_TIMEOUT_MS,
  DEFAULT_ACK_TIMEOUT_MS,
  normalizeAckTimeoutMs,
  sendCommand,
  resolveAcknowledgement,
};
