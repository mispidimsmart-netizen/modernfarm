import { useState, useEffect, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Aggressive PWA auto-update strategy.
 * NOTE: Must NOT be called in Lovable preview / iframe contexts — gate at the
 * component level (see PWAUpdateBanner) because useRegisterSW registers a SW
 * which breaks HMR inside iframes.
 */
export const usePWAUpdate = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      console.log('[PWA] SW registered:', swUrl);
      if (r) {
        registrationRef.current = r;

        const intervalId = setInterval(() => {
          r.update().catch(() => {});
        }, 30 * 1000);

        const onVisible = () => {
          if (document.visibilityState === 'visible') {
            r.update().catch(() => {});
          }
        };
        const onFocus = () => {
          r.update().catch(() => {});
        };

        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onFocus);

        (window as any).__pwaUpdateCleanup = () => {
          clearInterval(intervalId);
          document.removeEventListener('visibilitychange', onVisible);
          window.removeEventListener('focus', onFocus);
        };
      }
    },
    onRegisterError(error) {
      console.error('[PWA] SW registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowUpdateBanner(true);
      console.log('[PWA] New version detected — clearing caches & reloading...');
      const timer = setTimeout(async () => {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        } catch (e) {
          console.warn('[PWA] cache cleanup failed', e);
        }
        await updateServiceWorker(true);
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [needRefresh, updateServiceWorker]);

  const updateApp = useCallback(async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch {}
    await updateServiceWorker(true);
    window.location.reload();
  }, [updateServiceWorker]);

  return {
    showUpdatePrompt: showUpdateBanner,
    offlineReady,
    updateApp,
    dismissUpdate: updateApp,
  };
};
