import { RefreshCw, Sparkles } from 'lucide-react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAUpdateBanner() {
  const { showUpdatePrompt } = usePWAUpdate();

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
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-300 via-white to-yellow-300 opacity-50" />

            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                >
                  <RefreshCw className="h-5 w-5 text-white" />
                </motion.div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  আপডেট হচ্ছে...
                </h3>
                <p className="text-xs text-white/80">
                  নতুন ভার্সন লোড হচ্ছে, কয়েক সেকেন্ড অপেক্ষা করুন
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
