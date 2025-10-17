const express = require('express');
const geofenceService = require('../services/geofenceService');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get geofences
router.get('/', auth, async (req, res) => {
  try {
    const geofences = await geofenceService.getGeofences(req.userId, req.query.itemId);
    res.json(geofences);
  } catch (error) {
    logger.error('Get geofences error:', error);
    res.status(500).json({ error: 'Failed to fetch geofences' });
  }
});

// Create geofence
router.post('/', auth, async (req, res) => {
  try {
    const geofenceData = {
      ...req.body,
      userId: req.userId
    };

    const geofence = await geofenceService.createGeofence(geofenceData);
    res.status(201).json(geofence);
  } catch (error) {
    logger.error('Create geofence error:', error);
    res.status(500).json({ error: 'Failed to create geofence' });
  }
});

// Update geofence
router.put('/:id', auth, async (req, res) => {
  try {
    const geofence = await geofenceService.updateGeofence(
      req.params.id,
      req.userId,
      req.body
    );

    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    res.json(geofence);
  } catch (error) {
    logger.error('Update geofence error:', error);
    res.status(500).json({ error: 'Failed to update geofence' });
  }
});

// Delete geofence
router.delete('/:id', auth, async (req, res) => {
  try {
    await geofenceService.deleteGeofence(req.params.id, req.userId);
    res.json({ message: 'Geofence deleted successfully' });
  } catch (error) {
    logger.error('Delete geofence error:', error);
    res.status(500).json({ error: 'Failed to delete geofence' });
  }
});

// Check user location
router.post('/check-location', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const results = await geofenceService.checkUserLocation(req.userId, {
      latitude,
      longitude
    });

    res.json(results);
  } catch (error) {
    logger.error('Check location error:', error);
    res.status(500).json({ error: 'Failed to check location' });
  }
});

module.exports = router;
