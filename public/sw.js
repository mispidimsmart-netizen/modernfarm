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
    // Normalize: accept both 'danger' (legacy) and 'critical'
    const rawSev = data.severity || 'warning';
    const severity = rawSev === 'critical' ? 'danger' : rawSev;
    const isCritical = severity === 'danger';

    const vibrationPatterns = {
      // Critical: 3 strong pulses, repeated feel
      danger: [400, 120, 400, 120, 400, 120, 600, 200, 400, 120, 400],
      warning: [200, 100, 200, 100, 200],
      info: [100, 50, 100],
    };

    const titlePrefix = isCritical ? '🚨 ' : (severity === 'warning' ? '⚠️ ' : 'ℹ️ ');

    const actions = [
      { action: 'view', title: isCritical ? '🚨 দেখুন' : '👁️ দেখুন' },
    ];
    if (data.alertId) {
      actions.push({ action: 'ack', title: '✓ স্বীকার' });
    }
    actions.push({ action: 'dismiss', title: '✕ বন্ধ' });

    const options = {
      body: data.body || data.message,
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      vibrate: vibrationPatterns[severity] || vibrationPatterns.warning,
      silent: false,
      tag: data.tag || `farm-alert-${Date.now()}`,
      renotify: true,
      requireInteraction: isCritical,
      timestamp: Date.now(),
      data: {
        url: data.url || '/alerts',
        alertId: data.alertId,
        severity: severity,
      },
      actions: actions,
    };

    event.waitUntil(
      self.registration.showNotification((titlePrefix + (data.title || 'Farm Alert')).trim(), options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const alertId = event.notification.data?.alertId;
  let url = event.notification.data?.url || '/alerts';

  if (event.action === 'ack' && alertId) {
    // Route through page so user session can call acknowledge_alert RPC under RLS
    url = `/alerts?ack=${encodeURIComponent(alertId)}`;
  }

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
