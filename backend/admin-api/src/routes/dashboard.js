const express = require('express');
const dataAggregator = require('../services/dataAggregator');
const asyncHandler = require('../middleware/asyncHandler');
const { validateDashboardLimit } = require('../middleware/validators');

const router = express.Router();

router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await dataAggregator.getStats();
  res.json(stats);
}));

router.get('/positions', validateDashboardLimit, asyncHandler(async (req, res) => {
  const positions = await dataAggregator.getPositions(req.query.limit || 100);
  res.json({ positions });
}));

router.get('/events', asyncHandler(async (_req, res) => {
  const events = await dataAggregator.getEvents();
  res.json({ events });
}));

router.get('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const intervalMs = Number(process.env.DASHBOARD_STREAM_INTERVAL_MS || 5000);
  let closed = false;
  let lastPayload = '';

  const writeEvent = (eventName, payload) => {
    if (closed) {
      return;
    }

    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const publishSnapshot = async () => {
    try {
      const snapshot = await dataAggregator.getDashboardSnapshot(100);
      const serialized = JSON.stringify(snapshot);
      if (serialized !== lastPayload) {
        lastPayload = serialized;
        writeEvent('snapshot', snapshot);
      } else {
        writeEvent('heartbeat', { ts: new Date().toISOString() });
      }
    } catch (error) {
      writeEvent('error', { message: 'Live dashboard stream failed' });
    }
  };

  await publishSnapshot();
  const timer = setInterval(() => {
    publishSnapshot().catch(() => {});
  }, intervalMs);

  req.on('close', () => {
    closed = true;
    clearInterval(timer);
    res.end();
  });
});

module.exports = router;
