import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/context/AuthContext';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineIndicator() {
  const { language } = useAuth();
  const { isOnline, isSyncing, pendingCount, syncQueue } = useOfflineSync();

  const showIndicator = !isOnline || pendingCount > 0;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          key="offline-indicator"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`fixed left-4 right-4 top-16 z-50 rounded-xl p-3 shadow-lg ${
            isOnline 
              ? 'bg-status-warning/90 text-status-warning-foreground' 
              : 'bg-status-danger/90 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <>
                  <WifiOff className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">
                      {language === 'bn' ? 'অফলাইন মোড' : 'Offline Mode'}
                    </p>
                    <p className="text-xs opacity-90">
                      {language === 'bn' 
                        ? 'ডেটা স্থানীয়ভাবে সংরক্ষিত হচ্ছে' 
                        : 'Data will be saved locally'}
                    </p>
                  </div>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <div>
                    <p className="text-sm font-medium">
                      {language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...'}
                    </p>
                    <p className="text-xs opacity-90">
                      {language === 'bn' 
                        ? `${pendingCount}টি আইটেম বাকি` 
                        : `${pendingCount} items remaining`}
                    </p>
                  </div>
                </>
              ) : pendingCount > 0 ? (
                <>
                  <CloudOff className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">
                      {language === 'bn' 
                        ? `${pendingCount}টি আইটেম সিঙ্ক হয়নি` 
                        : `${pendingCount} items pending sync`}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            {isOnline && pendingCount > 0 && !isSyncing && (
              <button
                onClick={() => syncQueue()}
                className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/30"
              >
                {language === 'bn' ? 'সিঙ্ক করুন' : 'Sync Now'}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
