import { Wifi, WifiOff, CircleDot, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  classifyFreshness,
  useFreshnessNow,
  useBrowserOnline,
  type SensorFreshness,
} from '@/hooks/useOfflineSensorCache';
import { cn } from '@/lib/utils';

interface SensorFreshnessBadgeProps {
  /** When the most recent sensor reading was recorded by the ESP32. */
  timestamp: Date | null | undefined;
  /** Compact one-line variant for headers / cards. */
  compact?: boolean;
  className?: string;
}

function formatAgeBn(ms: number, isBn: boolean): string {
  if (ms < 0) ms = 0;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) {
    return isBn ? `${sec} সেকেন্ড আগে` : `${sec}s ago`;
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return isBn ? `${min} মিনিট আগে` : `${min}m ago`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return isBn ? `${hr} ঘন্টা আগে` : `${hr}h ago`;
  }
  const day = Math.floor(hr / 24);
  return isBn ? `${day} দিন আগে` : `${day}d ago`;
}

const FRESHNESS_STYLES: Record<
  SensorFreshness,
  { dot: string; text: string; bg: string; border: string }
> = {
  fresh: {
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  stale: {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  offline: {
    dot: 'bg-destructive',
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
  },
  unknown: {
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
  },
};

export function SensorFreshnessBadge({
  timestamp,
  compact = false,
  className,
}: SensorFreshnessBadgeProps) {
  const { language } = useAuth();
  const isBn = language === 'bn';
  const now = useFreshnessNow();
  const browserOnline = useBrowserOnline();

  const freshness = classifyFreshness(timestamp ?? null, now);
  const styles = FRESHNESS_STYLES[freshness];

  const ageMs = timestamp ? now - timestamp.getTime() : null;
  const ageLabel = ageMs !== null ? formatAgeBn(ageMs, isBn) : (isBn ? 'কোনো ডেটা নেই' : 'No data');

  // Browser-level offline takes visual priority — user needs to know UI is showing cached values.
  if (!browserOnline) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <WifiOff className="h-3.5 w-3.5" />
        <span>{isBn ? 'ইন্টারনেট নেই • ক্যাশ থেকে দেখানো' : 'Offline • showing cache'}</span>
        {!compact && timestamp && (
          <span className="opacity-80">• {ageLabel}</span>
        )}
      </div>
    );
  }

  const label =
    freshness === 'fresh'
      ? isBn ? '🟢 লাইভ' : '🟢 Live'
      : freshness === 'stale'
        ? isBn ? '🟡 কিছুটা পুরোনো' : '🟡 Slight delay'
        : freshness === 'offline'
          ? isBn ? '🔴 ডিভাইস অফলাইন' : '🔴 Device offline'
          : isBn ? '⚪ অজানা' : '⚪ Unknown';

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 text-[11px] font-medium',
          styles.text,
          className
        )}
        title={ageLabel}
      >
        <CircleDot className={cn('h-2.5 w-2.5 rounded-full', styles.dot.replace('bg-', 'fill-'))} />
        <span>{ageLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium',
        styles.bg,
        styles.border,
        styles.text,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {freshness === 'offline' ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Wifi className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
      <span className="opacity-80">• {ageLabel}</span>
    </div>
  );
}
