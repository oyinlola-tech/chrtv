const express = require('express');
const Position = require('../models/position');
const positionStore = require('../services/positionStore');
const geofenceEngine = require('../services/geofenceEngine');
const eventDetector = require('../services/eventDetector');
const {
  applyServiceSecurity,
  requireLoopback,
  serviceErrorHandler,
} = require('../../../shared/serviceSecurity');

const router = express.Router();
const ALLOWED_TYPES = new Set(['position', 'geofence', 'alarm', 'unknown']);

function hasUsableGps(payload) {
  return (
    payload?.data?.gpsValid === true &&
    payload?.data?.latitude != null &&
    payload?.data?.longitude != null
  );
}

function validatePayload(payload) {
  // Validate IMEI
  if (!/^\d{15,20}$/.test(String(payload.imei || ''))) {
    return { valid: false, error: 'imei must be 15-20 digits' };
  }

  // Validate type
  if (!payload.type || !ALLOWED_TYPES.has(payload.type)) {
    return { valid: false, error: 'type is required and must be position, geofence, alarm, or unknown' };
  }

  // Validate data object
  if (typeof payload.data !== 'object' || payload.data === null || Array.isArray(payload.data)) {
    return { valid: false, error: 'data must be a JSON object' };
  }

  return { valid: true };
}

function hasUsableTimestamp(payload) {
  return typeof payload?.data?.utcTimestamp === 'string' && payload.data.utcTimestamp.length > 0;
}

function requiresUtcTimestamp(payload) {
  return payload?.type === 'position' || payload?.type === 'geofence';
}

router.post('/', requireLoopback, async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  const validation = validatePayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const payload = new Position(req.body);

  if (requiresUtcTimestamp(payload) && !hasUsableTimestamp(payload)) {
    return res.status(400).json({ error: 'utcTimestamp is required for position and geofence payloads' });
  }

  try {
    await positionStore.storePosition(payload);
    const assignment = await eventDetector.getAssignment(payload.imei);

    if (payload.type === 'position' && assignment && hasUsableGps(payload)) {
      await eventDetector.sendCoordinate(payload, assignment);

      if (!assignment.useDeviceGeofence) {
        const events = await geofenceEngine.evaluate(payload, assignment);
        for (const event of events) {
          const enriched = await eventDetector.enrichEvent(event, assignment);
          await eventDetector.sendEvent(enriched);
        }
      }
    }

    if (payload.type === 'geofence' && assignment) {
      if (!hasUsableGps(payload)) {
        return res.json({ ok: true, skipped: true, reason: 'invalid_geofence_gps' });
      }

      const areaFacility = assignment.facilities.find(
        (facility) => facility.area_name === payload.data.areaName
      );

      if (areaFacility) {
        const event = {
          imei: payload.imei,
          event_type: payload.data.direction === 'in' ? 'ARRI' : 'DEPA',
          facility_id: areaFacility.id,
          timestamp: payload.data.utcTimestamp,
          lat: payload.data.latitude,
          lng: payload.data.longitude,
          transport_order_id: assignment.transport_order_id,
        };
        const enriched = await eventDetector.enrichEvent(event, assignment);
        await eventDetector.sendEvent(enriched);
      }
    }

    if (payload.type === 'alarm') {
      console.log('Alarm received', payload.imei, payload.data.keyword);
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('ingest failed', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
