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

  async updateUserLocation(userId, userLocation) {
    try {
      const geofences = await Geofence.find({ userId, active: true }).populate('itemId');
      const now = new Date();
      const alertsTriggered = [];

      for (const geofence of geofences) {
        const isInside = this.isPointInGeofence(userLocation, geofence);
        const wasInside = geofence.userCurrentlyInside;

        // Update geofence tracking
        geofence.lastLocationUpdate = now;

        // User entering geofence
        if (isInside && !wasInside) {
          geofence.userCurrentlyInside = true;
          geofence.userEnteredAt = now;
          geofence.userExitedAt = null;
          
          logger.info(`User ${userId} entered geofence: ${geofence.name}`);
        }
        
        // User leaving geofence - CHECK FOR SMART ALERTS!
        else if (!isInside && wasInside) {
          geofence.userCurrentlyInside = false;
          geofence.userExitedAt = now;

          // 🚨 SMART ALERT: Check if leaving without essential items
          if (geofence.itemId && geofence.alertSettings?.leaveWithoutItems) {
            const item = geofence.itemId;
            
            // Check if item is low or empty
            if (item.status === 'LOW' || item.status === 'EMPTY') {
              const alert = await alertService.createAlert({
                userId: userId,
                itemId: item._id,
                type: 'geofence_exit',
                severity: item.status === 'EMPTY' ? 'critical' : 'high',
                message: `⚠️ Don't forget! ${item.name} is ${item.status.toLowerCase()} - you're leaving ${geofence.name}`,
                data: {
                  geofenceName: geofence.name,
                  itemStatus: item.status,
                  weight: item.currentWeight,
                  exitTime: now,
                  location: userLocation
                }
              });

              alertsTriggered.push({
                geofenceName: geofence.name,
                itemName: item.name,
                status: item.status,
                alert: alert
              });
            }
          }

          logger.info(`User ${userId} left geofence: ${geofence.name}`);
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
