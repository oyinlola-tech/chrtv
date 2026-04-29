const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateCredentials,
  validateCreateUser,
  validatePasswordReset,
  validateDeviceCommand,
  validateIntegrationConfigUpdate,
} = require('../admin-api/src/middleware/validators');

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

test('validateDeviceCommand rejects control characters in params', () => {
  const req = {
    body: {
      imei: '123456789012345',
      keyword: '121',
      params: 'area01\r\nshutdown',
    },
  };
  const res = createRes();
  let called = false;

  validateDeviceCommand(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.match(res.payload.error, /unsupported/i);
});

test('validateCredentials accepts email login identifiers', () => {
  const req = {
    body: {
      identifier: 'operator1@example.com',
      password: 'operator@2024',
    },
  };
  const res = createRes();
  let called = false;

  validateCredentials(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.body.identifier, 'operator1@example.com');
});

test('validateCreateUser requires email and normalizes it', () => {
  const req = {
    body: {
      username: 'operator1',
      email: 'Operator1@Example.com ',
      password: 'operator@2024',
      role: 'operator',
    },
  };
  const res = createRes();
  let called = false;

  validateCreateUser(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.body.email, 'operator1@example.com');
});

test('validatePasswordReset rejects invalid otp values', () => {
  const req = {
    body: {
      email: 'operator1@example.com',
      otp: '12ab56',
      password: 'operator@2024',
    },
  };
  const res = createRes();
  let called = false;

  validatePasswordReset(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.match(res.payload.error, /6-digit/i);
});

test('validateIntegrationConfigUpdate normalizes valid option1 URLs', () => {
  const req = {
    body: {
      active_option: 'option1',
      option1_api_base_url: 'https://api.example.com/path?q=1',
      option1_auth_token: 'placeholdertoken',
      option1_coordinates_interval_seconds: '300',
    },
  };
  const res = createRes();
  let called = false;

  validateIntegrationConfigUpdate(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.body.option1_api_base_url, 'https://api.example.com');
  assert.equal(req.body.option1_coordinates_interval_seconds, 300);

  const invalidReq = {
    body: {
      option1_coordinates_interval_seconds: '299',
    },
  };
  const invalidRes = createRes();
  let invalidCalled = false;

  validateIntegrationConfigUpdate(invalidReq, invalidRes, () => {
    invalidCalled = true;
  });

  assert.equal(invalidCalled, false);
  assert.equal(invalidRes.statusCode, 400);
  assert.match(invalidRes.payload.error, /300 and 600/i);
});

test('validateIntegrationConfigUpdate requires base URL for option1 mode', () => {
  const req = {
    body: {
      active_option: 'option1',
    },
  };
  const res = createRes();
  let called = false;

  validateIntegrationConfigUpdate(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.match(res.payload.error, /required/i);
});
