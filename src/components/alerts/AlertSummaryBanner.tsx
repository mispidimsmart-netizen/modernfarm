import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, Bell, Moon, BellOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { Link } from 'react-router-dom';

export function AlertSummaryBanner() {
  const { language } = useAuth();
  const { alertCounts, criticalAlert, isQuietHours } = useSmartAlerts();

  if (alertCounts.total === 0) return null;

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
      <Link to="/alerts">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            'mx-4 mb-4 rounded-xl p-3 text-white shadow-lg',
            style.bg,
            style.pulse && 'animate-pulse'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Icon size={22} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              {criticalAlert && (
                <p className="truncate font-medium">
                  {language === 'bn' ? criticalAlert.titleBn : criticalAlert.title}
                </p>
              )}
              {!criticalAlert && (
                <p className="truncate font-medium">
                  {style.label[language]}
                </p>
              )}
              <div className="flex items-center gap-3 text-sm text-white/80">
                {alertCounts.danger > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle size={14} />
                    {alertCounts.danger}
                  </span>
                )}
                {alertCounts.warning > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertCircle size={14} />
                    {alertCounts.warning}
                  </span>
                )}
                {alertCounts.info > 0 && (
                  <span className="flex items-center gap-1">
                    <Info size={14} />
                    {alertCounts.info}
                  </span>
                )}
              </div>
            </div>

            {/* Quiet hours indicator */}
            {isQuietHours && (
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs">
                <Moon size={12} />
                <span>{language === 'bn' ? 'রাত' : 'Night'}</span>
              </div>
            )}

            <Bell size={20} className="text-white/60" />
          </div>
        </motion.div>
      </Link>
    </AnimatePresence>
  );
}

export default AlertSummaryBanner;
