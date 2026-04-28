const helmet = require('helmet');

const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function getRequestIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}

function requireLoopback(req, res, next) {
  if (!LOOPBACK_IPS.has(getRequestIp(req))) {
    return res.status(403).json({ error: 'This endpoint is only available from loopback' });
  }

  return next();
}

function applyServiceSecurity(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
  }));
}

function getServiceHost(envName, fallback = '127.0.0.1') {
  return process.env[envName] || fallback;
}

function serviceErrorHandler(error, _req, res, _next) {
  const status = error.statusCode || error.status || 500;
  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : error.message,
  });
}

module.exports = {
  applyServiceSecurity,
  getServiceHost,
  requireLoopback,
  serviceErrorHandler,
};
