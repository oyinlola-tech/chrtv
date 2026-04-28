require('../shared/env').loadEnv();
const express = require('express');
const ordersRoute = require('./src/routes/orders');
const facilitiesRoute = require('./src/routes/facilities');
const assignmentsRoute = require('./src/routes/assignments');
const lookupRoute = require('./src/routes/lookup');
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

app.get('/health', (_req, res) => res.json({ ok: true, service: 'asset-service' }));
app.use('/orders', ordersRoute);
app.use('/facilities', facilitiesRoute);
app.use('/assignments', assignmentsRoute);
app.use('/internal', lookupRoute);

app.use(serviceErrorHandler);

const port = Number(process.env.AS_PORT || 3002);
const host = getServiceHost('AS_HOST');
app.listen(port, host, () => {
  console.log(`asset-service listening on ${host}:${port}`);
});
