const Geofence = require('../models/Geofence');
const User = require('../models/User');
const geolib = require('geolib');
const logger = require('../utils/logger');
const alertService = require('./alertService');

class GeofenceService {
  async createGeofence(geofenceData) {
    try {
      const geofence = new Geofence(geofenceData);
      await geofence.save();
      logger.info('Geofence created:', geofence._id);
      return geofence;
    } catch (error) {
      logger.error('Error creating geofence:', error);
      throw error;
    }
  }

  async getGeofences(userId, itemId = null) {
    try {
      const query = { userId, active: true };
      if (itemId) query.itemId = itemId;

      const geofences = await Geofence.find(query)
        .populate('itemId', 'name status currentWeight');
      
      return geofences;
    } catch (error) {
      logger.error('Error getting geofences:', error);
      throw error;
    }
  }

  async updateGeofence(geofenceId, userId, updateData) {
    try {
      const geofence = await Geofence.findOneAndUpdate(
        { _id: geofenceId, userId },
        updateData,
        { new: true }
      );
      return geofence;
    } catch (error) {
      logger.error('Error updating geofence:', error);
      throw error;
    }
  }

  async deleteGeofence(geofenceId, userId) {
    try {
      await Geofence.findOneAndUpdate(
        { _id: geofenceId, userId },
        { active: false }
      );
    } catch (error) {
      logger.error('Error deleting geofence:', error);
      throw error;
    }
  }

  async checkGeofenceAlerts(item) {
    try {
      const geofences = await Geofence.find({
        userId: item.userId,
        itemId: item._id,
        active: true
      });

      for (const geofence of geofences) {
        // Check if item is low and alert is enabled
        if (geofence.alertWhenLow && item.status === 'LOW') {
          await alertService.createAlert({
            userId: item.userId,
            itemId: item._id,
            type: 'geofence',
            severity: 'warning',
            message: `${item.name} is low in ${geofence.name} area`,
            data: {
              geofenceName: geofence.name,
              location: geofence.location,
              weight: item.currentWeight
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error checking geofence alerts:', error);
    }
  }

  isPointInGeofence(userLocation, geofence) {
    const distance = geolib.getDistance(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: geofence.location.latitude, longitude: geofence.location.longitude }
    );

    return distance <= geofence.radius;
  }

  async checkUserLocation(userId, userLocation) {
    try {
      const geofences = await this.getGeofences(userId);
      const results = [];

      for (const geofence of geofences) {
        const isInside = this.isPointInGeofence(userLocation, geofence);
        
        results.push({
          geofenceId: geofence._id,
          name: geofence.name,
          isInside,
          distance: geolib.getDistance(
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: geofence.location.latitude, longitude: geofence.location.longitude }
          )
        });
      }

      return results;
    } catch (error) {
      logger.error('Error checking user location:', error);
      throw error;
    }
  }
}

module.exports = new GeofenceService();
