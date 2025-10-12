const express = require('express');
const alertService = require('../services/alertService');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get alerts
router.get('/', auth, async (req, res) => {
  try {
    const filters = {
      itemId: req.query.itemId,
      type: req.query.type,
      read: req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined,
      limit: parseInt(req.query.limit) || 100
    };

    const alerts = await alertService.getAlerts(req.userId, filters);
    res.json(alerts);
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Mark alert as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const alert = await alertService.markAsRead(req.params.id, req.userId);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(alert);
  } catch (error) {
    logger.error('Mark alert as read error:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Delete alert
router.delete('/:id', auth, async (req, res) => {
  try {
    await alertService.deleteAlert(req.params.id, req.userId);
    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    logger.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

module.exports = router;
