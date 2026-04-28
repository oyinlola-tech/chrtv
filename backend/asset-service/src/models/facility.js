const { query } = require('../../../shared/db');

// Simple in-memory cache for facilities (expires after 5 minutes)
let facilitiesCache = null;
let facilitiesCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function listFacilities() {
  const now = Date.now();
  
  // Return cached result if still valid
  if (facilitiesCache !== null && (now - facilitiesCacheTime) < CACHE_TTL) {
    return facilitiesCache;
  }
  
  const facilities = await query('SELECT * FROM facilities ORDER BY name ASC');
  facilitiesCache = facilities;
  facilitiesCacheTime = now;
  return facilities;
}

function invalidateCache() {
  facilitiesCache = null;
  facilitiesCacheTime = 0;
}

async function createFacility(data) {
  invalidateCache();
  const result = await query(
    `INSERT INTO facilities
      (name, facility_type_code, location_code, latitude, longitude, radius_meters, address_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.facility_type_code,
      data.location_code || null,
      data.latitude,
      data.longitude,
      data.radius_meters || 500,
      data.address_json ? JSON.stringify(data.address_json) : null,
    ]
  );
  return query('SELECT * FROM facilities WHERE id = ?', [result.insertId]).then((rows) => rows[0]);
}

async function updateFacility(id, data) {
  invalidateCache();
  await query(
    `UPDATE facilities
     SET name = ?, facility_type_code = ?, location_code = ?, latitude = ?, longitude = ?, radius_meters = ?, address_json = ?
     WHERE id = ?`,
    [
      data.name,
      data.facility_type_code,
      data.location_code || null,
      data.latitude,
      data.longitude,
      data.radius_meters || 500,
      data.address_json ? JSON.stringify(data.address_json) : null,
      id,
    ]
  );
  return query('SELECT * FROM facilities WHERE id = ?', [id]).then((rows) => rows[0]);
}

async function deleteFacility(id) {
  invalidateCache();
  await query('DELETE FROM facilities WHERE id = ?', [id]);
}

module.exports = {
  listFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
};

