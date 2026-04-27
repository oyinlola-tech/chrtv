async function sendCoordinates(payload) {
  console.log('Option 2 stub coordinates', payload.length);
}

async function sendEvent(payload) {
  console.log('Option 2 stub event', payload.transportEventTypeCode || payload.eventType);
}

module.exports = {
  sendCoordinates,
  sendEvent,
};

