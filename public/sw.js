// Push notification handler & cache management — imported by VitePWA's service worker
// Force clear ALL old caches on activation to ensure updates reach mobile
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all non-workbox caches to force fresh content
          if (!cacheName.startsWith('workbox-precache')) {
            console.log('[SW] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const severity = data.severity || 'warning';
    
    const vibrationPatterns = {
      danger: [300, 100, 300, 100, 300, 100, 300],
      warning: [200, 100, 200, 100, 200],
      info: [100, 50, 100],
    };
    
    const options = {
      body: data.body || data.message,
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      vibrate: vibrationPatterns[severity] || vibrationPatterns.warning,
      silent: false,
      tag: data.tag || `farm-alert-${Date.now()}`,
      renotify: true,
      requireInteraction: severity === 'danger',
      timestamp: Date.now(),
      data: {
        url: data.url || '/alerts',
        alertId: data.alertId,
        severity: severity,
      },
      actions: [
        { action: 'view', title: severity === 'danger' ? '🚨 View Now' : '👁️ View' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Farm Alert 🌾', options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/alerts';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
