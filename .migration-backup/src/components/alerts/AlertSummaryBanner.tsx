import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, Bell, Moon, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { Link } from 'react-router-dom';

// localStorage so dismiss persists across sessions and works fully offline.
const DISMISS_KEY = 'alert-summary-dismissed-id';

export function AlertSummaryBanner() {
  const { language } = useAuth();
  const { alertCounts, criticalAlert, isQuietHours } = useSmartAlerts();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // Read persisted dismiss id once on mount
  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(DISMISS_KEY));
    } catch {
      // ignore (private mode / quota)
    }
  }, []);

  if (alertCounts.total === 0) return null;

  // If the current critical alert was dismissed, hide banner until a NEW alert
  // (different id) appears — then it auto-resurfaces.
  const currentAlertKey = criticalAlert?.id || `count-${alertCounts.total}`;
  if (dismissedId && dismissedId === currentAlertKey) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, currentAlertKey);
    } catch {
      // ignore
    }
    setDismissedId(currentAlertKey);
  };

  const getBannerStyle = () => {
    if (alertCounts.danger > 0) {
      return {
        bg: 'bg-gradient-to-r from-red-500 to-red-600',
        icon: AlertTriangle,
        pulse: true,
        label: { bn: 'দ্রুত দেখুন', en: 'Needs attention' },
      };
    }
    if (alertCounts.warning > 0) {
      return {
        bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
        icon: AlertCircle,
        pulse: false,
        label: { bn: 'দেখে নিন', en: 'Check when free' },
      };
    }
    return {
      bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
      icon: Info,
      pulse: false,
      label: { bn: 'সিস্টেম নিজে সামলেছে', en: 'Auto-handled' },
    };
  };

  const style = getBannerStyle();
  const Icon = style.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="alert-summary-banner"
        layout
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{
          opacity: { duration: 0.35, ease: 'easeOut' },
          y: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
          layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        }}
        className={cn(
          'relative rounded-2xl text-white shadow-lg h-full flex flex-col',
          style.bg,
          style.pulse && 'animate-pulse'
        )}
      >
        <Link to="/alerts" className="block flex-1 flex items-center px-4 py-3">
          <div className="flex w-full items-center gap-3 pr-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shrink-0">
              <Icon className="h-6 w-6 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">
                {criticalAlert
                  ? (language === 'bn' ? criticalAlert.titleBn : criticalAlert.title)
                  : style.label[language]}
              </p>
              <div className="flex items-center gap-2.5 text-[11px] text-white/80 mt-0.5">
                {alertCounts.danger > 0 && (
                  <span className="flex items-center gap-0.5">
                    <AlertTriangle size={11} />
                    {alertCounts.danger}
                  </span>
                )}
                {alertCounts.warning > 0 && (
                  <span className="flex items-center gap-0.5">
                    <AlertCircle size={11} />
                    {alertCounts.warning}
                  </span>
                )}
                {alertCounts.info > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Info size={11} />
                    {alertCounts.info}
                  </span>
                )}
                {isQuietHours && (
                  <span className="flex items-center gap-0.5 ml-auto">
                    <Moon size={11} />
                    {language === 'bn' ? 'রাত' : 'Night'}
                  </span>
                )}
              </div>
            </div>

            <Bell size={16} className="text-white/60 shrink-0" />
          </div>
        </Link>

        {/* Dismiss persistently (localStorage). Auto-resurfaces when a new alert id appears.
            Does NOT resolve the alert — /alerts still shows it. Works offline. */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={language === 'bn' ? 'ব্যানার বন্ধ করুন' : 'Dismiss banner'}
          className="absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-md bg-white/15 hover:bg-white/30 transition-colors text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

export default AlertSummaryBanner;
