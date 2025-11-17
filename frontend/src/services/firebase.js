// Firebase Configuration and Push Notification Setup
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your web app's Firebase configuration
// Replace these values with your actual Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
};

// VAPID key for web push
const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';

let app = null;
let messaging = null;

// Initialize Firebase
export const initializeFirebase = () => {
  try {
    if (!firebaseConfig.apiKey) {
      console.warn('Firebase not configured. Push notifications disabled.');
      return null;
    }

    app = initializeApp(firebaseConfig);
    
    // Check if messaging is supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      messaging = getMessaging(app);
      console.log('✅ Firebase messaging initialized');
    } else {
      console.warn('⚠️ Push notifications not supported in this browser');
    }

    return messaging;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    return null;
  }
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      throw new Error('Firebase messaging not initialized');
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, { vapidKey });
      
      if (token) {
        console.log('✅ FCM token obtained:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.warn('⚠️ No registration token available');
        return null;
      }
    } else if (permission === 'denied') {
      console.warn('⚠️ Notification permission denied');
      return null;
    } else {
      console.log('🔔 Notification permission dismissed');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting notification permission:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      console.warn('Firebase messaging not initialized');
      return;
    }

    onMessage(messaging, (payload) => {
      console.log('🔔 Message received:', payload);
      resolve(payload);
    });
  });

// Show browser notification
export const showNotification = (title, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icon.png',
      badge: '/badge.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options,
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
    };

    return notification;
  } else {
    console.warn('Notifications not permitted or not supported');
    return null;
  }
};

// Check if notifications are supported
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Get current notification permission status
export const getNotificationPermission = () => {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'unsupported';
};

export { messaging };
