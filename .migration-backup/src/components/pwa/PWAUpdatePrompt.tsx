import { RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAUpdatePrompt() {
  const { language } = useAuth();
  const { showUpdatePrompt, updateApp, dismissUpdate } = usePWAUpdate();

  const t = {
    title: { bn: 'নতুন আপডেট উপলব্ধ!', en: 'New Update Available!' },
    description: { bn: 'নতুন ভার্সন প্রস্তুত। আপডেট করতে রিফ্রেশ করুন।', en: 'A new version is ready. Refresh to update.' },
    update: { bn: 'এখনই আপডেট করুন', en: 'Update Now' },
    later: { bn: 'পরে', en: 'Later' },
  };

  return (
    <AnimatePresence>
      {showUpdatePrompt && (
        <motion.div
          initial={{ opacity: 0, y: -100, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -100, x: '-50%' }}
          className="fixed top-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-[1px] shadow-2xl">
            {/* Decorative gradient top */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 via-transparent to-indigo-400/20" />

            <div className="relative rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm">
                    {t.title[language]}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    {t.description[language]}
                  </p>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={dismissUpdate}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4 text-white/80" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={updateApp}
                  size="sm"
                  className="flex-1 bg-white text-purple-600 hover:bg-white/90 gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t.update[language]}
                </Button>
                <Button
                  onClick={dismissUpdate}
                  size="sm"
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  {t.later[language]}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
