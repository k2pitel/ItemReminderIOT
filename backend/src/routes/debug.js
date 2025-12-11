const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const mqttService = require('../services/mqttService');

// This endpoint is intentionally gated by DEBUG_API_KEY env var.
// Set DEBUG_API_KEY in the backend environment to enable this route for testing.
router.post('/publish-weight', async (req, res) => {
  const key = process.env.DEBUG_API_KEY;
  const debugAllow = process.env.DEBUG_ALLOW === 'true';

  // If DEBUG_API_KEY is not set, allow when DEBUG_ALLOW is true (local testing)
  if (!key && !debugAllow) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (key) {
    const provided = req.headers['x-debug-key'] || req.body.debugKey;
    if (!provided || provided !== key) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const payload = req.body;
    // Expect payload to contain at least: device_id, weight
    if (!payload || !payload.device_id || typeof payload.weight === 'undefined') {
      return res.status(400).json({ error: 'Missing device_id or weight in body' });
    }

    // Forward to mqttService handler which already contains DB + emit logic
    await mqttService.handleWeightData(payload);

    logger.info('Debug: published weight via API', payload);
    return res.json({ ok: true });
  } catch (err) {
    logger.error('Error in debug publish-weight:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
