async function sendCoordinates(payload) {
  console.log('Option 2 not implemented');
  return { stub: true, skipped: Array.isArray(payload) ? payload.length : 0 };
}

async function sendEvent(payload) {
  console.log('Option 2 not implemented');
  return { stub: true, skipped: 1 };
}

module.exports = {
  sendCoordinates,
  sendEvent,
};
