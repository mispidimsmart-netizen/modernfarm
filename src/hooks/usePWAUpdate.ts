import { useState, useEffect, useCallback, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Aggressive PWA auto-update strategy.
 * NOTE: Must NOT be called in Lovable preview / iframe contexts — gate at the
 * component level (see PWAUpdateBanner) because useRegisterSW registers a SW
 * which breaks HMR inside iframes.
 */
export const usePWAUpdate = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateServiceWorkerRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  const applyUpdate = useCallback(async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (e) {
      console.warn('[PWA] cache cleanup failed', e);
    }
    await updateServiceWorkerRef.current?.(true);
    window.location.reload();
  }, []);

  useEffect(() => {
    updateServiceWorkerRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setShowUpdateBanner(true);
        console.log('[PWA] New version detected — clearing caches & reloading...');
        window.setTimeout(() => {
          void applyUpdate();
        }, 500);
      },
      onRegisteredSW(swUrl, r) {
        console.log('[PWA] SW registered:', swUrl);
        if (!r) return;

        registrationRef.current = r;

        const intervalId = window.setInterval(() => {
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
          window.clearInterval(intervalId);
          document.removeEventListener('visibilitychange', onVisible);
          window.removeEventListener('focus', onFocus);
        };
      },
      onRegisterError(error) {
        console.error('[PWA] SW registration error:', error);
      },
    });

    return () => {
      (window as any).__pwaUpdateCleanup?.();
    };
  }, [applyUpdate]);

  return {
    showUpdatePrompt: showUpdateBanner,
    offlineReady: false,
    updateApp: applyUpdate,
    dismissUpdate: applyUpdate,
  };
};
