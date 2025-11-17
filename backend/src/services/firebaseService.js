const admin = require('firebase-admin');
const logger = require('../utils/logger');
const path = require('path');

class FirebaseService {
  constructor() {
    this.initialized = false;
    this.admin = null;
    this.initializeApp();
  }

  initializeApp() {
    try {
      // Method 1: Using service account file (Recommended)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        const serviceAccount = require(serviceAccountPath);
        
        this.admin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        
        this.initialized = true;
        logger.info('✅ Firebase Admin SDK initialized with service account');
      }
      // Method 2: Using individual credentials
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        this.admin = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        });
        
        this.initialized = true;
        logger.info('✅ Firebase Admin SDK initialized with environment credentials');
      }
      // Method 3: Legacy server key (fallback, less secure)
      else if (process.env.FIREBASE_SERVER_KEY) {
        logger.warn('⚠️  Using legacy Firebase Server Key. Consider upgrading to Firebase Admin SDK.');
        this.initialized = false; // Will use HTTP API instead
      }
      else {
        logger.warn('⚠️  Firebase not configured. Push notifications disabled.');
        this.initialized = false;
      }
    } catch (error) {
      logger.error('❌ Firebase initialization error:', error);
      this.initialized = false;
    }
  }

  async sendNotification(fcmToken, notification, data = {}) {
    if (!fcmToken) {
      throw new Error('FCM token is required');
    }

    // Use Firebase Admin SDK if initialized
    if (this.initialized && this.admin) {
      return this.sendWithAdminSDK(fcmToken, notification, data);
    }
    
    // Fallback to legacy HTTP API
    if (process.env.FIREBASE_SERVER_KEY) {
      return this.sendWithLegacyAPI(fcmToken, notification, data);
    }

    throw new Error('Firebase is not configured');
  }

  async sendWithAdminSDK(fcmToken, notification, data = {}) {
    try {
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title || 'Item Reminder Alert',
          body: notification.body || 'You have a new alert',
          ...notification
        },
        data: data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icon.png',
            badge: '/badge.png',
            requireInteraction: true
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info('🔥 Firebase notification sent via Admin SDK:', response);
      return { success: true, messageId: response };
    } catch (error) {
      logger.error('❌ Firebase Admin SDK send error:', error);
      
      // Handle token errors
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        logger.warn('Invalid or expired FCM token');
        throw new Error('INVALID_TOKEN');
      }
      
      throw error;
    }
  }

  async sendWithLegacyAPI(fcmToken, notification, data = {}) {
    try {
      const axios = require('axios');
      const url = 'https://fcm.googleapis.com/fcm/send';
      const headers = {
        'Authorization': `key=${process.env.FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json'
      };

      const payload = {
        to: fcmToken,
        notification: {
          title: notification.title || 'Item Reminder Alert',
          body: notification.body || 'You have a new alert',
          icon: '/icon.png',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...notification
        },
        data: data,
        priority: 'high'
      };

      const response = await axios.post(url, payload, { headers });
      
      if (response.data.success === 1) {
        logger.info('🔥 Firebase notification sent via Legacy API');
        return { success: true, messageId: response.data.results[0].message_id };
      } else {
        const error = response.data.results[0].error;
        logger.error('Firebase Legacy API error:', error);
        
        if (error === 'InvalidRegistration' || error === 'NotRegistered') {
          throw new Error('INVALID_TOKEN');
        }
        
        throw new Error(`Firebase error: ${error}`);
      }
    } catch (error) {
      logger.error('❌ Firebase Legacy API send error:', error.message);
      throw error;
    }
  }

  async sendMulticast(tokens, notification, data = {}) {
    if (!this.initialized || !this.admin) {
      throw new Error('Firebase Admin SDK is required for multicast');
    }

    try {
      const message = {
        tokens: tokens,
        notification: {
          title: notification.title || 'Item Reminder Alert',
          body: notification.body || 'You have a new alert',
          ...notification
        },
        data: data,
        android: {
          priority: 'high'
        }
      };

      const response = await admin.messaging().sendMulticast(message);
      logger.info(`🔥 Multicast sent: ${response.successCount}/${tokens.length} successful`);
      
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      logger.error('❌ Firebase multicast error:', error);
      throw error;
    }
  }

  isInitialized() {
    return this.initialized || !!process.env.FIREBASE_SERVER_KEY;
  }
}

module.exports = new FirebaseService();
