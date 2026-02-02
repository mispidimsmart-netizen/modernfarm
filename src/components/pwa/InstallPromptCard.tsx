import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Smartphone, Share, X, CheckCircle2, ArrowDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function InstallPromptCard() {
  const { language } = useAuth();
  const { isInstallable, isInstalled, isIOS, promptInstall, canPrompt } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa-install-dismissed') === 'true';
  });

  const t = {
    title: { bn: 'অ্যাপ ইনস্টল করুন', en: 'Install App' },
    description: { 
      bn: 'হোম স্ক্রিনে যোগ করুন - দ্রুত অ্যাক্সেস ও অফলাইন সাপোর্ট', 
      en: 'Add to home screen for quick access & offline support' 
    },
    install: { bn: 'ইনস্টল', en: 'Install' },
    installed: { bn: 'ইনস্টল হয়েছে ✓', en: 'Installed ✓' },
    iosTitle: { bn: 'iOS-এ ইনস্টল করুন', en: 'Install on iOS' },
    iosStep1: { bn: '১. নিচের Share বাটনে ট্যাপ করুন', en: '1. Tap the Share button below' },
    iosStep2: { bn: '২. "Add to Home Screen" সিলেক্ট করুন', en: '2. Select "Add to Home Screen"' },
    iosStep3: { bn: '৩. "Add" বাটনে ট্যাপ করুন', en: '3. Tap "Add" button' },
    gotIt: { bn: 'বুঝেছি', en: 'Got it' },
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      await promptInstall();
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed || !isInstallable) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
          
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Smartphone size={24} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">{t.title[language]}</p>
                <p className="text-sm text-white/80 truncate">{t.description[language]}</p>
              </div>
              
              <Button
                onClick={handleInstall}
                size="sm"
                className="shrink-0 bg-white text-green-600 hover:bg-white/90"
              >
                <Download size={16} className="mr-1" />
                {t.install[language]}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'bn' ? 'স্ক্রল করে খুঁজুন' : 'Scroll to find it'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">{language === 'bn' ? '"Add" বাটনে ট্যাপ করুন' : 'Tap "Add" button'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle2 size={20} className="text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    {language === 'bn' ? 'হোম স্ক্রিনে অ্যাপ আইকন দেখবেন' : 'App icon will appear on home screen'}
                  </span>
                </div>
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
