const test = require('node:test');
const assert = require('node:assert/strict');

const {
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

test('validateIntegrationConfigUpdate normalizes valid option1 URLs', () => {
  const req = {
    body: {
      active_option: 'option1',
      option1_api_base_url: 'https://api.example.com/path?q=1',
      option1_coordinates_interval_seconds: '600',
    },
  };
  const res = createRes();
  let called = false;

  validateIntegrationConfigUpdate(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.body.option1_api_base_url, 'https://api.example.com');
  assert.equal(req.body.option1_coordinates_interval_seconds, 600);
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
