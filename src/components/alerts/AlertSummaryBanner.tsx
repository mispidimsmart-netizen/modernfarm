import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, Bell, Moon, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { Link } from 'react-router-dom';

const DISMISS_KEY = 'alert-summary-dismissed-id';

export function AlertSummaryBanner() {
  const { language } = useAuth();
  const { alertCounts, criticalAlert, isQuietHours } = useSmartAlerts();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // Read session-dismissed id once on mount
  useEffect(() => {
    try {
      setDismissedId(sessionStorage.getItem(DISMISS_KEY));
    } catch {
      // ignore
    }
  }, []);

  if (alertCounts.total === 0) return null;

  // If the current critical alert was dismissed this session, hide banner
  // (until a new alert appears with a different id)
  const currentAlertKey = criticalAlert?.id || `count-${alertCounts.total}`;
  if (dismissedId && dismissedId === currentAlertKey) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      sessionStorage.setItem(DISMISS_KEY, currentAlertKey);
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'relative rounded-xl text-white shadow-md h-full flex flex-col',
          style.bg,
          style.pulse && 'animate-pulse'
        )}
      >
        <Link to="/alerts" className="block flex-1 flex items-center px-3 py-2.5">
          <div className="flex items-center gap-2.5 pr-7">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 shrink-0">
              <Icon size={18} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
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

        {/* Dismiss for this session (does NOT resolve the alert — Alerts page still shows it) */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={language === 'bn' ? 'এই সেশনের জন্য বন্ধ করুন' : 'Dismiss for this session'}
          className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-white/10 hover:bg-white/25 transition-colors text-white/80"
        >
          <X size={13} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

export default AlertSummaryBanner;
