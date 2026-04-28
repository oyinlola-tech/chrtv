const configModel = require('../models/config');
const option1Client = require('./option1Client');
const option2Stub = require('./option2Stub');

function parseAddress(addressJson) {
  if (!addressJson) {
    return undefined;
  }

  try {
    return JSON.parse(addressJson);
  } catch (_error) {
    return undefined;
  }
}

function build(eventPayload) {
  const facility = eventPayload.facility || null;
  if (!facility) {
    throw new Error('Facility context is required for event payloads');
  }

  if (!facility.location_code) {
    throw new Error(`Facility ${facility.id} missing location_code`);
  }

  return {
    equipmentReference: eventPayload.equipmentReference,
    eventCreatedDateTime: new Date(eventPayload.timestamp).toISOString(),
    originatorName: eventPayload.originatorName,
    partnerName: eventPayload.partnerName || ' ',
    eventType: 'TRANSPORT',
    transportEventTypeCode: eventPayload.event_type,
    equipmentEventTypeCode: '',
    shipmentEventTypeCode: '',
    eventClassifierCode: 'ACT',
    carrierBookingReference: eventPayload.carrierBookingReference || '',
    modeOfTransport: eventPayload.modeOfTransport || 'TRUCK',
    transportationPhase: eventPayload.transportationPhase,
    transportOrder: eventPayload.transportOrder || '',
    eventLocation: {
      facilityTypeCode: facility.facility_type_code || '',
      locationCode: facility.location_code,
      locationName: facility.name || '',
      latitude: eventPayload.lat,
      longitude: eventPayload.lng,
      address: parseAddress(facility.address_json),
    },
  };
}

async function buildAndSend(eventPayload) {
  const config = await configModel.getConfig();
  const payload = build(eventPayload);

  if (config.active_option === 'option1') {
    return option1Client.sendEvent(payload);
  }

  return option2Stub.sendEvent(payload);
}

module.exports = {
  build,
  buildAndSend,
};
