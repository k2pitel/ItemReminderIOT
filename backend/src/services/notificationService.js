const axios = require('axios');
const User = require('../models/User');
const logger = require('../utils/logger');

class NotificationService {
  async sendNotification(alert) {
    try {
      const user = await User.findById(alert.userId);
      if (!user) return;

      const promises = [];

      // Send Blynk notification if configured
      if (process.env.BLYNK_TOKEN) {
        promises.push(this.sendBlynkNotification(alert, user));
      }

      // Send Firebase notification if configured
      if (process.env.FIREBASE_SERVER_KEY) {
        promises.push(this.sendFirebaseNotification(alert, user));
      }

      // Send email notification if enabled
      if (user.notifications.email) {
        promises.push(this.sendEmailNotification(alert, user));
      }

      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  async sendBlynkNotification(alert, user) {
    try {
      const url = `https://blynk.cloud/external/api/notification`;
      await axios.post(url, {
        token: process.env.BLYNK_TOKEN,
        body: alert.message
      });
      logger.info('Blynk notification sent');
    } catch (error) {
      logger.error('Blynk notification error:', error.message);
    }
  }

  async sendFirebaseNotification(alert, user) {
    try {
      // This would require user's FCM token stored in user model
      // Placeholder implementation
      const url = 'https://fcm.googleapis.com/fcm/send';
      const headers = {
        'Authorization': `key=${process.env.FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json'
      };

      // In production, you'd get this from user.fcmToken
      const fcmToken = user.fcmToken || '';

      if (!fcmToken) {
        logger.warn('No FCM token for user:', user._id);
        return;
      }

      await axios.post(url, {
        to: fcmToken,
        notification: {
          title: 'Item Reminder Alert',
          body: alert.message,
          priority: 'high'
        },
        data: {
          alertId: alert._id.toString(),
          type: alert.type
        }
      }, { headers });

      logger.info('Firebase notification sent');
    } catch (error) {
      logger.error('Firebase notification error:', error.message);
    }
  }

  async sendEmailNotification(alert, user) {
    try {
      // Placeholder for email notification
      // In production, you'd use nodemailer or similar
      logger.info(`Email notification would be sent to ${user.email}: ${alert.message}`);
    } catch (error) {
      logger.error('Email notification error:', error.message);
    }
  }
}

module.exports = new NotificationService();
