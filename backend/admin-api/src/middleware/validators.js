function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireJsonObjectBody(req, res, next) {
  if (!isPlainObject(req.body)) {
    return badRequest(res, 'Request body must be a JSON object');
  }

  return next();
}

function validateCredentials(req, res, next) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return badRequest(res, 'username and password are required');
  }

  const normalizedUsername = username.trim();
  // Enforce stricter username validation: alphanumeric and underscore only
  if (!/^[a-zA-Z0-9_]{3,50}$/.test(normalizedUsername)) {
    return badRequest(res, 'username must be 3-50 characters (alphanumeric and underscore only)');
  }

  if (password.length < 8 || password.length > 128) {
    return badRequest(res, 'password must be between 8 and 128 characters');
  }

  req.body.username = normalizedUsername;
  return next();
}

function validateCreateUser(req, res, next) {
  const { role } = req.body || {};
  if (role && !['admin', 'operator'].includes(role)) {
    return badRequest(res, 'role must be admin or operator');
  }

  return validateCredentials(req, res, next);
}

function validateNumericIdParam(paramName = 'id') {
  return function validateId(req, res, next) {
    const raw = req.params[paramName];
    if (!/^\d+$/.test(String(raw))) {
      return badRequest(res, `${paramName} must be a positive integer`);
    }

    return next();
  };
}

function validateDashboardLimit(req, res, next) {
  if (req.query.limit == null) {
    return next();
  }

  const limit = Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return badRequest(res, 'limit must be an integer between 1 and 500');
  }

  req.query.limit = limit;
  return next();
}

function validateDeviceCommand(req, res, next) {
  const { imei, keyword, params } = req.body || {};
  if (!/^\d{15,20}$/.test(String(imei || ''))) {
    return badRequest(res, 'imei must be 15 to 20 digits');
  }

  if (typeof keyword !== 'string' || keyword.trim().length === 0 || keyword.length > 100) {
    return badRequest(res, 'keyword is required');
  }

  if (params != null && (typeof params !== 'string' || params.length > 500)) {
    return badRequest(res, 'params must be a string up to 500 characters');
  }

  req.body.keyword = keyword.trim();
  req.body.params = typeof params === 'string' ? params.trim() : params;
  return next();
}

function validateIntegrationConfigUpdate(req, res, next) {
  const {
    active_option: activeOption,
    option1_coordinates_interval_seconds: interval,
    option1_api_base_url: baseUrl,
    option1_auth_token: authToken,
  } = req.body || {};

  if (activeOption && !['option1', 'option2'].includes(activeOption)) {
    return badRequest(res, 'active_option must be option1 or option2');
  }

  if (interval != null) {
    const value = Number(interval);
    if (!Number.isInteger(value) || value < 60 || value > 86400) {
      return badRequest(res, 'option1_coordinates_interval_seconds must be between 60 and 86400');
    }
    req.body.option1_coordinates_interval_seconds = value;
  }

  if (baseUrl != null && (typeof baseUrl !== 'string' || baseUrl.length > 255)) {
    return badRequest(res, 'option1_api_base_url must be a string up to 255 characters');
  }

  if (authToken != null && (typeof authToken !== 'string' || authToken.length > 1024)) {
    return badRequest(res, 'option1_auth_token must be a string up to 1024 characters');
  }

  return next();
}

function requireLoopback(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || '';
  const allowed = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  if (!allowed.has(ip)) {
    return res.status(403).json({ error: 'This endpoint is only available from loopback' });
  }

  return next();
}

module.exports = {
  requireJsonObjectBody,
  validateCredentials,
  validateCreateUser,
  validateNumericIdParam,
  validateDashboardLimit,
  validateDeviceCommand,
  validateIntegrationConfigUpdate,
  requireLoopback,
};

