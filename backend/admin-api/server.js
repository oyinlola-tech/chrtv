require('../shared/env').loadEnv();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createRateLimiter } = require('./src/middleware/rateLimit');
const authMiddleware = require('./src/middleware/auth');
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const dashboardRoutes = require('./src/routes/dashboard');
const ordersRoutes = require('./src/routes/orders');
const devicesRoutes = require('./src/routes/devices');
const integrationRoutes = require('./src/routes/integration');

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'admin-api' }));
app.use('/api/auth', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }), authRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api', authMiddleware, ordersRoutes);
app.use('/api/devices', authMiddleware, devicesRoutes);
app.use('/api/integration', authMiddleware, integrationRoutes);

app.get('/', (_req, res) => {
  res.redirect('/auth/login');
});

const port = Number(process.env.AA_PORT || 4000);
app.listen(port, () => {
  console.log(`admin-api listening on ${port}`);
});
