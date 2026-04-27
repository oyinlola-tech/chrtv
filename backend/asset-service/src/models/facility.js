const { query } = require('../../../shared/db');

async function listFacilities() {
  return query('SELECT * FROM facilities ORDER BY name ASC');
}

async function createFacility(data) {
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
  await query('DELETE FROM facilities WHERE id = ?', [id]);
}

module.exports = {
  listFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
};

