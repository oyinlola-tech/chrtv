const test = require('node:test');
const assert = require('node:assert/strict');

const configModel = require('../integration-service/src/models/config');
const eventBuilder = require('../integration-service/src/services/eventBuilder');
const option1Client = require('../integration-service/src/services/option1Client');

test('build creates Option 1 event payload with mandatory RTV fields', () => {
  const payload = eventBuilder.build({
    event_type: 'ARRI',
    timestamp: '2026-04-28T08:00:00.000Z',
    originatorName: 'Carrier Asia',
    partnerName: 'Partner',
    equipmentReference: 'CONT-123456',
    carrierBookingReference: 'CBR-001',
    transportOrder: 'ORD-2024-001',
    transportationPhase: 'EXPORT',
    modeOfTransport: 'TRUCK',
    lat: 6.8577333,
    lng: 3.3864,
    facility: {
      facility_type_code: 'DEPO',
      location_code: 'NGLOS',
      name: 'Lagos Depot',
    },
  });

  assert.equal(payload.equipmentReference, 'CONT-123456');
  assert.equal(payload.eventType, 'TRANSPORT');
  assert.equal(payload.transportEventTypeCode, 'ARRI');
  assert.equal(payload.eventClassifierCode, 'ACT');
  assert.equal(payload.transportationPhase, 'EXPORT');
  assert.equal(payload.eventLocation.facilityTypeCode, 'DEPO');
  assert.equal(payload.eventLocation.locationCode, 'NGLOS');
  assert.equal(payload.eventLocation.locationName, 'Lagos Depot');
  assert.equal(payload.eventLocation.latitude, 6.8577333);
  assert.equal(payload.eventLocation.longitude, 3.3864);
});

test('buildAndSend skips events with missing coordinates', async () => {
  const originalGetConfig = configModel.getConfig;
  const originalSendEvent = option1Client.sendEvent;
  let called = false;

  configModel.getConfig = async () => ({ active_option: 'option1' });
  option1Client.sendEvent = async () => {
    called = true;
  };

  const result = await eventBuilder.buildAndSend({
    imei: '123456789012345',
    event_type: 'ARRI',
    timestamp: '2026-04-28T08:00:00.000Z',
    originatorName: 'Carrier Asia',
    equipmentReference: 'CONT-123456',
    facility: {
      id: 1,
      facility_type_code: 'DEPO',
      location_code: 'NGLOS',
      name: 'Lagos Depot',
    },
    lat: null,
    lng: 3.3864,
  });

  assert.deepEqual(result, { skipped: true, reason: 'missing_coordinates' });
  assert.equal(called, false);

  configModel.getConfig = originalGetConfig;
  option1Client.sendEvent = originalSendEvent;
});

test('buildAndSend passes through location codes that start with LOC', async () => {
  const originalGetConfig = configModel.getConfig;
  const originalSendEvent = option1Client.sendEvent;
  let outboundPayload = null;

  configModel.getConfig = async () => ({ active_option: 'option1' });
  option1Client.sendEvent = async (payload) => {
    outboundPayload = payload;
    return { ok: true };
  };

  await eventBuilder.buildAndSend({
    imei: '123456789012345',
    event_type: 'DEPA',
    timestamp: '2026-04-28T08:00:00.000Z',
    originatorName: 'Carrier Asia',
    partnerName: 'Partner',
    equipmentReference: 'CONT-123456',
    carrierBookingReference: 'CBR-001',
    transportOrder: 'ORD-2024-001',
    transportationPhase: 'EXPORT',
    modeOfTransport: 'TRUCK',
    lat: 6.8577333,
    lng: 3.3864,
    facility: {
      id: 1,
      facility_type_code: 'DEPO',
      location_code: 'LOC-DEMO',
      name: 'Lagos Depot',
    },
  });

  assert.equal(outboundPayload.eventLocation.locationCode, 'LOC-DEMO');

  configModel.getConfig = originalGetConfig;
  option1Client.sendEvent = originalSendEvent;
});
