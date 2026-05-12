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
      className={`block rounded-xl border px-3 py-2 transition-colors ${
        isCritical
          ? 'bg-destructive/10 border-destructive/40'
          : isLong
            ? 'bg-amber-500/10 border-amber-500/40'
            : 'bg-amber-500/10 border-amber-500/30'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
          isCritical
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-amber-500 text-white'
        }`}>
          {isCritical ? <AlertTriangle className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-xs font-bold ${isCritical ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}`}>
              {language === 'bn' ? '✋ ম্যানুয়াল মোড' : '✋ Manual Mode'}
            </p>
            {manualSince && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {timeAgo}
              </span>
            )}
          </div>
          {isLong && (
            <p className={`text-[10px] mt-0.5 ${isCritical ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
              {language === 'bn' ? 'দীর্ঘদিন ম্যানুয়ালে — অটোতে ফেরা ভালো' : 'Long manual — switch to Auto'}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
