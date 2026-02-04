import { useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';

export function SettingsInstallCard() {
  const { language } = useAuth();
  const { isInstalled, isIOS, promptInstall, canPrompt } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const t = {
    install: language === 'bn' ? 'অ্যাপ ইনস্টল করুন' : 'Install App',
    installed: language === 'bn' ? 'ইনস্টল হয়েছে' : 'Installed',
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else if (canPrompt) {
      setIsInstalling(true);
      try {
        await promptInstall();
      } finally {
        setIsInstalling(false);
      }
    }
  };

  // Already installed
  if (isInstalled) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <CheckCircle2 size={16} className="text-primary" />
        {t.installed}
      </Button>
    );
  }

  // Not installable
  if (!canPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      <Button 
        variant="default" 
        size="sm"
        onClick={handleInstall}
        disabled={isInstalling}
        className="gap-2"
      >
        <Download size={16} />
        {isInstalling ? '...' : t.install}
      </Button>

      {/* iOS Installation Guide Dialog */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowIOSGuide(false)}>
          <div className="bg-background rounded-lg p-6 mx-4 max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">
              {language === 'bn' ? 'iOS-এ ইনস্টল করুন' : 'Install on iOS'}
            </h3>
            <div className="space-y-3 text-sm">
              <p>1. {language === 'bn' ? 'Safari-তে Share বাটনে ট্যাপ করুন' : 'Tap Share button in Safari'}</p>
              <p>2. {language === 'bn' ? '"Add to Home Screen" সিলেক্ট করুন' : 'Select "Add to Home Screen"'}</p>
              <p>3. {language === 'bn' ? '"Add" ট্যাপ করুন' : 'Tap "Add"'}</p>
            </div>
            <Button onClick={() => setShowIOSGuide(false)} className="w-full">
              {language === 'bn' ? 'বুঝেছি' : 'Got it'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
