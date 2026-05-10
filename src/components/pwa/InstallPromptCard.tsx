import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'farmeye-install-dismissed-at';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7d

export function InstallPromptCard() {
  const { language } = useAuth();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) {
      setDismissed(true);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  const t = (bn: string, en: string) => (language === 'bn' ? bn : en);

  const install = async () => {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setDismissed(true);
    }
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-primary/30 bg-card p-3 shadow-lg sm:bottom-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {t('FarmEye অ্যাপ ইনস্টল করুন', 'Install FarmEye App')}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t('হোমস্ক্রিনে যোগ করুন — অফলাইনেও কাজ করবে', 'Add to home screen — works offline')}
          </p>
        </div>
        <Button size="sm" onClick={install}>
          {t('ইনস্টল', 'Install')}
        </Button>
        <button
          aria-label="Dismiss"
          onClick={dismiss}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
