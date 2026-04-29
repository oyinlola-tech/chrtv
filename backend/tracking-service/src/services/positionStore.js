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
      (imei, \`utc_timestamp\`, latitude, longitude, speed, heading, altitude, acc_state, door_state, fuel1_percent, fuel2_percent, temperature, mileage_km, gps_valid, raw_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    record
  );

  if (utcTimestamp) {
    await query(
      `INSERT INTO latest_device_positions
        (imei, \`utc_timestamp\`, latitude, longitude, speed, heading, altitude, acc_state, door_state, fuel1_percent, fuel2_percent, temperature, mileage_km, gps_valid, raw_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        \`utc_timestamp\` = GREATEST(\`utc_timestamp\`, VALUES(\`utc_timestamp\`)),
        latitude = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(latitude), latitude),
        longitude = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(longitude), longitude),
        speed = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(speed), speed),
        heading = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(heading), heading),
        altitude = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(altitude), altitude),
        acc_state = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(acc_state), acc_state),
        door_state = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(door_state), door_state),
        fuel1_percent = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(fuel1_percent), fuel1_percent),
        fuel2_percent = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(fuel2_percent), fuel2_percent),
        temperature = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(temperature), temperature),
        mileage_km = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(mileage_km), mileage_km),
        gps_valid = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(gps_valid), gps_valid),
        raw_message = IF(VALUES(\`utc_timestamp\`) > \`utc_timestamp\`, VALUES(raw_message), raw_message)`,
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

function normalizeLimit(limit, fallback) {
  const value = Number(limit);
  if (!Number.isInteger(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(value, 500));
}

async function getLatestPositions(limit = 500) {
  const normalizedLimit = normalizeLimit(limit, 500);
  return query(
    `SELECT *
     FROM latest_device_positions
     ORDER BY \`utc_timestamp\` DESC
     LIMIT ${normalizedLimit}`
  );
}

async function getRecentPositions(limit = 50) {
  const normalizedLimit = normalizeLimit(limit, 50);
  return query(
    `SELECT *
     FROM device_positions
     ORDER BY COALESCE(\`utc_timestamp\`, created_at) DESC, id DESC
     LIMIT ${normalizedLimit}`
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
