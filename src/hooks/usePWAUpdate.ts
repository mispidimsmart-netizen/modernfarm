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
      // Show a brief banner, then auto-reload after 3 seconds
      setShowUpdateBanner(true);
      console.log('[PWA] New version detected — auto-reloading in 3s...');
      const timer = setTimeout(async () => {
        await updateServiceWorker(true);
        window.location.reload();
      }, 3000);
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
