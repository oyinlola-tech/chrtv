async function sendCoordinates(payload) {
  console.log('Option 2 not implemented: coordinates skipped', payload.length);
  return { stub: true, skipped: payload.length };
}

async function sendEvent(payload) {
  console.log('Option 2 not implemented: event skipped', payload.transportEventTypeCode || payload.eventType);
  return { stub: true, skipped: 1 };
}

module.exports = {
  sendCoordinates,
  sendEvent,
};
