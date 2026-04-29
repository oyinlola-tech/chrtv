const FUTURE_TOLERANCE_MS = Number(process.env.OPTION1_ACT_FUTURE_TOLERANCE_MS || 5 * 60 * 1000);
const PAST_WARNING_MS = Number(process.env.OPTION1_ACT_PAST_WARNING_MS || 24 * 60 * 60 * 1000);

function validateActTimestamp(value, context = 'payload') {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`Invalid timestamp for ${context}`);
    error.code = 'INVALID_TIMESTAMP';
    throw error;
  }

  const now = Date.now();
  const driftMs = parsed.getTime() - now;

  if (driftMs > FUTURE_TOLERANCE_MS) {
    const error = new Error(
      `ACT timestamp for ${context} is more than ${Math.floor(FUTURE_TOLERANCE_MS / 60000)} minutes in the future`
    );
    error.code = 'ACT_TIMESTAMP_TOO_FAR_IN_FUTURE';
    throw error;
  }

  if (now - parsed.getTime() > PAST_WARNING_MS) {
    console.warn(
      `ACT timestamp for ${context} is older than ${Math.floor(PAST_WARNING_MS / (60 * 60 * 1000))} hours: ${parsed.toISOString()}`
    );
  }

  return true;
}

module.exports = {
  FUTURE_TOLERANCE_MS,
  PAST_WARNING_MS,
  validateActTimestamp,
};
