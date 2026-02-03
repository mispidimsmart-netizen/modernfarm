import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, Share, CheckCircle2, ArrowDown, Monitor, Chrome, MoreVertical } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SettingsInstallCard() {
  const { language } = useAuth();
  const { isInstallable, isInstalled, isIOS, promptInstall, canPrompt } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const t = {
    title: language === 'bn' ? '📱 অ্যাপ ইনস্টল করুন' : '📱 Install App',
    description: language === 'bn' 
      ? 'মোবাইল/ডেস্কটপে অ্যাপ ইনস্টল করুন - ব্রাউজার ছাড়াই চালান' 
      : 'Install on mobile/desktop - run without browser',
    installBtn: language === 'bn' ? 'এখনই ইনস্টল করুন' : 'Install Now',
    showGuide: language === 'bn' ? 'কিভাবে ইনস্টল করবেন?' : 'How to install?',
    installed: language === 'bn' ? '✅ ইনস্টল হয়েছে' : '✅ Already Installed',
    features: [
      { bn: '⚡ দ্রুত লোড হয়', en: '⚡ Faster loading' },
      { bn: '📴 অফলাইনে কাজ করে', en: '📴 Works offline' },
      { bn: '🔔 পুশ নোটিফিকেশন পাবেন', en: '🔔 Push notifications' },
      { bn: '🖥️ ব্রাউজার UI থাকবে না', en: '🖥️ No browser UI' },
    ],
    guideTitle: language === 'bn' ? 'ইনস্টল গাইড' : 'Installation Guide',
    gotIt: language === 'bn' ? 'বুঝেছি' : 'Got it',
    android: language === 'bn' ? 'Android' : 'Android',
    ios: language === 'bn' ? 'iPhone/iPad' : 'iPhone/iPad',
    desktop: language === 'bn' ? 'ডেস্কটপ' : 'Desktop',
  };

  const handleInstall = async () => {
    if (canPrompt) {
      setIsInstalling(true);
      try {
        await promptInstall();
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowGuide(true);
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
          ) : (
            <div className="space-y-2">
              {canPrompt ? (
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
                <Button 
                  onClick={() => setShowGuide(true)}
                  variant="default"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <Download className="mr-2 h-5 w-5" />
                  {t.showGuide}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installation Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download size={20} />
              {t.guideTitle}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue={isIOS ? 'ios' : 'android'} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="android" className="text-xs">
                <Chrome className="h-3 w-3 mr-1" />
                {t.android}
              </TabsTrigger>
              <TabsTrigger value="ios" className="text-xs">
                <Smartphone className="h-3 w-3 mr-1" />
                {t.ios}
              </TabsTrigger>
              <TabsTrigger value="desktop" className="text-xs">
                <Monitor className="h-3 w-3 mr-1" />
                {t.desktop}
              </TabsTrigger>
            </TabsList>

            {/* Android Guide */}
            <TabsContent value="android" className="space-y-3 mt-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {language === 'bn' ? 'Chrome ব্রাউজারে সাইট খুলুন' : 'Open site in Chrome browser'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {language === 'bn' ? '⋮ মেনু বাটনে ট্যাপ করুন' : 'Tap ⋮ menu button'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <MoreVertical size={18} className="text-primary" />
                    <span className="text-xs">{language === 'bn' ? 'উপরে ডানে' : 'Top right'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {language === 'bn' ? '"Install app" বা "Add to Home screen" সিলেক্ট করুন' : 'Select "Install app" or "Add to Home screen"'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  {language === 'bn' ? 'হোম স্ক্রিনে অ্যাপ আইকন দেখবেন!' : 'App icon will appear on home screen!'}
                </p>
              </div>
            </TabsContent>

            {/* iOS Guide */}
            <TabsContent value="ios" className="space-y-3 mt-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {language === 'bn' ? 'Safari ব্রাউজারে সাইট খুলুন' : 'Open site in Safari browser'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'bn' ? '(Chrome কাজ করবে না)' : '(Chrome won\'t work)'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {language === 'bn' ? 'Share বাটনে ট্যাপ করুন' : 'Tap the Share button'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <Share size={18} className="text-primary" />
                    <ArrowDown size={14} />
                    <span className="text-xs">{language === 'bn' ? 'Safari এর নিচে' : 'At the bottom'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {language === 'bn' ? '"Add to Home Screen" সিলেক্ট করুন' : 'Select "Add to Home Screen"'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  {language === 'bn' ? 'হোম স্ক্রিনে অ্যাপ আইকন দেখবেন!' : 'App icon will appear on home screen!'}
                </p>
              </div>
            </TabsContent>

            {/* Desktop Guide */}
            <TabsContent value="desktop" className="space-y-3 mt-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {language === 'bn' ? 'Chrome/Edge ব্রাউজারে সাইট খুলুন' : 'Open site in Chrome/Edge browser'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {language === 'bn' ? 'অ্যাড্রেস বারে ইনস্টল আইকন খুঁজুন' : 'Look for install icon in address bar'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <Download size={16} className="text-primary" />
                    <span className="text-xs">{language === 'bn' ? 'ডানদিকে' : 'On the right side'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {language === 'bn' ? '"Install" বাটনে ক্লিক করুন' : 'Click "Install" button'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  {language === 'bn' ? 'ডেস্কটপে অ্যাপ শর্টকাট তৈরি হবে!' : 'Desktop shortcut will be created!'}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={() => setShowGuide(false)} className="w-full mt-4">
            {t.gotIt}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
