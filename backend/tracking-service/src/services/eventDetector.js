const httpClient = require('../utils/httpClient');
const positionStore = require('./positionStore');

async function getAssignment(imei) {
  const baseUrl = process.env.ASSET_SERVICE_URL || 'http://localhost:3002';
  try {
    const response = await httpClient.get(`${baseUrl}/internal/assignment/${imei}`);
    return response.data.assignment || null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function sendEvent(event) {
  const baseUrl = process.env.INTEGRATION_SERVICE_URL || 'http://localhost:3003';
  await httpClient.post(`${baseUrl}/events`, event);
  positionStore.pushRecentEvent(event);
}

async function sendCoordinate(position, assignment) {
  const baseUrl = process.env.INTEGRATION_SERVICE_URL || 'http://localhost:3003';
  await httpClient.post(`${baseUrl}/coordinates`, {
    imei: position.imei,
    lat: position.data.latitude,
    lng: position.data.longitude,
    timestamp: position.data.utcTimestamp,
    assignment,
  });
}

async function enrichEvent(event, assignment) {
  return {
    ...event,
    originatorName: assignment.originator_name,
    partnerName: assignment.partner_name,
    transportationPhase: assignment.transportation_phase,
    equipmentReference: assignment.equipment_reference,
    carrierBookingReference: assignment.carrier_booking_ref,
    transportOrder: assignment.order_number,
    modeOfTransport: assignment.mode_of_transport || 'TRUCK',
    facility: assignment.facilities.find((item) => item.id === event.facility_id) || null,
  };
}

module.exports = {
  getAssignment,
  sendEvent,
  sendCoordinate,
  enrichEvent,
};
