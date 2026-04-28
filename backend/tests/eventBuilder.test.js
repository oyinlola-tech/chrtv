const test = require('node:test');
const assert = require('node:assert/strict');

const eventBuilder = require('../integration-service/src/services/eventBuilder');

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
