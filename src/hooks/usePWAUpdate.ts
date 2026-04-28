import { useState, useEffect, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Detect Lovable preview / iframe contexts where service workers must NOT run.
const isInIframe = (() => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname.includes('lovable.app') === false &&
      window.location.hostname.includes('id-preview--'));
const PWA_DISABLED = isInIframe || isPreviewHost;

// No-op stand-in that mirrors the shape of useRegisterSW's return value so
// React always sees the same hook call order regardless of environment.
const useNoopRegisterSW = (): ReturnType<typeof useRegisterSW> => {
  const needRefresh = useState(false);
  const offlineReady = useState(false);
  const updateServiceWorker = useCallback(async (_reload?: boolean) => {}, []);
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
  } as ReturnType<typeof useRegisterSW>;
};

const useRegisterSWSafe = PWA_DISABLED ? useNoopRegisterSW : useRegisterSW;

/**
 * Aggressive PWA auto-update strategy so installed apps reflect the latest
 * publish quickly:
 * 1. Check for new SW every 30 seconds while the app is open.
 * 2. Check immediately whenever the tab regains visibility / focus.
 * 3. When a new version is detected, clear all caches and reload silently.
 */
export const usePWAUpdate = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSWSafe({
    immediate: !PWA_DISABLED,
    onRegisteredSW(swUrl, r) {
      console.log('[PWA] SW registered:', swUrl);
      if (r) {
        registrationRef.current = r;

        // Check every 30 seconds for new builds
        const intervalId = setInterval(() => {
          r.update().catch(() => {});
        }, 30 * 1000);

        // Re-check whenever tab becomes visible or window gains focus
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

        // Best-effort cleanup (this hook lives for the app lifetime, but
        // keep it tidy in case it ever unmounts).
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
          // Wipe ALL caches so we never serve stale assets after the reload.
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
