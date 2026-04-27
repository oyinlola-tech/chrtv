function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20 } = {}) {
  const buckets = new Map();

  return function rateLimit(req, res, next) {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }

    return next();
  };
}

module.exports = {
  createRateLimiter,
};

