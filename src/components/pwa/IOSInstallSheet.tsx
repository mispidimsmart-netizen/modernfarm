import { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function IOSInstallSheet() {
  const { isInstallable, isInstalled, isIOS, dismissPrompt } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed recently
    const dismissed = localStorage.getItem('ios-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return;
      }
    }

    // Show prompt after delay for iOS only
    if (isIOS && isInstallable && !isInstalled) {
      const timer = setTimeout(() => setIsVisible(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [isIOS, isInstallable, isInstalled]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('ios-install-dismissed', Date.now().toString());
    dismissPrompt();
  };

  if (!isVisible || !isIOS || isInstalled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="mx-4 mb-4">
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl",
              "bg-background/95 backdrop-blur-xl",
              "border border-border shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">
                অ্যাপ ইনস্টল করুন
              </h3>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Steps */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Safari এর Share বাটনে ট্যাপ করুন</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Share className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">নিচের বার থেকে</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">"Add to Home Screen" সিলেক্ট করুন</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Plus className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">স্ক্রল করে খুঁজুন</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow pointing down to Safari share button */}
            <div className="flex justify-center pb-2">
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-primary"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="rotate-180"
                >
                  <path
                    d="M12 4L12 20M12 20L18 14M12 20L6 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom arrow pointing to Safari share button */}
        <div className="flex justify-center pb-6">
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-primary" />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
