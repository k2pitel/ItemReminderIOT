const nodemailer = require('nodemailer');
const User = require('../models/User');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  initializeEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      this.emailTransporter.verify((error) => {
        if (error) {
          logger.error('Email transporter verification failed:', error);
        } else {
          logger.info('Email transporter ready');
        }
      });
    } else {
      logger.warn('Email configuration incomplete. Notifications disabled.');
    }
  }

  async sendNotification(alert) {
    try {
      const user = await User.findById(alert.userId);
      if (!user) {
        logger.warn('User not found for notification:', alert.userId);
        return;
      }

      logger.info(`Alert triggered: ${alert.message}`);
      await this.sendEmailNotification(alert, user);
      
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  async sendEmailNotification(alert, user) {
    try {
      if (!this.emailTransporter || !user.email) {
        logger.warn('Cannot send email: missing transporter or user email');
        return;
      }

      const subjects = {
        low_weight: 'Low Stock Alert',
        offline: 'Device Offline Alert',
        geofence: 'Location Alert'
      };

      const subject = subjects[alert.type] || 'IoT Alert';
      const htmlBody = `
        <div>
          <h2>${subject}</h2>
          <p><strong>${alert.message}</strong></p>
          <p>Type: ${alert.type} | Severity: ${alert.severity}</p>
          <p>Time: ${alert.createdAt || new Date()}</p>
        </div>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject,
        html: htmlBody,
        text: alert.message
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent to ${user.email} for ${alert.type} alert`);
      
    } catch (error) {
      logger.error('Email send failed:', error);
    }
  }

  async sendTestEmail(email) {
    try {
      if (!this.emailTransporter) {
        throw new Error('Email transporter not configured');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Test Email - IoT System',
        html: '<p>This is a test email from your IoT Item Reminder system.</p>',
        text: 'This is a test email from your IoT Item Reminder system.'
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Test email sent to ${email}`);
      return result;
      
    } catch (error) {
      logger.error('Test email failed:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
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
          
        case 'geofence':
          subject = '📍 Geofence Alert - Location-Based Reminder';
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">📍 Geofence Alert</h2>
              <p><strong>${alert.message}</strong></p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Alert Details:</h3>
                <ul>
                  <li><strong>Type:</strong> Geofence ${alert.data?.triggerType || 'alert'}</li>
                  <li><strong>Location:</strong> ${alert.data?.geofenceName || 'Unknown'}</li>
                  <li><strong>Item:</strong> ${alert.data?.itemName || 'Unknown'}</li>
                  <li><strong>Item Status:</strong> ${alert.data?.itemStatus || 'Unknown'}</li>
                  <li><strong>Severity:</strong> ${alert.severity}</li>
                  <li><strong>Time:</strong> ${alert.createdAt || new Date()}</li>
                </ul>
              </div>
              <p style="color: #666;">Remember to check your item before leaving or entering this area.</p>
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
