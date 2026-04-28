const { query } = require('../../../shared/db');

async function listAssignments() {
  return query(
    `SELECT a.*, o.order_number, o.equipment_reference, o.transportation_phase, o.mode_of_transport, o.carrier_booking_ref
     FROM assignments a
     INNER JOIN transport_orders o ON o.id = a.transport_order_id
     ORDER BY a.created_at DESC`
  ).catch(async () => {
    return query(
      `SELECT a.*, o.order_number, o.equipment_reference, o.transportation_phase, o.mode_of_transport, o.carrier_booking_ref
       FROM assignments a
       INNER JOIN transport_orders o ON o.id = a.transport_order_id
       ORDER BY a.id DESC`
    );
  });
}

async function createAssignment(data) {
  const result = await query(
    `INSERT INTO assignments
      (transport_order_id, imei, license_plate, originator_name, partner_name, start_time, end_time, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.transport_order_id,
      data.imei,
      data.license_plate || null,
      data.originator_name,
      data.partner_name || '',
      data.start_time || null,
      data.end_time || null,
      data.is_active === false ? 0 : 1,
    ]
  );

  return getAssignmentById(result.insertId);
}

async function updateAssignment(id, data) {
  await query(
    `UPDATE assignments
     SET transport_order_id = ?, imei = ?, license_plate = ?, originator_name = ?, partner_name = ?, start_time = ?, end_time = ?, is_active = ?
     WHERE id = ?`,
    [
      data.transport_order_id,
      data.imei,
      data.license_plate || null,
      data.originator_name,
      data.partner_name || '',
      data.start_time || null,
      data.end_time || null,
      data.is_active === false ? 0 : 1,
      id,
    ]
  );
  return getAssignmentById(id);
}

async function getAssignmentById(id) {
  const rows = await query('SELECT * FROM assignments WHERE id = ?', [id]);
  return rows[0] || null;
}

async function getAssignmentByImei(imei) {
  const rows = await query(
    `SELECT a.*, o.order_number, o.carrier_booking_ref, o.equipment_reference, o.transportation_phase, o.mode_of_transport, o.status
     FROM assignments a
     INNER JOIN transport_orders o ON o.id = a.transport_order_id
     WHERE a.imei = ? AND a.is_active = 1
     ORDER BY a.id DESC
     LIMIT 1`,
    [imei]
  );

  if (!rows[0]) {
    return null;
  }

  const assignment = rows[0];
  const facilities = await query(
    `SELECT ofs.id, ofs.transport_order_id, ofs.facility_id AS id_ref, ofs.sequence_order, ofs.area_name,
            f.id, f.name, f.facility_type_code, f.location_code, f.latitude, f.longitude, f.radius_meters, f.address_json
     FROM order_facility_sequence ofs
     INNER JOIN facilities f ON f.id = ofs.facility_id
     WHERE ofs.transport_order_id = ?
     ORDER BY ofs.sequence_order ASC`,
    [assignment.transport_order_id]
  );

  assignment.facilities = facilities.map((facility) => ({
    id: facility.id,
    sequence_order: facility.sequence_order,
    area_name: facility.area_name,
    name: facility.name,
    facility_type_code: facility.facility_type_code,
    location_code: facility.location_code,
    latitude: facility.latitude,
    longitude: facility.longitude,
    radius_meters: facility.radius_meters,
    address_json: facility.address_json,
  }));

  return assignment;
}

async function deleteAssignment(id) {
  await query('DELETE FROM assignments WHERE id = ?', [id]);
}

module.exports = {
  listAssignments,
  createAssignment,
  updateAssignment,
  getAssignmentById,
  getAssignmentByImei,
  deleteAssignment,
};

