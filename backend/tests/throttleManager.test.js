const test = require('node:test');
const assert = require('node:assert/strict');

const configModel = require('../integration-service/src/models/config');
const option1Client = require('../integration-service/src/services/option1Client');
const throttleManager = require('../integration-service/src/services/throttleManager');

test('flush keeps buffered coordinates when Option 1 delivery fails', async () => {
  const originalGetConfig = configModel.getConfig;
  const originalSendCoordinates = option1Client.sendCoordinates;

  configModel.getConfig = async () => ({ active_option: 'option1' });
  option1Client.sendCoordinates = async () => {
    throw new Error('upstream down');
  };

  throttleManager.resetBuffer();
  throttleManager.upsertCoordinate({
    imei: '123456789012345',
    lat: 6.8577333,
    lng: 3.3864,
    timestamp: '2026-04-28T08:00:00.000Z',
    assignment: {
      equipment_reference: 'CONT-123456',
      originator_name: 'Carrier Asia',
      partner_name: 'Partner',
      carrier_booking_ref: 'CBR-001',
      mode_of_transport: 'TRUCK',
      order_number: 'ORD-2024-001',
    },
  });

  await assert.rejects(() => throttleManager.flush(), /upstream down/);
  assert.equal(throttleManager.getBufferedCount(), 1);

  throttleManager.resetBuffer();
  configModel.getConfig = originalGetConfig;
  option1Client.sendCoordinates = originalSendCoordinates;
});

test('flush clears buffered coordinates only after successful Option 1 delivery', async () => {
  const originalGetConfig = configModel.getConfig;
  const originalSendCoordinates = option1Client.sendCoordinates;
  let calls = 0;

  configModel.getConfig = async () => ({ active_option: 'option1' });
  option1Client.sendCoordinates = async (payload) => {
    calls += 1;
    assert.equal(payload.length, 1);
  };

  throttleManager.resetBuffer();
  throttleManager.upsertCoordinate({
    imei: '123456789012345',
    lat: 6.8577333,
    lng: 3.3864,
    timestamp: '2026-04-28T08:00:00.000Z',
    assignment: {
      equipment_reference: 'CONT-123456',
      originator_name: 'Carrier Asia',
      partner_name: 'Partner',
      carrier_booking_ref: 'CBR-001',
      mode_of_transport: 'TRUCK',
      order_number: 'ORD-2024-001',
    },
  });

  await throttleManager.flush();
  assert.equal(calls, 1);
  assert.equal(throttleManager.getBufferedCount(), 0);

  configModel.getConfig = originalGetConfig;
  option1Client.sendCoordinates = originalSendCoordinates;
});

test('flush clamps future ACT timestamps before sending coordinates', async () => {
  const originalGetConfig = configModel.getConfig;
  const originalSendCoordinates = option1Client.sendCoordinates;
  const originalWarn = console.warn;
  const warnings = [];
  let outbound = null;

  configModel.getConfig = async () => ({ active_option: 'option1' });
  option1Client.sendCoordinates = async (payload) => {
    outbound = payload;
  };
  console.warn = (message) => warnings.push(message);

  throttleManager.resetBuffer();
  throttleManager.upsertCoordinate({
    imei: '123456789012345',
    lat: 6.8577333,
    lng: 3.3864,
    timestamp: '2099-04-28T08:00:00.000Z',
    assignment: {
      equipment_reference: 'CONT-123456',
      originator_name: 'Carrier Asia',
      partner_name: 'Partner',
      carrier_booking_ref: 'CBR-001',
      mode_of_transport: 'TRUCK',
      order_number: 'ORD-2024-001',
    },
  });

  await throttleManager.flush();

  assert.equal(outbound.length, 1);
  assert.equal(new Date(outbound[0].eventCreatedDateTime).getTime() <= Date.now() + 1000, true);
  assert.equal(warnings.length > 0, true);

  console.warn = originalWarn;
  configModel.getConfig = originalGetConfig;
  option1Client.sendCoordinates = originalSendCoordinates;
});
