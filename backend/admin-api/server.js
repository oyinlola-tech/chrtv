require('../shared/env').loadEnv();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const { createRateLimiter } = require('./src/middleware/rateLimit');
const errorHandler = require('./src/middleware/errorHandler');
const authMiddleware = require('./src/middleware/auth');
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const dashboardRoutes = require('./src/routes/dashboard');
const ordersRoutes = require('./src/routes/orders');
const devicesRoutes = require('./src/routes/devices');
const integrationRoutes = require('./src/routes/integration');
const { ensureInitialAdmin } = require('./src/services/bootstrapAdmin');
const { buildOpenApiSpec } = require('../docs/openapi');

const app = express();
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, skipSuccessfulRequests: true });
const docsRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
const readRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 180 });
const writeRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 });
app.disable('x-powered-by');
app.set('trust proxy', false);
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:4000')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://unpkg.com'],
      "style-src": ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
      "font-src": ["'self'", 'https://fonts.gstatic.com', 'data:'],
      "img-src": ["'self'", 'data:', 'https:'],
      "connect-src": ["'self'", 'http://localhost:4000', 'http://127.0.0.1:4000'],
    },
  },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin denied'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'admin-api' }));
app.get('/api/docs/openapi.json', docsRateLimit, (_req, res) => {
  res.json(buildOpenApiSpec());
});
app.use('/api/docs', docsRateLimit, swaggerUi.serve, swaggerUi.setup(buildOpenApiSpec(), {
  swaggerOptions: {
    persistAuthorization: true,
  },
}));
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/users', authMiddleware, writeRateLimit, usersRoutes);
app.use('/api/dashboard', authMiddleware, readRateLimit, dashboardRoutes);
app.use('/api', authMiddleware, writeRateLimit, ordersRoutes);
app.use('/api/devices', authMiddleware, writeRateLimit, devicesRoutes);
app.use('/api/integration', authMiddleware, writeRateLimit, integrationRoutes);

app.get('/', (_req, res) => {
  res.redirect('/auth/login');
});

app.use(errorHandler);

const port = Number(process.env.AA_PORT || 4000);
app.listen(port, async () => {
  try {
    const result = await ensureInitialAdmin();
    if (result.created) {
      console.log(`admin-api created initial admin user: ${result.username}`);
    }
  } catch (error) {
    console.error(`admin-api initial admin bootstrap failed: ${error.message}`);
  }

  console.log(`admin-api listening on ${port}`);
});
