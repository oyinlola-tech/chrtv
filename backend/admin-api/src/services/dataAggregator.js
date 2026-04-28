const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');

const client = createHttpClient();

async function getStats() {
  const [positionsRes, eventsRes, ordersRes, assignmentsRes, devicesRes, configRes] = await Promise.all([
    client.get(`${getInternalServiceUrl('TRACKING_SERVICE_URL')}/positions/latest`),
    client.get(`${getInternalServiceUrl('TRACKING_SERVICE_URL')}/events/recent`),
    client.get(`${getInternalServiceUrl('ASSET_SERVICE_URL')}/orders`),
    client.get(`${getInternalServiceUrl('ASSET_SERVICE_URL')}/assignments`),
    client.get(`${getInternalServiceUrl('DEVICE_GATEWAY_URL')}/devices`),
    client.get(`${getInternalServiceUrl('INTEGRATION_SERVICE_URL')}/config`),
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
