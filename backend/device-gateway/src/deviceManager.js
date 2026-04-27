const devices = new Map();

function register(imei, socket) {
  devices.set(imei, {
    imei,
    socket,
    connectedAt: new Date(),
    lastSeenAt: new Date(),
  });
}

function touch(imei) {
  const device = devices.get(imei);
  if (device) {
    device.lastSeenAt = new Date();
  }
}

function unregisterBySocket(socket) {
  for (const [imei, device] of devices.entries()) {
    if (device.socket === socket) {
      devices.delete(imei);
      break;
    }
  }
}

function getSocket(imei) {
  const device = devices.get(imei);
  return device ? device.socket : null;
}

function listDevices() {
  return Array.from(devices.values()).map((device) => ({
    imei: device.imei,
    connectedAt: device.connectedAt,
    lastSeenAt: device.lastSeenAt,
  }));
}

module.exports = {
  register,
  touch,
  unregisterBySocket,
  getSocket,
  listDevices,
};

