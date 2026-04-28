const deviceManager = require('./deviceManager');

function sendCommand(imei, command) {
  const socket = deviceManager.getSocket(imei);
  if (!socket || socket.destroyed || !socket.writable) {
    throw new Error(`No active socket for IMEI ${imei}`);
  }

  const formatted = `**,imei:${imei},${command}\n`;
  socket.write(formatted);
  return formatted;
}

module.exports = {
  sendCommand,
};
