import { useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWAUpdate = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW registered:', swUrl);
      // Check for updates every 2 minutes (more aggressive)
      if (r) {
        setInterval(() => {
          r.update();
        }, 2 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowUpdateBanner(true);
      console.log('[PWA] New version detected — clearing caches & reloading...');
      const timer = setTimeout(async () => {
        // Clear ALL caches before reloading to force fresh content
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        await updateServiceWorker(true);
        window.location.reload();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [needRefresh, updateServiceWorker]);

  const updateApp = useCallback(async () => {
    await updateServiceWorker(true);
    window.location.reload();
  }, [updateServiceWorker]);

  return {
    showUpdatePrompt: showUpdateBanner,
    offlineReady,
    updateApp,
    dismissUpdate: updateApp, // dismiss also triggers update now
  };
};
