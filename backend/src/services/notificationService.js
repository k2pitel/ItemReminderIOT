const axios = require('axios');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    // Initialize email transporter
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  initializeEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      // Verify connection
      this.emailTransporter.verify((error, success) => {
        if (error) {
          logger.error('Email transporter verification failed:', error);
        } else {
          logger.info('Email transporter is ready to send emails');
        }
      });
    } else {
      logger.warn('Email configuration incomplete. Email notifications disabled.');
    }
  }

  async sendNotification(alert) {
    try {
      const user = await User.findById(alert.userId);
      if (!user) return;

      // Always log notification for testing
      logger.info(`🚨 ALERT TRIGGERED: ${alert.message}`);
      logger.info(`📱 Notification would be sent to user: ${user.email || user.username || user._id}`);
      
      const promises = [];

      // Send Blynk notification if configured
      if (process.env.BLYNK_TOKEN) {
        promises.push(this.sendBlynkNotification(alert, user));
      } else {
        logger.info('📲 Blynk notification: Configure BLYNK_TOKEN in .env to enable');
      }

      // Send Firebase notification if configured
      if (process.env.FIREBASE_SERVER_KEY) {
        promises.push(this.sendFirebaseNotification(alert, user));
      } else {
        logger.info('🔥 Firebase notification: Configure FIREBASE_SERVER_KEY in .env to enable');
      }

      // Send email notification if enabled
      if (user.notifications && user.notifications.email) {
        promises.push(this.sendEmailNotification(alert, user));
      } else {
        logger.info('📧 Email notification: User has not enabled email notifications');
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
      if (!this.emailTransporter) {
        logger.warn('Email transporter not configured');
        return;
      }

      if (!user.email) {
        logger.warn('User has no email address');
        return;
      }

      // Determine email subject and body based on alert type
      let subject, htmlBody, textBody;
      
      switch (alert.type) {
        case 'low_weight':
          subject = '⚠️ Low Stock Alert - Item Running Low';
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ff6b35;">📦 Low Stock Alert</h2>
              <p><strong>${alert.message}</strong></p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Alert Details:</h3>
                <ul>
                  <li><strong>Type:</strong> Low Weight</li>
                  <li><strong>Severity:</strong> ${alert.severity}</li>
                  <li><strong>Time:</strong> ${alert.createdAt || new Date()}</li>
                </ul>
              </div>
              <p style="color: #666;">Please check your item and consider restocking soon.</p>
              <hr>
              <p style="font-size: 12px; color: #999;">
                This is an automated message from your IoT Item Reminder system.
              </p>
            </div>
          `;
          break;
          
        case 'offline':
          subject = '🔴 Device Offline Alert';
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc3545;">🔴 Device Offline</h2>
              <p><strong>${alert.message}</strong></p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Alert Details:</h3>
                <ul>
                  <li><strong>Type:</strong> Device Offline</li>
                  <li><strong>Severity:</strong> ${alert.severity}</li>
                  <li><strong>Time:</strong> ${alert.createdAt || new Date()}</li>
                </ul>
              </div>
              <p style="color: #666;">Please check your device connection and power supply.</p>
              <hr>
              <p style="font-size: 12px; color: #999;">
                This is an automated message from your IoT Item Reminder system.
              </p>
            </div>
          `;
          break;
          
        default:
          subject = '🔔 IoT Alert Notification';
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #007bff;">🔔 IoT Alert</h2>
              <p><strong>${alert.message}</strong></p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Alert Details:</h3>
                <ul>
                  <li><strong>Type:</strong> ${alert.type}</li>
                  <li><strong>Severity:</strong> ${alert.severity}</li>
                  <li><strong>Time:</strong> ${alert.createdAt || new Date()}</li>
                </ul>
              </div>
              <hr>
              <p style="font-size: 12px; color: #999;">
                This is an automated message from your IoT Item Reminder system.
              </p>
            </div>
          `;
      }
      
      textBody = alert.message + `\n\nType: ${alert.type}\nSeverity: ${alert.severity}\nTime: ${alert.createdAt || new Date()}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'IoT Item Reminder <noreply@example.com>',
        to: user.email,
        subject: subject,
        text: textBody,
        html: htmlBody
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`📧 Email sent successfully to ${user.email}:`, info.messageId);
      
    } catch (error) {
      logger.error('Email notification error:', error.message);
    }
  }
}

module.exports = new NotificationService();
