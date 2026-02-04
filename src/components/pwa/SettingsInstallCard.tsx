import { useState } from 'react';
import { Download, CheckCircle2, Smartphone, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';

export function SettingsInstallCard() {
  const { language } = useAuth();
  const { isInstalled, isIOS, promptInstall, canPrompt } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const t = {
    install: language === 'bn' ? 'ইনস্টল করুন' : 'Install',
    installed: language === 'bn' ? 'ইনস্টল হয়েছে' : 'Installed',
    title: language === 'bn' ? 'অ্যাপ ইনস্টল করুন' : 'Install App',
    description: language === 'bn' 
      ? 'হোম স্ক্রিনে যোগ করে দ্রুত অ্যাক্সেস পান' 
      : 'Add to home screen for quick access',
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

  // Always show the card - even if not installable, show info about the app
  const showInstallButton = canPrompt || isIOS;
  const showInstalledState = isInstalled;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-4 shadow-lg"
      >
        {/* Background decoration */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
        
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-white">{t.title}</h3>
                <Sparkles className="h-4 w-4 text-yellow-300" />
              </div>
              <p className="text-xs text-white/80">{t.description}</p>
            </div>
          </div>
          
          {showInstalledState ? (
            <Button 
              variant="secondary" 
              size="sm" 
              disabled 
              className="gap-2 shrink-0 bg-white/20 text-white border-0 hover:bg-white/20"
            >
              <CheckCircle2 size={16} />
              {t.installed}
            </Button>
          ) : showInstallButton ? (
            <Button 
              variant="secondary"
              size="sm"
              onClick={handleInstall}
              disabled={isInstalling}
              className="gap-2 shrink-0 bg-white text-primary font-semibold hover:bg-white/90 shadow-md"
            >
              <Download size={16} />
              {isInstalling ? '...' : t.install}
            </Button>
          ) : (
            <Button 
              variant="secondary"
              size="sm"
              disabled
              className="gap-2 shrink-0 bg-white/20 text-white border-0"
            >
              <Smartphone size={16} />
              {language === 'bn' ? 'PWA' : 'PWA'}
            </Button>
          )}
        </div>
      </motion.div>

      {/* iOS Installation Guide Dialog */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" onClick={() => setShowIOSGuide(false)}>
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {language === 'bn' ? 'iOS-এ ইনস্টল করুন' : 'Install on iOS'}
                </h3>
                <p className="text-xs text-muted-foreground">Safari ব্যবহার করুন</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                <p className="text-sm">{language === 'bn' ? 'Safari-তে Share বাটনে ট্যাপ করুন' : 'Tap Share button in Safari'}</p>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                <p className="text-sm">{language === 'bn' ? '"Add to Home Screen" সিলেক্ট করুন' : 'Select "Add to Home Screen"'}</p>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                <p className="text-sm">{language === 'bn' ? '"Add" ট্যাপ করুন' : 'Tap "Add"'}</p>
              </div>
            </div>
            
            <Button onClick={() => setShowIOSGuide(false)} className="w-full">
              {language === 'bn' ? 'বুঝেছি' : 'Got it'}
            </Button>
          </motion.div>
        </div>
      )}
    </>
  );
}
