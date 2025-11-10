const Geofence = require('../models/Geofence');
const Item = require('../models/Item');
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

  async getGeofences(userId) {
    try {
      const geofences = await Geofence.find({ userId, active: true });
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

  async updateUserLocation(userId, userLocation) {
    try {
      const geofences = await Geofence.find({ userId, active: true });
      const items = await Item.find({ userId, active: true, geofenceId: { $ne: null } }).populate('geofenceId');
      const now = new Date();
      const alertsTriggered = [];

      // Update geofence tracking
      for (const geofence of geofences) {
        const isInside = this.isPointInGeofence(userLocation, geofence);
        const wasInside = geofence.userCurrentlyInside;

        geofence.lastLocationUpdate = now;

        // User entering geofence
        if (isInside && !wasInside) {
          geofence.userCurrentlyInside = true;
          geofence.userEnteredAt = now;
          geofence.userExitedAt = null;
          
          logger.info(`User ${userId} entered geofence: ${geofence.name}`);
          
          // Check for items with "enter" or "both" trigger
          await this.checkItemsForGeofence(userId, geofence, items, 'enter', userLocation, alertsTriggered);
        }
        
        // User leaving geofence
        else if (!isInside && wasInside) {
          geofence.userCurrentlyInside = false;
          geofence.userExitedAt = now;

          logger.info(`User ${userId} left geofence: ${geofence.name}`);
          
          // Check for items with "exit" or "both" trigger
          await this.checkItemsForGeofence(userId, geofence, items, 'exit', userLocation, alertsTriggered);
        }

        await geofence.save();
      }

      return {
        location: userLocation,
        timestamp: now,
        geofenceStatus: geofences.map(g => ({
          id: g._id,
          name: g.name,
          isInside: g.userCurrentlyInside,
          distance: geolib.getDistance(userLocation, g.location)
        })),
        alertsTriggered
      };
    } catch (error) {
      logger.error('Error updating user location:', error);
      throw error;
    }
  }

  async checkItemsForGeofence(userId, geofence, items, triggerType, userLocation, alertsTriggered) {
    const relevantItems = items.filter(item => 
      item.geofenceId && 
      item.geofenceId._id.toString() === geofence._id.toString() &&
      (item.triggerCondition === triggerType || item.triggerCondition === 'both')
    );

    for (const item of relevantItems) {
      let shouldAlert = false;
      let alertMessage = '';
      let alertSeverity = 'medium';

      // Check conditions based on detection mode
      if (item.detectionMode === 'wearable') {
        // Wearable mode: Alert if OFF (not worn) or status is OFF
        if (item.wearStatus === 'OFF' || item.status === 'OFF') {
          shouldAlert = true;
          alertMessage = item.customAlertMessage || 
            `Don't forget your ${item.name}! It's not being worn.`;
          alertSeverity = 'high';
        }
      } else {
        // Weight mode: Alert if LOW or EMPTY
        if (item.status === 'LOW' || item.status === 'EMPTY') {
          shouldAlert = true;
          alertMessage = item.customAlertMessage || 
            `${item.name} is ${item.status.toLowerCase()}!`;
          alertSeverity = item.status === 'EMPTY' ? 'critical' : 'high';
        }
      }

      if (shouldAlert) {
        const alert = await alertService.createAlert({
          userId: userId,
          itemId: item._id,
          type: `geofence_${triggerType}`,
          severity: alertSeverity,
          message: alertMessage,
          data: {
            geofenceName: geofence.name,
            itemStatus: item.status,
            wearStatus: item.wearStatus,
            detectionMode: item.detectionMode,
            weight: item.currentWeight,
            triggerType: triggerType,
            location: userLocation
          }
        });

        alertsTriggered.push({
          geofenceName: geofence.name,
          itemName: item.name,
          status: item.status,
          wearStatus: item.wearStatus,
          detectionMode: item.detectionMode,
          triggerType: triggerType,
          alert: alert
        });

        logger.info(`Alert triggered for ${item.name} on ${triggerType} ${geofence.name}`);
      }
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
