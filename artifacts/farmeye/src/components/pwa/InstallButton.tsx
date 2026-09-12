import { useState } from 'react';
import { Download, Smartphone, Share, CheckCircle2, ArrowDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface InstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export function InstallButton({ 
  variant = 'outline', 
  size = 'sm', 
  className = '',
  showLabel = true 
}: InstallButtonProps) {
  const { language } = useAuth();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const t = {
    install: { bn: 'অ্যাপ ইনস্টল', en: 'Install App' },
    installed: { bn: 'ইনস্টল হয়েছে', en: 'Installed' },
    iosTitle: { bn: 'iOS-এ ইনস্টল করুন', en: 'Install on iOS' },
    gotIt: { bn: 'বুঝেছি', en: 'Got it' },
  };

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      await promptInstall();
    }
  };

  // Already installed
  if (isInstalled) {
    return (
      <Button variant="ghost" size={size} className={className} disabled>
        <CheckCircle2 size={16} className="mr-1 text-green-500" />
        {showLabel && t.installed[language]}
      </Button>
    );
  }

  // Not installable (desktop browser without support, or already in PWA mode)
  if (!isInstallable) {
    return null;
  }

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        className={className}
        onClick={handleClick}
      >
        <Download size={16} className={showLabel ? 'mr-1' : ''} />
        {showLabel && t.install[language]}
      </Button>

      {/* iOS Installation Guide Dialog */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={20} />
              {t.iosTitle[language]}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">{language === 'bn' ? 'Share বাটনে ট্যাপ করুন' : 'Tap the Share button'}</p>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <Share size={24} className="text-primary" />
                  <ArrowDown size={16} />
                  <span className="text-sm">{language === 'bn' ? 'Safari এর নিচে' : 'At the bottom of Safari'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">{language === 'bn' ? '"Add to Home Screen" সিলেক্ট করুন' : 'Select "Add to Home Screen"'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">{language === 'bn' ? '"Add" বাটনে ট্যাপ করুন' : 'Tap "Add" button'}</p>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowIOSGuide(false)} className="w-full">
            {t.gotIt[language]}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
