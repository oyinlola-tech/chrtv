const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');
const assignmentModel = require('../models/assignment');
const geofenceAckRegistry = require('./geofenceAckRegistry');
const orderModel = require('../models/order');

const client = createHttpClient();

function areaName(index) {
  return `area${String(index).padStart(2, '0')}`;
}

async function sendToDevice(assignmentId) {
  const assignment = await assignmentModel.getAssignmentById(assignmentId);
  if (!assignment) {
    const error = new Error('Assignment not found');
    error.status = 404;
    throw error;
  }

  const enriched = await assignmentModel.getAssignmentByImei(assignment.imei);
  if (!enriched) {
    return { queued: 0, skipped: true, reason: 'Assignment lookup returned no active device mapping' };
  }

  const baseUrl = getInternalServiceUrl('DEVICE_GATEWAY_URL');

  const facilities = enriched.facilities.slice(0, 5);
  geofenceAckRegistry.remove(
    enriched.imei,
    (item) => item.transport_order_id === enriched.transport_order_id
  );
  let queued = 0;
  for (let index = 0; index < facilities.length; index += 1) {
    const facility = facilities[index];
    const area = areaName(index + 1);
    const params = `${facility.latitude},${facility.longitude} ${area},${facility.radius_meters}m`;

    try {
      await client.post(`${baseUrl}/command`, {
        imei: enriched.imei,
        keyword: '121',
        params,
      });
      await orderModel.markGeofencePending(enriched.transport_order_id, facility.id);
      geofenceAckRegistry.enqueue(enriched.imei, {
        transport_order_id: enriched.transport_order_id,
        facility_id: facility.id,
        area_name: area,
        sequence_order: facility.sequence_order,
      });
      queued += 1;
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          queued,
          skipped: true,
          reason: 'Device is offline; assignment was saved but geofence commands could not be sent',
        };
      }

      throw error;
    }
  }

  return { queued, skipped: false };
}

async function resumePendingProvisioning() {
  const pendingRows = await orderModel.listPendingGeofenceProvisioningRows();
  geofenceAckRegistry.replaceAll(
    pendingRows.map((row) => ({
      imei: String(row.imei),
      transport_order_id: row.transport_order_id,
      facility_id: row.facility_id,
      area_name: row.area_name || areaName(row.sequence_order),
      sequence_order: row.sequence_order,
    }))
  );

  const assignments = await assignmentModel.listAssignmentsNeedingGeofenceProvisioning();
  for (const assignment of assignments) {
    try {
      await sendToDevice(assignment.id);
    } catch (error) {
      console.error(`Failed to resume geofence provisioning for assignment ${assignment.id}`, error.message);
    }
  }
}

module.exports = {
  areaName,
  resumePendingProvisioning,
  sendToDevice,
};
