const httpClient = require('../utils/httpClient');
const { getInternalServiceUrl } = require('../../../shared/internalServices');
const positionStore = require('./positionStore');

const EVENT_DEDUP_WINDOW_MS = 60 * 1000;
const recentTransportEvents = new Map();

function hasDeviceManagedArea(facility) {
  return typeof facility?.area_name === 'string' && facility.area_name.trim().length > 0;
}

function parseTimestamp(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

async function getAssignment(imei) {
  const baseUrl = getInternalServiceUrl('ASSET_SERVICE_URL');
  try {
    const response = await httpClient.get(`${baseUrl}/internal/assignment/${imei}`);
    const assignment = response.data.assignment || null;
    if (!assignment) {
      return null;
    }

    assignment.useDeviceGeofence = (
      Array.isArray(assignment.facilities) &&
      assignment.facilities.length > 0 &&
      assignment.facilities.every(
        (facility) => hasDeviceManagedArea(facility)
      )
    );

    return assignment;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function sendEvent(event) {
  let dedupeKey = null;
  let currentTimestamp = null;

  if (event?.imei && event?.facility_id && (event?.event_type === 'ARRI' || event?.event_type === 'DEPA')) {
    dedupeKey = `${event.imei}:${event.facility_id}:${event.event_type}`;
    currentTimestamp = parseTimestamp(event.timestamp);
    const previousTimestamp = recentTransportEvents.get(dedupeKey);

    if (
      currentTimestamp != null &&
      previousTimestamp != null &&
      currentTimestamp - previousTimestamp >= 0 &&
      currentTimestamp - previousTimestamp < EVENT_DEDUP_WINDOW_MS
    ) {
      return { skipped: true, reason: 'deduped_recent_event' };
    }
  }

  const baseUrl = getInternalServiceUrl('INTEGRATION_SERVICE_URL');
  await httpClient.post(`${baseUrl}/events`, event);
  if (dedupeKey) {
    recentTransportEvents.set(dedupeKey, currentTimestamp ?? Date.now());
  }
  positionStore.pushRecentEvent(event);
  return { skipped: false };
}

async function sendCoordinate(position, assignment) {
  const baseUrl = getInternalServiceUrl('INTEGRATION_SERVICE_URL');
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
