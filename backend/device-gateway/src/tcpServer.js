const net = require('net');
const deviceManager = require('./deviceManager');
const deviceProtocol = require('./deviceProtocol');
const eventPublisher = require('./eventPublisher');

const MAX_BUFFER_LENGTH = 16 * 1024;
const MAX_FRAME_LENGTH = 2048;
const HANDSHAKE_TIMEOUT = 10_000;

function safeWrite(socket, payload) {
  if (!socket.destroyed && socket.writable) {
    socket.write(payload);
  }
}

function setDeviceIdentity(socket, imei) {
  deviceManager.setSocketImei(socket, imei);
  deviceManager.ensureRegistered(imei, socket);
}

function handleFrame(frame, socket) {
  const trimmed = String(frame).trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.length > MAX_FRAME_LENGTH) {
    // Silently drop oversized frames
    return false;
  }

  // Login packet: ##,imei:XXXXXXXXXXXXXXX,A;
  if (/^##,imei:(\d{15}),A;?$/i.test(trimmed)) {
    const imei = trimmed.match(/imei:(\d{15})/i)[1];
    setDeviceIdentity(socket, imei);
    // COBAN examples show a bare LOAD reply without CR/LF; we keep LF for field interoperability.
    safeWrite(socket, 'LOAD\n');
    return true;
  }

  // Heartbeat: XXXXXXXXXXXXXXX
  if (/^\d{15}$/.test(trimmed)) {
    setDeviceIdentity(socket, trimmed);
    // COBAN examples show a bare ON reply without CR/LF; we keep LF for field interoperability.
    safeWrite(socket, 'ON\n');
    return true;
  }

  // Data packet: imei:...
  if (trimmed.startsWith('imei:')) {
    const parsed = deviceProtocol.parse(trimmed);
    if (parsed) {
      setDeviceIdentity(socket, parsed.imei);
      eventPublisher.publish(parsed).catch((error) => {
        console.error('Failed to publish device payload', error.message);
      });
      return true;
    }
  }

  return false;
}

function start() {
  const tcpPort = Number(process.env.DGW_PORT || 5000);
  const tcpHost = process.env.DGW_HOST || '127.0.0.1';
  const server = net.createServer((socket) => {
    let buffer = '';
    let hasImei = false;

    socket.setKeepAlive(true, 30_000);
    socket.setNoDelay(true);
    socket.setTimeout(120_000);

    // Set handshake timeout
    const handshakeTimer = setTimeout(() => {
      if (!hasImei) {
        socket.destroy();
      }
    }, HANDSHAKE_TIMEOUT);

    socket.on('data', (chunk) => {
      // Prevent buffer overflow attacks
      buffer += chunk.toString();

      if (buffer.length > MAX_BUFFER_LENGTH) {
        // Buffer overflow protection
        socket.destroy();
        clearTimeout(handshakeTimer);
        deviceManager.unregisterBySocket(socket);
        return;
      }

      buffer = buffer.replace(/\r/g, '');
      const frames = buffer.split(/\n|;/);
      buffer = frames.pop() || '';

      frames.forEach((frame) => {
        if (handleFrame(frame, socket)) {
          hasImei = true;
          clearTimeout(handshakeTimer);
        }
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      clearTimeout(handshakeTimer);
      deviceManager.unregisterBySocket(socket);
    });

    socket.on('close', () => {
      clearTimeout(handshakeTimer);
      deviceManager.unregisterBySocket(socket);
    });

    socket.on('error', (error) => {
      clearTimeout(handshakeTimer);
      if (error.code !== 'ECONNRESET') {
        console.error('socket error', error.message);
      }
      deviceManager.unregisterBySocket(socket);
    });
  });

  server.maxConnections = Number(process.env.DGW_MAX_CONNECTIONS || 5000);
  server.on('error', (error) => {
    console.error('device-gateway tcp server error', error.message);
  });

  server.listen(tcpPort, tcpHost, () => {
    console.log(`device-gateway tcp listening on ${tcpHost}:${tcpPort}`);
  });
}

module.exports = {
  start,
  handleFrame,
  safeWrite,
};
