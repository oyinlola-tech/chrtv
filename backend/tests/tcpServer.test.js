const test = require('node:test');
const assert = require('node:assert/strict');

const deviceManager = require('../device-gateway/src/deviceManager');
const tcpServer = require('../device-gateway/src/tcpServer');

function createSocket() {
  return {
    destroyed: false,
    writable: true,
    writes: [],
    write(payload) {
      this.writes.push(payload);
    },
  };
}

function cleanupSocket(socket) {
  deviceManager.unregisterBySocket(socket);
}

test('handleFrame accepts login packets and responds with LOAD', () => {
  const socket = createSocket();

  const handled = tcpServer.handleFrame('##,imei:123456789012345,A', socket);

  assert.equal(handled, true);
  assert.deepEqual(socket.writes, ['LOAD\n']);
  cleanupSocket(socket);
});

test('handleFrame accepts heartbeat packets and responds with ON', () => {
  const socket = createSocket();

  const handled = tcpServer.handleFrame('123456789012345', socket);

  assert.equal(handled, true);
  assert.deepEqual(socket.writes, ['ON\n']);
  cleanupSocket(socket);
});

test('handleFrame ignores oversized frames', () => {
  const socket = createSocket();
  const handled = tcpServer.handleFrame(`imei:${'1'.repeat(2050)}`, socket);

  assert.equal(handled, false);
  assert.deepEqual(socket.writes, []);
});
