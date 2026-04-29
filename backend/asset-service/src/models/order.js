const { query, getPool } = require('../../../shared/db');

async function listOrders() {
  return query('SELECT * FROM transport_orders ORDER BY created_at DESC');
}

async function getOrderById(id) {
  const rows = await query('SELECT * FROM transport_orders WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createOrder(data) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO transport_orders
        (order_number, carrier_booking_ref, equipment_reference, transportation_phase, mode_of_transport, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.order_number,
        data.carrier_booking_ref || null,
        data.equipment_reference,
        data.transportation_phase,
        data.mode_of_transport || 'TRUCK',
        data.status || 'PLANNED',
      ]
    );

    if (Array.isArray(data.facility_sequence)) {
      for (let index = 0; index < data.facility_sequence.length; index += 1) {
        await connection.execute(
          `INSERT INTO order_facility_sequence (transport_order_id, facility_id, sequence_order, area_name, geofence_active, geofence_provisioned)
           VALUES (?, ?, ?, NULL, 0, 0)`,
          [result.insertId, data.facility_sequence[index], index + 1]
        );
      }
    }

    await connection.commit();
    return getOrderById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateOrder(id, data) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE transport_orders
       SET order_number = ?, carrier_booking_ref = ?, equipment_reference = ?, transportation_phase = ?, mode_of_transport = ?, status = ?
       WHERE id = ?`,
      [
        data.order_number,
        data.carrier_booking_ref || null,
        data.equipment_reference,
        data.transportation_phase,
        data.mode_of_transport || 'TRUCK',
        data.status || 'PLANNED',
        id,
      ]
    );

    if (Array.isArray(data.facility_sequence)) {
      await connection.execute('DELETE FROM order_facility_sequence WHERE transport_order_id = ?', [id]);
      for (let index = 0; index < data.facility_sequence.length; index += 1) {
        await connection.execute(
          `INSERT INTO order_facility_sequence (transport_order_id, facility_id, sequence_order, area_name, geofence_active, geofence_provisioned)
           VALUES (?, ?, ?, NULL, 0, 0)`,
          [id, data.facility_sequence[index], index + 1]
        );
      }
    }

    await connection.commit();
    return getOrderById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteOrder(id) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM order_facility_sequence WHERE transport_order_id = ?', [id]);
    await connection.execute('DELETE FROM assignments WHERE transport_order_id = ?', [id]);
    await connection.execute('DELETE FROM transport_orders WHERE id = ?', [id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrderFacilities(orderId) {
  return query(
    `SELECT ofs.*, f.name, f.facility_type_code, f.location_code, f.latitude, f.longitude, f.radius_meters, f.address_json
     FROM order_facility_sequence ofs
     INNER JOIN facilities f ON f.id = ofs.facility_id
     WHERE ofs.transport_order_id = ?
     ORDER BY ofs.sequence_order ASC`,
    [orderId]
  );
}

async function activateGeofence(orderId, facilityId, areaName) {
  await query(
    `UPDATE order_facility_sequence
     SET area_name = ?, geofence_active = 1, geofence_provisioned = 1
     WHERE transport_order_id = ? AND facility_id = ?`,
    [areaName, orderId, facilityId]
  );
}

async function setAreaName(orderId, facilityId, areaName) {
  await query(
    `UPDATE order_facility_sequence
     SET area_name = ?
     WHERE transport_order_id = ? AND facility_id = ?`,
    [areaName, orderId, facilityId]
  );
}

async function listPendingGeofenceProvisioningRows() {
  return query(
    `SELECT a.id AS assignment_id,
            a.imei,
            ofs.transport_order_id,
            ofs.facility_id,
            ofs.sequence_order,
            ofs.area_name,
            f.latitude,
            f.longitude,
            f.radius_meters
     FROM assignments a
     INNER JOIN order_facility_sequence ofs ON ofs.transport_order_id = a.transport_order_id
     INNER JOIN facilities f ON f.id = ofs.facility_id
     WHERE a.is_active = 1
       AND ofs.geofence_provisioned = 0
     ORDER BY a.id ASC, ofs.sequence_order ASC`
  );
}

module.exports = {
  listOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderFacilities,
  activateGeofence,
  setAreaName,
  listPendingGeofenceProvisioningRows,
};
