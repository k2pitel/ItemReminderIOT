const Alert = require('../models/Alert');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class AlertService {
  async createAlert(alertData) {
    try {
      const alert = new Alert(alertData);
      await alert.save();

      // Send notification
      await notificationService.sendNotification(alert);

      alert.notificationSent = true;
      await alert.save();

      logger.info('Alert created:', alert._id);
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async getAlerts(userId, filters = {}) {
    try {
      const query = { userId };
      
      if (filters.itemId) query.itemId = filters.itemId;
      if (filters.type) query.type = filters.type;
      if (filters.read !== undefined) query.read = filters.read;

      const alerts = await Alert.find(query)
        .populate('itemId', 'name deviceId')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);

      return alerts;
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  async markAsRead(alertId, userId) {
    try {
      const alert = await Alert.findOneAndUpdate(
        { _id: alertId, userId },
        { read: true },
        { new: true }
      );
      return alert;
    } catch (error) {
      logger.error('Error marking alert as read:', error);
      throw error;
    }
  }

  async deleteAlert(alertId, userId) {
    try {
      await Alert.findOneAndDelete({ _id: alertId, userId });
    } catch (error) {
      logger.error('Error deleting alert:', error);
      throw error;
    }
  }
}

module.exports = new AlertService();
