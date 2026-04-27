const net = require('net');
const deviceManager = require('./deviceManager');
const deviceProtocol = require('./deviceProtocol');
const eventPublisher = require('./eventPublisher');

function handleFrame(frame, socket) {
  const trimmed = String(frame).trim();
  if (!trimmed) {
    return;
  }

  if (/^##,imei:\d{15},A;?$/i.test(trimmed)) {
    const imei = trimmed.match(/imei:(\d{15})/i)[1];
    deviceManager.register(imei, socket);
    socket.write('LOAD\n');
    return;
  }

  if (/^\d{15}$/.test(trimmed)) {
    deviceManager.touch(trimmed);
    socket.write('ON\n');
    return;
  }

  if (trimmed.startsWith('imei:')) {
    const parsed = deviceProtocol.parse(trimmed);
    if (parsed) {
      deviceManager.touch(parsed.imei);
      eventPublisher.publish(parsed).catch((error) => {
        console.error('Failed to publish device payload', error.message);
      });
    }
  }
}

function start() {
  const tcpPort = Number(process.env.DGW_PORT || 5000);
  const server = net.createServer((socket) => {
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      buffer = buffer.replace(/\r/g, '');
      const frames = buffer.split(/\n|;/);
      buffer = frames.pop() || '';
      frames.forEach((frame) => handleFrame(frame, socket));
    });

    socket.on('close', () => {
      deviceManager.unregisterBySocket(socket);
    });

    socket.on('error', () => {
      deviceManager.unregisterBySocket(socket);
    });
  });

  server.listen(tcpPort, () => {
    console.log(`device-gateway tcp listening on ${tcpPort}`);
  });
}

module.exports = {
  start,
};
