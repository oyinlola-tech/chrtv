const devices = new Map();

function register(imei, socket) {
  const existing = devices.get(imei);
  if (existing?.socket && existing.socket !== socket && !existing.socket.destroyed) {
    existing.socket.destroy();
  }

  devices.set(imei, {
    imei,
    socket,
    connectedAt: new Date(),
    lastSeenAt: new Date(),
  });
}

function ensureRegistered(imei, socket) {
  const existing = devices.get(imei);
  if (!existing || existing.socket !== socket) {
    register(imei, socket);
    return;
  }

  existing.lastSeenAt = new Date();
}

function touch(imei) {
  const device = devices.get(imei);
  if (device) {
    device.lastSeenAt = new Date();
  }
}

function setSocketImei(socket, imei) {
  socket.__imei = imei;
}

function unregisterBySocket(socket) {
  if (socket.__imei && devices.get(socket.__imei)?.socket === socket) {
    devices.delete(socket.__imei);
    return;
  }

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
  ensureRegistered,
  touch,
  setSocketImei,
  unregisterBySocket,
  getSocket,
  listDevices,
};
