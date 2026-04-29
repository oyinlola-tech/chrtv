const { query } = require('../../../shared/db');

const imeiState = new Map();

function hasDeviceManagedArea(facility) {
  return facility?.geofence_provisioned === true || facility?.geofence_provisioned === 1;
}

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

function stateKey(imei, facilityId) {
  return `${imei}:${facilityId}`;
}

async function initialize() {
  const rows = await query(
    `SELECT imei, facility_id, is_inside, last_utc_timestamp
     FROM geofence_state`
  );

  imeiState.clear();
  rows.forEach((row) => {
    imeiState.set(stateKey(row.imei, row.facility_id), {
      isInside: Boolean(row.is_inside),
      lastUtcTimestamp: row.last_utc_timestamp ? new Date(row.last_utc_timestamp).toISOString() : null,
    });
  });
}

async function persistState(imei, facilityId, isInside, utcTimestamp) {
  await query(
    `INSERT INTO geofence_state (imei, facility_id, is_inside, last_utc_timestamp)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      is_inside = VALUES(is_inside),
      last_utc_timestamp = VALUES(last_utc_timestamp)`,
    [imei, facilityId, Number(isInside), utcTimestamp ? new Date(utcTimestamp) : null]
  );
}

async function syncDeviceState(positionPayload, facilityId, isInside) {
  const utcTimestamp = positionPayload?.data?.utcTimestamp || null;
  const key = stateKey(positionPayload.imei, facilityId);

  imeiState.set(key, {
    isInside,
    lastUtcTimestamp: utcTimestamp,
  });
  await persistState(positionPayload.imei, facilityId, isInside, utcTimestamp);
}

async function evaluate(positionPayload, assignment) {
  if (!assignment || assignment.useDeviceGeofence || !Array.isArray(assignment.facilities)) {
    return [];
  }

  const lat = positionPayload.data.latitude;
  const lng = positionPayload.data.longitude;
  if (lat == null || lng == null) {
    return [];
  }

  const events = [];

  for (const facility of assignment.facilities) {
    if (hasDeviceManagedArea(facility)) {
      continue;
    }

    const distance = distanceMeters(
      lat,
      lng,
      Number(facility.latitude),
      Number(facility.longitude)
    );
    const inside = distance <= Number(facility.radius_meters || 500);
    const key = stateKey(positionPayload.imei, facility.id);
    const previous = imeiState.get(key);
    const prevInside = previous?.isInside ?? false;

    if (prevInside === false && inside) {
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

    if (prevInside === true && !inside) {
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

    imeiState.set(key, {
      isInside: inside,
      lastUtcTimestamp: positionPayload.data.utcTimestamp,
    });
    await persistState(positionPayload.imei, facility.id, inside, positionPayload.data.utcTimestamp);
  }

  return events;
}

async function resetImeiState(imei) {
  for (const key of Array.from(imeiState.keys())) {
    if (key.startsWith(`${imei}:`)) {
      imeiState.delete(key);
    }
  }

  await query('DELETE FROM geofence_state WHERE imei = ?', [imei]);
}

module.exports = {
  initialize,
  evaluate,
  resetImeiState,
  syncDeviceState,
};
