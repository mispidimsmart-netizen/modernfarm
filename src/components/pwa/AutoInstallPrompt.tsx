import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

const INSTALL_PROMPT_DISMISSED_KEY = 'pwa_install_prompt_dismissed';
const INSTALL_PROMPT_DELAY_MS = 2000; // Show after 2 seconds

export function AutoInstallPrompt() {
  const { language } = useAuth();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const t = {
    title: { bn: 'অ্যাপ ইনস্টল করুন', en: 'Install Our App' },
    description: { 
      bn: 'আপনার ফোনে অ্যাপটি ইনস্টল করুন - দ্রুত অ্যাক্সেস, অফলাইন সাপোর্ট এবং নোটিফিকেশন পান!', 
      en: 'Install the app on your phone - get quick access, offline support and notifications!' 
    },
    install: { bn: 'এখনই ইনস্টল করুন', en: 'Install Now' },
    later: { bn: 'পরে করব', en: 'Maybe Later' },
    iosTitle: { bn: 'iOS-এ ইনস্টল করুন', en: 'Install on iOS' },
    gotIt: { bn: 'বুঝেছি', en: 'Got it' },
    step1: { bn: 'Share বাটনে ট্যাপ করুন', en: 'Tap the Share button' },
    step1desc: { bn: 'Safari এর নিচে', en: 'At the bottom of Safari' },
    step2: { bn: '"Add to Home Screen" সিলেক্ট করুন', en: 'Select "Add to Home Screen"' },
    step3: { bn: '"Add" বাটনে ট্যাপ করুন', en: 'Tap "Add" button' },
  };

  useEffect(() => {
    // Don't show if already installed
    if (isInstalled) return;

    // Don't show if not installable
    if (!isInstallable) return;

    // Check if user already dismissed the prompt
    const dismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
    if (dismissed) {
      // Check if it's been more than 7 days since dismissal
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, INSTALL_PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowPrompt(false);
      setShowIOSGuide(true);
    } else {
      const success = await promptInstall();
      if (success) {
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, Date.now().toString());
    setShowPrompt(false);
  };

  // Don't render anything if installed
  if (isInstalled) return null;

  return (
    <>
      {/* Main Install Prompt Dialog */}
      <AnimatePresence>
        {showPrompt && (
          <Dialog open={showPrompt} onOpenChange={(open) => !open && handleDismiss()}>
            <DialogContent className="sm:max-w-md border-primary/20">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Download size={20} />
                  </div>
                  {t.title[language]}
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-4">
                <p className="text-muted-foreground mb-6">
                  {t.description[language]}
                </p>

                {/* Benefits */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50">
                    <Smartphone size={20} className="text-primary" />
                    <span className="text-xs text-center">
                      {language === 'bn' ? 'হোম স্ক্রিনে' : 'Home Screen'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs text-center">
                      {language === 'bn' ? 'দ্রুত লোড' : 'Fast Load'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="text-xs text-center">
                      {language === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={handleInstall} className="w-full gap-2" size="lg">
                    <Download size={18} />
                    {t.install[language]}
                  </Button>
                  <Button variant="ghost" onClick={handleDismiss} className="w-full">
                    {t.later[language]}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

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
                <p className="font-medium">{t.step1[language]}</p>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <Share size={24} className="text-primary" />
                  <span className="text-sm">{t.step1desc[language]}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">{t.step2[language]}</p>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <Plus size={20} className="text-primary" />
                  <span className="text-sm">Add to Home Screen</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">{t.step3[language]}</p>
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
