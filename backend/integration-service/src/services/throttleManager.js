const configModel = require('../models/config');
const option1Client = require('./option1Client');
const option2Stub = require('./option2Stub');

const latestByImei = new Map();
let intervalRef = null;

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function upsertCoordinate(payload) {
  latestByImei.set(payload.imei, payload);
}

async function flush() {
  if (!latestByImei.size) {
    return;
  }

  const config = await configModel.getConfig();
  const payloads = Array.from(latestByImei.values()).map((item) => ({
    equipmentReference: item.assignment.equipment_reference,
    eventCreatedDateTime: new Date(item.timestamp).toISOString(),
    originatorName: item.assignment.originator_name,
    partnerName: item.assignment.partner_name || ' ',
    carrierBookingReference: item.assignment.carrier_booking_ref || '',
    modeOfTransport: item.assignment.mode_of_transport || 'TRUCK',
    transportOrder: item.assignment.order_number || '',
    eventLocation: {
      latitude: item.lat,
      longitude: item.lng,
    },
  }));

  latestByImei.clear();
  const batches = chunkArray(payloads, Math.max(1, Number(process.env.OPTION1_MAX_BATCH_SIZE || 200)));

  for (const batch of batches) {
    if (config.active_option === 'option1') {
      await option1Client.sendCoordinates(batch);
      continue;
    }

    await option2Stub.sendCoordinates(batch);
  }
}

function start(intervalSeconds = 600) {
  if (intervalRef) {
    clearInterval(intervalRef);
  }

  intervalRef = setInterval(() => {
    flush().catch((error) => console.error('coordinate flush failed', error.message));
  }, Number(intervalSeconds || 600) * 1000);
}

module.exports = {
  upsertCoordinate,
  flush,
  start,
};
