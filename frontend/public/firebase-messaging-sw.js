/* eslint-env serviceworker */
/* global firebase */
/* eslint-disable no-restricted-globals */

// Firebase Cloud Messaging Service Worker
// This file handles background notifications when the app is not in focus

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Replace these values with your actual Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || 'Item Reminder Alert';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification',
      icon: payload.notification?.icon || '/icon.png',
      badge: '/badge.png',
      tag: payload.data?.alertId || 'default',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        url: payload.data?.url || '/',
        alertId: payload.data?.alertId,
        type: payload.data?.type
      }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // Handle notification click
  self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);
    
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // Check if there's already a window open
          for (let client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // If no window is open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  });

  console.log('[firebase-messaging-sw.js] Firebase messaging service worker initialized');
} catch (error) {
  console.error('[firebase-messaging-sw.js] Initialization error:', error);
}
