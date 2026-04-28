const test = require('node:test');
const assert = require('node:assert/strict');

const { parse } = require('../device-gateway/src/deviceProtocol');

test('parses COBAN login-free position packets into normalized coordinates', () => {
  const payload = parse('imei:123456789012345,001,240428,080000,F,080000,A,0651.4640,N,00323.1840,E,45,180,12,1,0,75%,200,31;');

  assert.equal(payload.imei, '123456789012345');
  assert.equal(payload.type, 'position');
  assert.equal(payload.data.gpsValid, true);
  assert.equal(payload.data.latitude, 6.8577333);
  assert.equal(payload.data.longitude, 3.3864);
  assert.equal(payload.data.speed, 45);
});

test('parses COBAN area in/out packets as geofence events', () => {
  const payload = parse('imei:123456789012345,area01 in,240428,080000,F,080000,A,0651.4640,N,00323.1840,E,0,180,12,1,0,75%,200,31;');

  assert.equal(payload.type, 'geofence');
  assert.equal(payload.data.areaName, 'area01');
  assert.equal(payload.data.direction, 'in');
});

test('parses known alarm packets', () => {
  const payload = parse('imei:123456789012345,low battery,240428,080000,F,080000,A,0651.4640,N,00323.1840,E,0,180,12,1,0,15%,200,31;');

  assert.equal(payload.type, 'alarm');
  assert.equal(payload.data.keyword, 'low battery');
  assert.equal(payload.data.fuel1Percent, 15);
});

test('treats GPS as invalid unless both fix flags are valid', () => {
  const payload = parse('imei:123456789012345,001,240428,080000,L,080000,A,0651.4640,N,00323.1840,E,45,180,12,1,0,75%,200,31;');

  assert.equal(payload.type, 'position');
  assert.equal(payload.data.gpsValid, false);
});

test('parses extended 001 packets with embedded fuel and temperature prefix', () => {
  const payload = parse('imei:123456789012345,001 0.1% +28.0,240428,080000,F,080000,A,0651.4640,N,00323.1840,E,45,180,12,1,0,75%,200,31;');

  assert.equal(payload.type, 'position');
  assert.equal(payload.data.keyword, '001');
  assert.equal(payload.data.gpsValid, true);
  assert.equal(payload.data.fuel1Percent, 0.1);
  assert.equal(payload.data.temperature, 28);
});
