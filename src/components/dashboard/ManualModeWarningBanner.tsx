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
      className={`inline-flex max-w-full items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-colors ${
        isCritical
          ? 'bg-destructive/10 border-destructive/40 hover:bg-destructive/15'
          : 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
      }`}
      aria-label={language === 'bn' ? 'ম্যানুয়াল মোড — সেটিংসে যান' : 'Manual mode — go to settings'}
    >
      <span className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
        isCritical ? 'bg-destructive text-destructive-foreground' : 'bg-amber-500 text-white'
      }`}>
        {isCritical ? <AlertTriangle className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />}
      </span>
      <span className={`text-xs font-bold whitespace-nowrap ${
        isCritical ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'
      }`}>
        {language === 'bn' ? '✋ ম্যানুয়াল' : '✋ Manual'}
      </span>
      {manualSince && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground border-l border-border/60 pl-2 truncate min-w-0">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{timeAgo}</span>
        </span>
      )}
      {isLong && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
          isCritical
            ? 'bg-destructive/20 text-destructive'
            : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
        }`}>
          {language === 'bn' ? 'দীর্ঘ' : 'Long'}
        </span>
      )}
    </Link>
  );
}
