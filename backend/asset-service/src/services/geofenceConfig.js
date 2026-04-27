const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');
const assignmentModel = require('../models/assignment');

const client = createHttpClient();

function areaName(index) {
  return `area${String(index).padStart(2, '0')}`;
}

async function sendToDevice(assignmentId) {
  const assignment = await assignmentModel.getAssignmentById(assignmentId);
  const enriched = await assignmentModel.getAssignmentByImei(assignment.imei);
  const baseUrl = getInternalServiceUrl('DEVICE_GATEWAY_URL');

  const facilities = enriched.facilities.slice(0, 5);
  for (let index = 0; index < facilities.length; index += 1) {
    const facility = facilities[index];
    const area = areaName(index + 1);
    const params = `${facility.latitude},${facility.longitude} ${area},${facility.radius_meters}m`;
    await client.post(`${baseUrl}/command`, {
      imei: enriched.imei,
      keyword: '121',
      params,
    });
  }
}

module.exports = {
  sendToDevice,
};
