require('../shared/env').loadEnv();
const express = require('express');
const ordersRoute = require('./src/routes/orders');
const facilitiesRoute = require('./src/routes/facilities');
const assignmentsRoute = require('./src/routes/assignments');
const lookupRoute = require('./src/routes/lookup');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'asset-service' }));
app.use('/orders', ordersRoute);
app.use('/facilities', facilitiesRoute);
app.use('/assignments', assignmentsRoute);
app.use('/internal', lookupRoute);

const port = Number(process.env.AS_PORT || 3002);
app.listen(port, () => {
  console.log(`asset-service listening on ${port}`);
});
