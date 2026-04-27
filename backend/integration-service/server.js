require('../shared/env').loadEnv();
const express = require('express');
const configRoute = require('./src/routes/config');
const coordinatesRoute = require('./src/routes/coordinates');
const eventsRoute = require('./src/routes/events');
const configModel = require('./src/models/config');
const logModel = require('./src/models/log');
const throttleManager = require('./src/services/throttleManager');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'integration-service' }));
app.use('/config', configRoute);
app.use('/coordinates', coordinatesRoute);
app.use('/events', eventsRoute);

app.get('/logs/recent', async (_req, res) => {
  const logs = await logModel.listRecent();
  res.json({ logs });
});

const port = Number(process.env.IS_PORT || 3003);
app.listen(port, async () => {
  const config = await configModel.ensureRow();
  throttleManager.start(config.option1_coordinates_interval_seconds);
  console.log(`integration-service listening on ${port}`);
});
