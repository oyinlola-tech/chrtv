require('../shared/env').loadEnv();
const express = require('express');
const ingestRoute = require('./src/routes/ingest');
const positionStore = require('./src/services/positionStore');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'tracking-service' }));
app.use('/ingest', ingestRoute);

app.get('/positions/latest', async (_req, res) => {
  const positions = await positionStore.getLatestPositions();
  res.json({ positions });
});

app.get('/positions/recent', async (req, res) => {
  const limit = Number(req.query.limit || 50);
  const positions = await positionStore.getRecentPositions(limit);
  res.json({ positions });
});

app.get('/events/recent', async (_req, res) => {
  const events = positionStore.getRecentEvents();
  res.json({ events });
});

const port = Number(process.env.TS_PORT || 3001);
app.listen(port, () => {
  console.log(`tracking-service listening on ${port}`);
});
