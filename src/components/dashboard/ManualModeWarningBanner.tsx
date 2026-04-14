import { Link } from 'react-router-dom';
import { Hand, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAutomationMode } from '@/hooks/useAutomationMode';
import { useFarmSettings } from '@/hooks/useFarmData';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

export function ManualModeWarningBanner() {
  const { language } = useAuth();
  const { data: mode } = useAutomationMode();
  const { data: settings } = useFarmSettings();

  if (mode !== 'MANUAL') return null;

  const manualSince = (settings as any)?.manual_mode_since;
  const hoursInManual = manualSince
    ? (Date.now() - new Date(manualSince).getTime()) / (1000 * 60 * 60)
    : 0;

  const timeAgo = manualSince
    ? formatDistanceToNow(new Date(manualSince), {
        addSuffix: true,
        locale: language === 'bn' ? bn : enUS,
      })
    : '';

  // Escalate styling based on duration
  const isLong = hoursInManual > 24;
  const isCritical = hoursInManual > 72;

  return (
    <Link
      to="/settings"
      className={`block rounded-2xl border p-4 mb-3 transition-colors ${
        isCritical
          ? 'bg-gradient-to-r from-destructive/15 to-destructive/5 border-destructive/40'
          : isLong
            ? 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 border-amber-500/40'
            : 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/30'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          isCritical
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-amber-500 text-white'
        }`}>
          {isCritical ? <AlertTriangle className="h-5 w-5" /> : <Hand className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${isCritical ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}`}>
            {language === 'bn' ? '✋ ম্যানুয়াল মোড সক্রিয়' : '✋ Manual Mode Active'}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground truncate">
              {manualSince
                ? (language === 'bn' ? `${timeAgo} থেকে ম্যানুয়াল` : `Manual since ${timeAgo}`)
                : (language === 'bn' ? 'অটোমেশন বন্ধ আছে' : 'Automation is off')
              }
            </p>
          </div>
          {isLong && (
            <p className={`text-xs mt-1 font-medium ${isCritical ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
              {language === 'bn'
                ? '⚠️ দীর্ঘদিন ম্যানুয়ালে আছেন — অটো মোডে ফেরার কথা বিবেচনা করুন'
                : '⚠️ Extended manual mode — consider switching back to Auto'}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
