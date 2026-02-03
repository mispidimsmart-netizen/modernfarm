import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, Share, CheckCircle2, ArrowDown, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SettingsInstallCard() {
  const { language } = useAuth();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const t = {
    title: language === 'bn' ? '📱 অ্যাপ ইনস্টল করুন' : '📱 Install App',
    description: language === 'bn' 
      ? 'মোবাইলে হোম স্ক্রিনে অ্যাপ যোগ করুন - দ্রুত অ্যাক্সেস ও অফলাইন সাপোর্ট পাবেন' 
      : 'Add app to home screen for quick access & offline support',
    installBtn: language === 'bn' ? 'এখনই ইনস্টল করুন' : 'Install Now',
    installed: language === 'bn' ? '✅ ইনস্টল হয়েছে' : '✅ Already Installed',
    notAvailable: language === 'bn' 
      ? '⚠️ ব্রাউজার থেকে অ্যাপ খুলুন - তাহলে ইনস্টল অপশন পাবেন' 
      : '⚠️ Open app from browser to see install option',
    features: [
      { bn: '⚡ দ্রুত লোড হয়', en: '⚡ Faster loading' },
      { bn: '📴 অফলাইনে কাজ করে', en: '📴 Works offline' },
      { bn: '🔔 পুশ নোটিফিকেশন পাবেন', en: '🔔 Push notifications' },
      { bn: '🏠 হোম স্ক্রিনে আইকন', en: '🏠 Home screen icon' },
    ],
    iosTitle: language === 'bn' ? 'iOS-এ ইনস্টল করুন' : 'Install on iOS',
    gotIt: language === 'bn' ? 'বুঝেছি' : 'Got it',
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setIsInstalling(true);
      try {
        await promptInstall();
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            {t.title}
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-2">
            {t.features.map((feature, index) => (
              <div 
                key={index}
                className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 text-center"
              >
                {language === 'bn' ? feature.bn : feature.en}
              </div>
            ))}
          </div>

          {/* Install Button */}
          {isInstalled ? (
            <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-lg">
              <CheckCircle2 size={20} />
              <span className="font-medium">{t.installed}</span>
            </div>
          ) : isInstallable ? (
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Download className="mr-2 h-5 w-5" />
                {isInstalling ? '...' : t.installBtn}
              </Button>
            </motion.div>
          ) : (
            <div className="text-sm text-center text-muted-foreground p-3 bg-muted rounded-lg">
              {t.notAvailable}
            </div>
          )}

          {/* iOS Hint */}
          {isIOS && !isInstalled && (
            <p className="text-xs text-center text-muted-foreground">
              {language === 'bn' 
                ? 'Safari ব্রাউজারে Share → Add to Home Screen' 
                : 'In Safari: Share → Add to Home Screen'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* iOS Installation Guide Dialog */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={20} />
              {t.iosTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {language === 'bn' ? 'Share বাটনে ট্যাপ করুন' : 'Tap the Share button'}
                </p>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <Share size={24} className="text-primary" />
                  <ArrowDown size={16} />
                  <span className="text-sm">
                    {language === 'bn' ? 'Safari এর নিচে' : 'At the bottom of Safari'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {language === 'bn' ? '"Add to Home Screen" সিলেক্ট করুন' : 'Select "Add to Home Screen"'}
                </p>
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
                <p className="font-medium">
                  {language === 'bn' ? '"Add" বাটনে ট্যাপ করুন' : 'Tap "Add" button'}
                </p>
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
            {t.gotIt}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
