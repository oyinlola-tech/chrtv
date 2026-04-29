const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, keyGenerator, skipSuccessfulRequests = false } = {}) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: keyGenerator || ((req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown')),
    validate: {
      trustProxy: false,
      xForwardedForHeader: false,
    },
    handler(_req, res) {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
  });
}

module.exports = {
  createRateLimiter,
};
