const { createHttpClient } = require('../../../shared/http');

const client = createHttpClient();

async function getStats() {
  const trackingBase = process.env.TRACKING_SERVICE_URL || 'http://localhost:3001';
  const assetBase = process.env.ASSET_SERVICE_URL || 'http://localhost:3002';
  const deviceBase = process.env.DEVICE_GATEWAY_URL || 'http://localhost:5001';
  const integrationBase = process.env.INTEGRATION_SERVICE_URL || 'http://localhost:3003';

  const [positionsRes, eventsRes, ordersRes, assignmentsRes, devicesRes, configRes] = await Promise.all([
    client.get(`${trackingBase}/positions/latest`),
    client.get(`${trackingBase}/events/recent`),
    client.get(`${assetBase}/orders`),
    client.get(`${assetBase}/assignments`),
    client.get(`${deviceBase}/devices`),
    client.get(`${integrationBase}/config`),
  ]);

  const positions = positionsRes.data.positions || [];
  const events = eventsRes.data.events || [];
  const orders = ordersRes.data.orders || [];
  const assignments = assignmentsRes.data.assignments || [];
  const devices = devicesRes.data.devices || [];
  const integrationConfig = configRes.data.config || {};

  return {
    deviceCount: devices.length,
    activeAssignments: assignments.filter((item) => item.is_active).length,
    activeOrders: orders.filter((item) => item.status === 'IN_PROGRESS').length,
    plannedOrders: orders.filter((item) => item.status === 'PLANNED').length,
    recentPositions: positions,
    recentEvents: events,
    integrationOption: integrationConfig.active_option,
  };
}

module.exports = {
  getStats,
};
