const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const positionStore = require('../tracking-service/src/services/positionStore');
const eventDetector = require('../tracking-service/src/services/eventDetector');
const geofenceEngine = require('../tracking-service/src/services/geofenceEngine');
const ingestRouter = require('../tracking-service/src/routes/ingest');

async function listen(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

test('ingest accepts and stores alarms that do not include utcTimestamp', async () => {
  const originalStorePosition = positionStore.storePosition;
  const originalGetAssignment = eventDetector.getAssignment;
  const originalEvaluate = geofenceEngine.evaluate;

  const storedPayloads = [];
  positionStore.storePosition = async (payload) => {
    storedPayloads.push(payload);
  };
  eventDetector.getAssignment = async () => null;
  geofenceEngine.evaluate = async () => [];

  const app = express();
  app.use(express.json());
  app.use('/', ingestRouter);
  const server = await listen(app);
  const address = server.address();

  try {
    const response = await fetch(`http://${address.address}:${address.port}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imei: '123456789012345',
        type: 'alarm',
        data: {
          rawMessage: 'imei:123456789012345,help me,240428,,L,,V,12345,67890;',
          keyword: 'help me',
          gpsSignal: 'L',
          gpsValid: false,
          utcTimestamp: null,
          latitude: null,
          longitude: null,
        },
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(storedPayloads.length, 1);
    assert.equal(storedPayloads[0].type, 'alarm');
    assert.equal(storedPayloads[0].data.utcTimestamp, null);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    positionStore.storePosition = originalStorePosition;
    eventDetector.getAssignment = originalGetAssignment;
    geofenceEngine.evaluate = originalEvaluate;
  }
});
