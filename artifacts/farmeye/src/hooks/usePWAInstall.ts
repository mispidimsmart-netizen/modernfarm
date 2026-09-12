import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Event emitter for PWA install success
type InstallSuccessCallback = () => void;
const installSuccessCallbacks: InstallSuccessCallback[] = [];

export const onPWAInstallSuccess = (callback: InstallSuccessCallback) => {
  installSuccessCallbacks.push(callback);
  return () => {
    const index = installSuccessCallbacks.indexOf(callback);
    if (index > -1) installSuccessCallbacks.splice(index, 1);
  };
};

const notifyInstallSuccess = () => {
  installSuccessCallbacks.forEach(cb => cb());
};

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode) - works for both mobile and desktop
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches
        || window.matchMedia('(display-mode: minimal-ui)').matches
        || (window.navigator as any).standalone === true
        || document.referrer.includes('android-app://');
      
      return isStandalone;
    };
    
    if (checkStandalone()) {
      setIsInstalled(true);
      return;
    }

    // Listen for display mode changes
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };
    standaloneQuery.addEventListener('change', handleDisplayModeChange);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // If iOS, show manual install instructions
    if (iOS) {
      setIsInstallable(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setJustInstalled(true);

      // Show success toast
      toast.success('🎉 অ্যাপ সফলভাবে ইনস্টল হয়েছে!', {
        description: 'এখন আপনি হোম স্ক্রিন থেকে সরাসরি অ্যাপ ব্যবহার করতে পারবেন।',
        duration: 5000,
      });

      // Clear the welcome seen flag so onboarding shows
      localStorage.removeItem('pwa-welcome-seen');

      // Notify listeners
      notifyInstallSuccess();

      // Store installation time
      localStorage.setItem('pwa-installed-at', Date.now().toString());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setJustInstalled(true);

        toast.success('🎉 অ্যাপ ইনস্টল হচ্ছে!', {
          description: 'কিছুক্ষণের মধ্যে আপনার ডিভাইসে অ্যাপ যোগ হবে।',
          duration: 4000,
        });
      }
      
      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt error:', error);
      toast.error('ইনস্টল করতে সমস্যা হয়েছে', {
        description: 'অনুগ্রহ করে আবার চেষ্টা করুন।',
      });
      return false;
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setIsInstallable(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  // Check if user dismissed recently (within 7 days)
  const isDismissedRecently = useCallback(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed) return false;
    const dismissedTime = parseInt(dismissed, 10);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedTime < sevenDays;
  }, []);

  // Check if app was just installed
  const wasRecentlyInstalled = useCallback(() => {
    const installedAt = localStorage.getItem('pwa-installed-at');
    if (!installedAt) return false;
    const installedTime = parseInt(installedAt, 10);
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - installedTime < fiveMinutes;
  }, []);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    justInstalled,
    promptInstall,
    dismissPrompt,
    canPrompt: !!deferredPrompt,
    isDismissedRecently,
    wasRecentlyInstalled,
  };
}
