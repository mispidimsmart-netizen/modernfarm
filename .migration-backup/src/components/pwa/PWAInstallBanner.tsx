import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, promptInstall, dismissPrompt } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isInstallable && !isInstalled && !isIOS) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isIOS]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    dismissPrompt();
    setIsVisible(false);
  };

  if (!isVisible || isInstalled || isIOS) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
      >
        <div className="mx-auto max-w-lg">
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl",
              "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600",
              "p-4 shadow-2xl shadow-cyan-500/25"
            )}
          >
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 animate-pulse" />

            <div className="relative">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white">
                    অ্যাপ ইনস্টল করুন!
                  </h3>
                  <p className="text-sm text-white/80 mt-0.5">
                    হোম স্ক্রিনে যোগ করুন - দ্রুত অ্যাক্সেস পান
                  </p>
                </div>

                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5 text-white/80" />
                </button>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleInstall}
                  className="flex-1 bg-white text-blue-600 hover:bg-white/90 font-semibold"
                >
                  <Download className="h-4 w-4 mr-2" />
                  ইনস্টল করুন
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  পরে
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
