require('../shared/env').loadEnv();
const express = require('express');
const tcpServer = require('./src/tcpServer');
const commandRoutes = require('./src/routes/commands');
const deviceManager = require('./src/deviceManager');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use('/command', commandRoutes);
app.use('/api/command', commandRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'device-gateway' });
});

app.get('/devices', (_req, res) => {
  res.json({ devices: deviceManager.listDevices() });
});

const port = Number(process.env.DGW_API_PORT);

app.listen(port, () => {
  console.log(`device-gateway http listening on ${port}`);
});

tcpServer.start();
