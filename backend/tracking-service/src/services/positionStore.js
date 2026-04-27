const { query } = require('../../../shared/db');

const recentEvents = [];

async function storePosition(payload) {
  const data = payload.data || {};

  await query(
    `INSERT INTO device_positions
      (imei, utc_timestamp, latitude, longitude, speed, heading, altitude, acc_state, door_state, fuel1_percent, fuel2_percent, temperature, mileage_km, gps_valid, raw_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.imei,
      data.utcTimestamp ? new Date(data.utcTimestamp) : new Date(),
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
    ]
  );
}

function pushRecentEvent(event) {
  recentEvents.unshift(event);
  if (recentEvents.length > 100) {
    recentEvents.length = 100;
  }
}

function getRecentEvents() {
  return recentEvents;
}

async function getLatestPositions() {
  return query(
    `SELECT dp.*
     FROM device_positions dp
     INNER JOIN (
       SELECT imei, MAX(utc_timestamp) AS max_time
       FROM device_positions
       GROUP BY imei
     ) latest
       ON latest.imei = dp.imei AND latest.max_time = dp.utc_timestamp
     ORDER BY dp.utc_timestamp DESC`
  );
}

async function getRecentPositions(limit = 50) {
  return query(
    `SELECT * FROM device_positions ORDER BY utc_timestamp DESC LIMIT ?`,
    [limit]
  );
}

module.exports = {
  storePosition,
  pushRecentEvent,
  getRecentEvents,
  getLatestPositions,
  getRecentPositions,
};

