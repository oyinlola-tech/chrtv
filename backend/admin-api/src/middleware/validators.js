const USERNAME_RE = /^[a-zA-Z0-9_]{3,50}$/;

function hasWhitespace(value) {
  for (const char of value) {
    if (char.trim() === '') {
      return true;
    }
  }

  return false;
}

function isEmailLocalPart(value) {
  return value.length > 0 && !value.includes('@') && !hasWhitespace(value);
}

function isEmailDomainPart(value) {
  if (!value || value.startsWith('.') || value.endsWith('.')) {
    return false;
  }

  const labels = value.split('.');
  if (labels.length < 2) {
    return false;
  }

  return labels.every(
    (label) => label.length > 0 && !label.includes('@') && !label.includes('.') && !hasWhitespace(label)
  );
}

function isEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0 || atIndex !== normalized.lastIndexOf('@')) {
    return false;
  }

  const localPart = normalized.slice(0, atIndex);
  const domainPart = normalized.slice(atIndex + 1);
  return isEmailLocalPart(localPart) && isEmailDomainPart(domainPart);
}

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

function validatePassword(password, res) {
  if (typeof password !== 'string') {
    return badRequest(res, 'password is required');
  }

  if (password.length < 8 || password.length > 128) {
    return badRequest(res, 'password must be between 8 and 128 characters');
  }

  return null;
}

function validateCredentials(req, res, next) {
  const { identifier, password } = req.body || {};
  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return badRequest(res, 'identifier and password are required');
  }

  const normalizedIdentifier = identifier.trim();
  if (!isEmail(normalizedIdentifier) && !USERNAME_RE.test(normalizedIdentifier)) {
    return badRequest(res, 'identifier must be a valid username or email address');
  }

  const passwordError = validatePassword(password, res);
  if (passwordError) {
    return passwordError;
  }

  req.body.identifier = normalizedIdentifier;
  return next();
}

function validateCreateUser(req, res, next) {
  const { username, email, password, role } = req.body || {};

  if (role && !['admin', 'operator'].includes(role)) {
    return badRequest(res, 'role must be admin or operator');
  }

  if (typeof username !== 'string' || !USERNAME_RE.test(username.trim())) {
    return badRequest(res, 'username must be 3-50 characters (alphanumeric and underscore only)');
  }

  if (typeof email !== 'string' || !isEmail(email)) {
    return badRequest(res, 'email must be a valid email address');
  }

  const passwordError = validatePassword(password, res);
  if (passwordError) {
    return passwordError;
  }

  req.body.username = username.trim();
  req.body.email = email.trim().toLowerCase();
  return next();
}

function validateOtpRequest(req, res, next) {
  const { identifier } = req.body || {};
  if (typeof identifier !== 'string') {
    return badRequest(res, 'identifier is required');
  }

  const normalizedIdentifier = identifier.trim();
  if (!isEmail(normalizedIdentifier) && !USERNAME_RE.test(normalizedIdentifier)) {
    return badRequest(res, 'identifier must be a valid username or email address');
  }

  req.body.identifier = normalizedIdentifier;
  return next();
}

function validatePasswordReset(req, res, next) {
  const { email, otp, password } = req.body || {};
  if (typeof email !== 'string' || !isEmail(email)) {
    return badRequest(res, 'email must be a valid email address');
  }

  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
    return badRequest(res, 'otp must be a 6-digit code');
  }

  const passwordError = validatePassword(password, res);
  if (passwordError) {
    return passwordError;
  }

  req.body.email = email.trim().toLowerCase();
  req.body.otp = otp.trim();
  return next();
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
  const normalizedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  const normalizedParams = typeof params === 'string' ? params.trim() : params;

  if (!/^\d{15,20}$/.test(String(imei || ''))) {
    return badRequest(res, 'imei must be 15 to 20 digits');
  }

  if (!/^[A-Za-z0-9]{1,20}$/.test(normalizedKeyword)) {
    return badRequest(res, 'keyword must be 1-20 alphanumeric characters');
  }

  if (
    normalizedParams != null &&
    (typeof normalizedParams !== 'string' || !/^[A-Za-z0-9,.:+\-_/ ]{0,500}$/.test(normalizedParams))
  ) {
    return badRequest(res, 'params contains unsupported characters');
  }

  req.body.keyword = normalizedKeyword;
  req.body.params = normalizedParams;
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
    if (!Number.isInteger(value) || value < 300 || value > 600) {
      return badRequest(res, 'option1_coordinates_interval_seconds must be between 300 and 600 seconds (5 to 10 minutes)');
    }
    req.body.option1_coordinates_interval_seconds = value;
  }

  if (baseUrl != null && (typeof baseUrl !== 'string' || baseUrl.length > 255)) {
    return badRequest(res, 'option1_api_base_url must be a string up to 255 characters');
  }

  if (baseUrl) {
    let parsed;
    try {
      parsed = new URL(baseUrl);
    } catch (_error) {
      return badRequest(res, 'option1_api_base_url must be a valid absolute URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return badRequest(res, 'option1_api_base_url must use http or https and must not include credentials');
    }

    req.body.option1_api_base_url = parsed.origin;
  }

  if (authToken != null && (typeof authToken !== 'string' || authToken.length > 1024)) {
    return badRequest(res, 'option1_auth_token must be a string up to 1024 characters');
  }

  if (activeOption === 'option1' && !req.body.option1_api_base_url && !baseUrl) {
    return badRequest(res, 'option1_api_base_url is required when active_option is option1');
  }

  if (activeOption === 'option1' && (!authToken || authToken.trim().length === 0)) {
    return badRequest(res, 'option1_auth_token is required when active_option is option1');
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
  validateOtpRequest,
  validatePasswordReset,
  validateNumericIdParam,
  validateDashboardLimit,
  validateDeviceCommand,
  validateIntegrationConfigUpdate,
  requireLoopback,
};
