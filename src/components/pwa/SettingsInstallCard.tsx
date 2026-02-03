import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsInstallCard() {
  const { language } = useAuth();
  const { isInstalled, promptInstall, canPrompt } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  const t = {
    title: language === 'bn' ? '📱 অ্যাপ ইনস্টল করুন' : '📱 Install App',
    description: language === 'bn' 
      ? 'মোবাইল/ডেস্কটপে অ্যাপ ইনস্টল করুন - ব্রাউজার ছাড়াই চালান' 
      : 'Install on mobile/desktop - run without browser',
    installBtn: language === 'bn' ? 'এখনই ইনস্টল করুন' : 'Install Now',
    installed: language === 'bn' ? '✅ ইনস্টল হয়েছে' : '✅ Already Installed',
    notSupported: language === 'bn' 
      ? 'এই ব্রাউজারে সরাসরি ইনস্টল সাপোর্ট নেই। Chrome/Edge ব্যবহার করুন।' 
      : 'Direct install not supported. Use Chrome/Edge.',
    features: [
      { bn: '⚡ দ্রুত লোড হয়', en: '⚡ Faster loading' },
      { bn: '📴 অফলাইনে কাজ করে', en: '📴 Works offline' },
      { bn: '🔔 পুশ নোটিফিকেশন পাবেন', en: '🔔 Push notifications' },
      { bn: '🖥️ ব্রাউজার UI থাকবে না', en: '🖥️ No browser UI' },
    ],
  };

  const handleInstall = async () => {
    if (canPrompt) {
      setIsInstalling(true);
      try {
        await promptInstall();
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
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
        ) : canPrompt ? (
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
          <div className="text-center text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
            {t.notSupported}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
