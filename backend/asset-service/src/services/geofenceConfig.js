const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');
const assignmentModel = require('../models/assignment');
const orderModel = require('../models/order');

const client = createHttpClient();
const ACK_TIMEOUT_MS = Number(process.env.GEOFENCE_ACK_TIMEOUT_MS || 30000);
const RETRY_CHECK_INTERVAL_MS = Number(process.env.GEOFENCE_RETRY_INTERVAL_MS || 30000);
const RETRY_BASE_DELAY_MS = Number(process.env.GEOFENCE_RETRY_BASE_DELAY_MS || 30000);
const RETRY_MAX_DELAY_MS = Number(process.env.GEOFENCE_RETRY_MAX_DELAY_MS || 15 * 60 * 1000);
const provisioningAttempts = new Map();
let retryTimer = null;

function areaName(index) {
  return `area${String(index).padStart(2, '0')}`;
}

function getAttemptState(assignmentId) {
  return provisioningAttempts.get(String(assignmentId)) || {
    failureCount: 0,
    nextAttemptAt: 0,
    inFlight: false,
  };
}

function setAttemptState(assignmentId, nextState) {
  provisioningAttempts.set(String(assignmentId), nextState);
}

function clearAttemptState(assignmentId) {
  provisioningAttempts.delete(String(assignmentId));
}

function registerAttemptOutcome(assignmentId, shouldRetry) {
  if (!shouldRetry) {
    clearAttemptState(assignmentId);
    return;
  }

  const previous = getAttemptState(assignmentId);
  const failureCount = previous.failureCount + 1;
  const delayMs = Math.min(RETRY_BASE_DELAY_MS * (2 ** Math.max(0, failureCount - 1)), RETRY_MAX_DELAY_MS);
  setAttemptState(assignmentId, {
    failureCount,
    nextAttemptAt: Date.now() + delayMs,
    inFlight: false,
  });
}

async function resetTrackingState(imeis = []) {
  const baseUrl = getInternalServiceUrl('TRACKING_SERVICE_URL');
  const uniqueImeis = [...new Set(imeis.filter((imei) => /^\d{15,20}$/.test(String(imei || ''))))];

  await Promise.all(uniqueImeis.map(async (imei) => {
    await client.post(`${baseUrl}/internal/geofence-state/reset`, { imei });
  }));
}

async function prepareAssignmentProvisioning(orderId, imeis = [], assignmentId = null) {
  await orderModel.resetGeofenceProvisioning(orderId);
  await resetTrackingState(imeis);
  if (assignmentId != null) {
    clearAttemptState(assignmentId);
  }
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
  const attemptState = getAttemptState(assignmentId);
  if (attemptState.inFlight) {
    return { skipped: true, queued: 0, acknowledged: 0, timedOut: 0, reason: 'provisioning_already_in_progress' };
  }
  setAttemptState(assignmentId, { ...attemptState, inFlight: true });

  const facilities = enriched.facilities.slice(0, 5);
  let queued = 0;
  let acknowledged = 0;
  let timedOut = 0;
  try {
    for (let index = 0; index < facilities.length; index += 1) {
      const facility = facilities[index];
      const area = areaName(index + 1);
      const params = `${facility.latitude},${facility.longitude} ${area},${facility.radius_meters}m`;
      await orderModel.setAreaName(enriched.transport_order_id, facility.id, area);

      try {
        const response = await client.post(`${baseUrl}/command`, {
          imei: enriched.imei,
          keyword: '121',
          params,
          waitForAck: true,
          timeoutMs: ACK_TIMEOUT_MS,
          ackContext: {
            transport_order_id: enriched.transport_order_id,
            facility_id: facility.id,
            area_name: area,
          },
        });
        queued += 1;
        if (response.data?.acked) {
          acknowledged += 1;
          await orderModel.activateGeofence(enriched.transport_order_id, facility.id, area);
        } else {
          timedOut += 1;
        }
      } catch (error) {
        if (error.response?.status === 404) {
          registerAttemptOutcome(assignmentId, true);
          return {
            queued,
            acknowledged,
            timedOut,
            skipped: true,
            reason: 'Device is offline; assignment was saved but geofence commands could not be sent',
          };
        }

        throw error;
      }
    }

    registerAttemptOutcome(assignmentId, timedOut > 0 || acknowledged < facilities.length);
    return {
      queued,
      acknowledged,
      timedOut,
      skipped: false,
    };
  } catch (error) {
    setAttemptState(assignmentId, {
      ...getAttemptState(assignmentId),
      inFlight: false,
    });
    throw error;
  }
}

async function resumePendingProvisioning() {
  const now = Date.now();
  const assignments = await assignmentModel.listAssignmentsNeedingGeofenceProvisioning();
  for (const assignment of assignments) {
    const attemptState = getAttemptState(assignment.id);
    if (attemptState.inFlight || attemptState.nextAttemptAt > now) {
      continue;
    }

    try {
      await sendToDevice(assignment.id);
    } catch (error) {
      registerAttemptOutcome(assignment.id, true);
      console.error(`Failed to resume geofence provisioning for assignment ${assignment.id}`, error.message);
    }
  }
}

function startRetryLoop() {
  if (retryTimer) {
    clearInterval(retryTimer);
  }

  retryTimer = setInterval(() => {
    resumePendingProvisioning().catch((error) => {
      console.error('Periodic geofence provisioning retry failed', error.message);
    });
  }, RETRY_CHECK_INTERVAL_MS);
}

module.exports = {
  areaName,
  prepareAssignmentProvisioning,
  resumePendingProvisioning,
  sendToDevice,
  startRetryLoop,
};
