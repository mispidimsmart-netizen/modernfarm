/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'smart-farm-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const severity = data.severity || 'warning';
    
    // Different vibration patterns based on severity
    // Mobile will use default sound based on device settings
    const vibrationPatterns = {
      danger: [300, 100, 300, 100, 300, 100, 300], // Urgent - longer, more intense
      warning: [200, 100, 200, 100, 200],           // Warning - moderate
      info: [100, 50, 100],                          // Info - short
    };
    
    const options = {
      body: data.body || data.message,
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      
      // Vibration pattern based on severity - follows device settings
      vibrate: vibrationPatterns[severity] || vibrationPatterns.warning,
      
      // Sound - uses device default notification sound
      // Setting silent to false ensures sound plays (follows device mute/vibrate settings)
      silent: false,
      
      // Tag for grouping - renotify ensures sound plays even for same tag
      tag: data.tag || `farm-alert-${Date.now()}`,
      renotify: true, // Play sound even if replacing existing notification
      
      // Keep notification visible for danger alerts
      requireInteraction: severity === 'danger',
      
      // Timestamp for ordering
      timestamp: Date.now(),
      
      // Custom data for click handling
      data: {
        url: data.url || '/alerts',
        alertId: data.alertId,
        severity: severity,
      },
      
      // Action buttons
      actions: [
        {
          action: 'view',
          title: severity === 'danger' ? '🚨 View Now' : '👁️ View',
        },
        {
          action: 'dismiss',
          title: '✕ Dismiss',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Farm Alert 🌾', options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/alerts';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

export {};
