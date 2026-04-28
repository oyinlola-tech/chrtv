require('../shared/env').loadEnv();
const express = require('express');
const tcpServer = require('./src/tcpServer');
const commandRoutes = require('./src/routes/commands');
const deviceManager = require('./src/deviceManager');
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
app.use('/command', commandRoutes);
app.use('/api/command', commandRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'device-gateway' });
});

app.get('/devices', (_req, res) => {
  res.json({ devices: deviceManager.listDevices() });
});

app.use(serviceErrorHandler);

const port = Number(process.env.DGW_API_PORT);
const host = getServiceHost('DGW_API_HOST');

app.listen(port, host, () => {
  console.log(`device-gateway http listening on ${host}:${port}`);
});

tcpServer.start();
