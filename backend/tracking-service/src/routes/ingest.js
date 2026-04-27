const express = require('express');
const Position = require('../models/position');
const positionStore = require('../services/positionStore');
const geofenceEngine = require('../services/geofenceEngine');
const eventDetector = require('../services/eventDetector');

const router = express.Router();

function hasDeviceSideGeofence(assignment) {
  if (!assignment || !Array.isArray(assignment.facilities)) {
    return false;
  }

  return (
    assignment.facilities.length > 0 &&
    assignment.facilities.length <= 5 &&
    assignment.facilities.every((facility) => facility.area_name)
  );
}

function hasUsableGps(payload) {
  return (
    payload?.data?.gpsValid === true &&
    payload?.data?.latitude != null &&
    payload?.data?.longitude != null
  );
}

router.post('/', async (req, res) => {
  const payload = new Position(req.body || {});

  if (!payload.imei || !payload.type) {
    return res.status(400).json({ error: 'imei and type are required' });
  }

  try {
    await positionStore.storePosition(payload);
    const assignment = await eventDetector.getAssignment(payload.imei);

    if (payload.type === 'position' && assignment && hasUsableGps(payload)) {
      await eventDetector.sendCoordinate(payload, assignment);

      if (!hasDeviceSideGeofence(assignment)) {
        const events = geofenceEngine.evaluate(payload, assignment);
        for (const event of events) {
          const enriched = await eventDetector.enrichEvent(event, assignment);
          await eventDetector.sendEvent(enriched);
        }
      }
    }

    if (payload.type === 'geofence' && assignment) {
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
