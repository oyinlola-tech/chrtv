const imeiState = new Map();

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(aLat, aLng, bLat, bLng) {
  const earthRadius = 6371000;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

function evaluate(positionPayload, assignment) {
  if (!assignment || assignment.useDeviceGeofence || !Array.isArray(assignment.facilities)) {
    return [];
  }

  const lat = positionPayload.data.latitude;
  const lng = positionPayload.data.longitude;
  if (lat == null || lng == null) {
    return [];
  }

  const currentState = imeiState.get(positionPayload.imei) || {};
  const events = [];

  assignment.facilities.forEach((facility) => {
    const distance = distanceMeters(
      lat,
      lng,
      Number(facility.latitude),
      Number(facility.longitude)
    );
    const inside = distance <= Number(facility.radius_meters || 500);
    const prevInside = currentState[facility.id] || false;

    if (!prevInside && inside) {
      events.push({
        imei: positionPayload.imei,
        event_type: 'ARRI',
        facility_id: facility.id,
        timestamp: positionPayload.data.utcTimestamp,
        lat,
        lng,
        transport_order_id: assignment.transport_order_id,
      });
    }

    if (prevInside && !inside) {
      events.push({
        imei: positionPayload.imei,
        event_type: 'DEPA',
        facility_id: facility.id,
        timestamp: positionPayload.data.utcTimestamp,
        lat,
        lng,
        transport_order_id: assignment.transport_order_id,
      });
    }

    currentState[facility.id] = inside;
  });

  imeiState.set(positionPayload.imei, currentState);
  return events;
}

module.exports = {
  evaluate,
};
