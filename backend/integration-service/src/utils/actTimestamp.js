const FUTURE_TOLERANCE_MS = Number(process.env.OPTION1_ACT_FUTURE_TOLERANCE_MS || 60 * 1000);

function normalizeActTimestamp(value, context = 'payload') {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`Invalid timestamp for ${context}`);
    error.code = 'INVALID_TIMESTAMP';
    throw error;
  }

  const now = Date.now();
  const driftMs = parsed.getTime() - now;

  if (driftMs > FUTURE_TOLERANCE_MS) {
    const clamped = new Date(now).toISOString();
    console.warn(
      `Clamping future ACT timestamp for ${context}: received ${parsed.toISOString()}, using ${clamped}`
    );
    return clamped;
  }

  return parsed.toISOString();
}

module.exports = {
  FUTURE_TOLERANCE_MS,
  normalizeActTimestamp,
};
