require('../shared/env').loadEnv();
const express = require('express');
const ingestRoute = require('./src/routes/ingest');
const positionStore = require('./src/services/positionStore');
const geofenceEngine = require('./src/services/geofenceEngine');
const {
  applyServiceSecurity,
  getServiceHost,
  requireLoopback,
  serviceErrorHandler,
} = require('../shared/serviceSecurity');

const app = express();
applyServiceSecurity(app);
app.use(express.json({ limit: '1mb' }));
app.use(requireLoopback);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'tracking-service' }));
app.use('/ingest', ingestRoute);

app.get('/positions/latest', async (_req, res) => {
  const limit = Number(_req.query.limit || 500);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return res.status(400).json({ error: 'limit must be an integer between 1 and 500' });
  }
  const positions = await positionStore.getLatestPositions(limit);
  res.json({ positions });
});

app.get('/positions/recent', async (req, res) => {
  const limit = Number(req.query.limit || 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return res.status(400).json({ error: 'limit must be an integer between 1 and 500' });
  }
  const positions = await positionStore.getRecentPositions(limit);
  res.json({ positions });
});

app.get('/events/recent', async (_req, res) => {
  const events = positionStore.getRecentEvents();
  res.json({ events });
});

app.use(serviceErrorHandler);

async function start() {
  await geofenceEngine.initialize();

  const port = Number(process.env.TS_PORT || 3001);
  const host = getServiceHost('TS_HOST');
  app.listen(port, host, () => {
    console.log(`tracking-service listening on ${host}:${port}`);
  });
}

start().catch((error) => {
  console.error('tracking-service failed to start', error);
  process.exit(1);
});
