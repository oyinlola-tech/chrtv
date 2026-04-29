const configModel = require('../models/config');
const option1Client = require('./option1Client');
const option2Stub = require('./option2Stub');
const { validateActTimestamp } = require('../utils/actTimestamp');

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
  const entries = Array.from(latestByImei.entries());
  const batches = chunkArray(entries, Math.max(1, Number(process.env.OPTION1_MAX_BATCH_SIZE || 200)));

  for (const batchEntries of batches) {
    const validBatchEntries = [];
    const batch = [];

    for (const [imei, item] of batchEntries) {
      try {
        validateActTimestamp(item.timestamp, `coordinate IMEI ${item.imei}`);
      } catch (error) {
        console.warn(`Skipping coordinate for IMEI ${item.imei}: ${error.message}`);
        latestByImei.delete(imei);
        continue;
      }

      validBatchEntries.push([imei, item]);
      batch.push({
        equipmentReference: item.assignment.equipment_reference,
        eventCreatedDateTime: item.timestamp,
        originatorName: item.assignment.originator_name,
        partnerName: item.assignment.partner_name || ' ',
        carrierBookingReference: item.assignment.carrier_booking_ref || '',
        modeOfTransport: item.assignment.mode_of_transport || 'TRUCK',
        transportOrder: item.assignment.order_number || '',
        eventLocation: {
          latitude: item.lat,
          longitude: item.lng,
        },
      });
    }

    if (!batch.length) {
      continue;
    }

    if (config.active_option === 'option1') {
      await option1Client.sendCoordinates(batch);
    } else {
      await option2Stub.sendCoordinates(batch);
    }

    validBatchEntries.forEach(([imei]) => latestByImei.delete(imei));
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
  resetBuffer() {
    latestByImei.clear();
  },
  getBufferedCount() {
    return latestByImei.size;
  },
};
