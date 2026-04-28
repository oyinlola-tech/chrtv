const { verifyToken } = require('../../../shared/jwt');

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    req.user = verifyToken(token);

    if (CSRF_METHODS.has(req.method)) {
      const csrfHeader = req.headers['x-csrf-token'];
      if (!csrfHeader || csrfHeader !== req.user.csrf) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }
    }

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
