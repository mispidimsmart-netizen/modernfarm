import { RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAUpdateBanner() {
  const { showUpdatePrompt, updateApp, dismissUpdate } = usePWAUpdate();

  if (!showUpdatePrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-50 p-4 pt-safe"
      >
        <div className="mx-auto max-w-lg">
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl",
              "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
              "p-4 shadow-2xl shadow-emerald-500/25"
            )}
          >
            {/* Decorative gradient top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-300 via-white to-yellow-300 opacity-50" />

            {/* Sparkle animation */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              className="absolute -top-4 -right-4 text-yellow-300/30"
            >
              <Sparkles className="h-16 w-16" />
            </motion.div>

            <div className="relative">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  >
                    <RefreshCw className="h-6 w-6 text-white" />
                  </motion.div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    নতুন আপডেট উপলব্ধ!
                  </h3>
                  <p className="text-sm text-white/80 mt-0.5">
                    নতুন ভার্সন প্রস্তুত। আপডেট করতে রিফ্রেশ করুন।
                  </p>
                </div>

                <button
                  onClick={dismissUpdate}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5 text-white/80" />
                </button>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={updateApp}
                  className="flex-1 bg-white text-emerald-600 hover:bg-white/90 font-semibold"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  এখনই আপডেট করুন
                </Button>
                <Button
                  onClick={dismissUpdate}
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
