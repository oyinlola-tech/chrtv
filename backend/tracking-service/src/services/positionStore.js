const { query } = require('../../../shared/db');

const recentEvents = [];

function hasPersistableCoordinates(data = {}) {
  return (
    data.latitude != null &&
    data.longitude != null &&
    Number.isFinite(Number(data.latitude)) &&
    Number.isFinite(Number(data.longitude))
  );
}

function toNullableDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function storePosition(payload) {
  const data = payload.data || {};
  if (!hasPersistableCoordinates(data)) {
    return { stored: false, reason: 'missing_coordinates' };
  }

  const utcTimestamp = toNullableDate(data.utcTimestamp);
  const record = [
    payload.imei,
    utcTimestamp,
    data.latitude ?? null,
    data.longitude ?? null,
    data.speed ?? null,
    data.heading ?? null,
    data.altitude ?? null,
    typeof data.accState === 'boolean' ? Number(data.accState) : null,
    typeof data.doorState === 'boolean' ? Number(data.doorState) : null,
    data.fuel1Percent ?? null,
    data.fuel2Percent ?? null,
    data.temperature ?? null,
    data.mileageKm ?? null,
    typeof data.gpsValid === 'boolean' ? Number(data.gpsValid) : null,
    data.rawMessage || null,
  ];

  await query(
    `INSERT INTO device_positions
      (imei, utc_timestamp, latitude, longitude, speed, heading, altitude, acc_state, door_state, fuel1_percent, fuel2_percent, temperature, mileage_km, gps_valid, raw_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    record
  );

  if (utcTimestamp) {
    await query(
      `INSERT INTO latest_device_positions
        (imei, utc_timestamp, latitude, longitude, speed, heading, altitude, acc_state, door_state, fuel1_percent, fuel2_percent, temperature, mileage_km, gps_valid, raw_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        utc_timestamp = VALUES(utc_timestamp),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        speed = VALUES(speed),
        heading = VALUES(heading),
        altitude = VALUES(altitude),
        acc_state = VALUES(acc_state),
        door_state = VALUES(door_state),
        fuel1_percent = VALUES(fuel1_percent),
        fuel2_percent = VALUES(fuel2_percent),
        temperature = VALUES(temperature),
        mileage_km = VALUES(mileage_km),
        gps_valid = VALUES(gps_valid),
        raw_message = VALUES(raw_message)`,
      record
    );
  }

  return { stored: true };
}

function pushRecentEvent(event) {
  recentEvents.unshift(event);
  if (recentEvents.length > 100) {
    recentEvents.length = 100;
  }
}

function getRecentEvents() {
  return [...recentEvents];
}

async function getLatestPositions(limit = 500) {
  return query(
    `SELECT *
     FROM latest_device_positions
     ORDER BY utc_timestamp DESC
     LIMIT ?`,
    [limit]
  );
}

async function getRecentPositions(limit = 50) {
  return query(
    `SELECT *
     FROM device_positions
     ORDER BY COALESCE(utc_timestamp, created_at) DESC, id DESC
     LIMIT ?`,
    [limit]
  );
}

module.exports = {
  hasPersistableCoordinates,
  storePosition,
  pushRecentEvent,
  getRecentEvents,
  getLatestPositions,
  getRecentPositions,
};
