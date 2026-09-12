import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/context/AuthContext';

function bn(n: number, lang: string) {
  if (lang !== 'bn') return String(n);
  const map: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  return String(n).replace(/[0-9]/g, (d) => map[d] ?? d);
}

/** Phase 3 — small header pill showing pending offline mutations. */
export function OfflineMutationBadge() {
  const { language } = useAuth();
  const { isOnline, isSyncing, pendingCount, syncQueue } = useOfflineSync();

  if (pendingCount === 0 && !isSyncing) return null;

  const Icon = isSyncing ? RefreshCw : !isOnline ? CloudOff : CheckCircle2;
  const tone = !isOnline
    ? 'bg-status-danger/15 text-status-danger border-status-danger/30'
    : isSyncing
      ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
      : 'bg-status-normal/15 text-status-normal border-status-normal/30';

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        onClick={() => isOnline && syncQueue()}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}
        title={language === 'bn' ? 'অফলাইন পরিবর্তন' : 'Offline changes'}
      >
        <Icon className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        {language === 'bn'
          ? `${bn(pendingCount, language)}টি বাকি`
          : `${pendingCount} queued`}
      </motion.button>
    </AnimatePresence>
  );
}
