const express = require('express');
const Reading = require('../models/Reading');
const Item = require('../models/Item');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get readings for an item
router.get('/item/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { limit = 100, startDate, endDate } = req.query;

    // Verify item belongs to user
    const item = await Item.findOne({ _id: itemId, userId: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const query = { itemId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const readings = await Reading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(readings);
  } catch (error) {
    logger.error('Get readings error:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// Get analytics for an item
router.get('/analytics/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { period = '7d' } = req.query;

    // Verify item belongs to user
    const item = await Item.findOne({ _id: itemId, userId: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Calculate date range
    const now = new Date();
    const periodMap = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    const daysBack = periodMap[period] || 7;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const readings = await Reading.find({
      itemId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 });

    // Calculate analytics
    const analytics = {
      totalReadings: readings.length,
      averageWeight: 0,
      minWeight: Infinity,
      maxWeight: -Infinity,
      lowStatusCount: 0,
      trend: []
    };

    if (readings.length > 0) {
      let totalWeight = 0;
      
      readings.forEach(reading => {
        totalWeight += reading.weight;
        analytics.minWeight = Math.min(analytics.minWeight, reading.weight);
        analytics.maxWeight = Math.max(analytics.maxWeight, reading.weight);
        if (reading.status === 'LOW') analytics.lowStatusCount++;
      });

      analytics.averageWeight = totalWeight / readings.length;

      // Create trend data (group by hour or day depending on period)
      const groupBy = daysBack > 7 ? 'day' : 'hour';
      const trendMap = new Map();

      readings.forEach(reading => {
        let key;
        if (groupBy === 'hour') {
          key = new Date(reading.timestamp).toISOString().slice(0, 13) + ':00:00Z';
        } else {
          key = new Date(reading.timestamp).toISOString().slice(0, 10);
        }

        if (!trendMap.has(key)) {
          trendMap.set(key, { sum: 0, count: 0, timestamp: key });
        }
        
        const entry = trendMap.get(key);
        entry.sum += reading.weight;
        entry.count++;
      });

      analytics.trend = Array.from(trendMap.values()).map(entry => ({
        timestamp: entry.timestamp,
        averageWeight: entry.sum / entry.count,
        count: entry.count
      }));
    }

    res.json(analytics);
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
