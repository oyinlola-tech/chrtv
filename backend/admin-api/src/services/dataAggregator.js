const { createHttpClient } = require('../../../shared/http');
const { getInternalServiceUrl } = require('../../../shared/internalServices');

const client = createHttpClient();
const snapshotCache = new Map();

function clampLimit(limit) {
  const normalized = Number(limit || 100);
  if (!Number.isInteger(normalized)) {
    return 100;
  }

  return Math.max(1, Math.min(normalized, 500));
}

function getCacheTtlMs() {
  return Number(process.env.DASHBOARD_CACHE_TTL_MS || 3000);
}

async function fetchSnapshot(limit) {
  const [positionsRes, eventsRes, ordersRes, assignmentsRes, devicesRes, configRes] = await Promise.all([
    client.get(`${getInternalServiceUrl('TRACKING_SERVICE_URL')}/positions/latest`, {
      params: { limit },
    }),
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
    generatedAt: new Date().toISOString(),
    stats: {
      deviceCount: devices.length,
      activeAssignments: assignments.filter((item) => item.is_active).length,
      activeOrders: orders.filter((item) => item.status === 'IN_PROGRESS').length,
      plannedOrders: orders.filter((item) => item.status === 'PLANNED').length,
      recentPositions: positions,
      recentEvents: events,
      integrationOption: integrationConfig.active_option,
    },
    positions,
    events,
  };
}

async function getDashboardSnapshot(limit = 100) {
  const normalizedLimit = clampLimit(limit);
  const cacheKey = String(normalizedLimit);
  const now = Date.now();
  const existing = snapshotCache.get(cacheKey);

  if (existing?.value && existing.expiresAt > now) {
    return existing.value;
  }

  if (existing?.pending) {
    return existing.pending;
  }

  const pending = fetchSnapshot(normalizedLimit)
    .then((value) => {
      snapshotCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + getCacheTtlMs(),
      });
      return value;
    })
    .catch((error) => {
      snapshotCache.delete(cacheKey);
      throw error;
    });

  snapshotCache.set(cacheKey, { pending, expiresAt: 0 });
  return pending;
}

async function getStats() {
  const snapshot = await getDashboardSnapshot(100);
  return snapshot.stats;
}

async function getPositions(limit = 100) {
  const snapshot = await getDashboardSnapshot(limit);
  return snapshot.positions;
}

async function getEvents() {
  const snapshot = await getDashboardSnapshot(100);
  return snapshot.events;
}

module.exports = {
  getStats,
  getPositions,
  getEvents,
  getDashboardSnapshot,
};
