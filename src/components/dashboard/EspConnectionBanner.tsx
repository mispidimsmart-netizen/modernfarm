import { useEffect, useState } from 'react';
import { WifiOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { cn } from '@/lib/utils';

/**
 * ESP32 Connection Banner
 *
 * - Shows "অফলাইন" when no fresh sensor data (>1h old) or browser offline.
 * - Shows brief "আবার সংযুক্ত হয়েছে" toast-like banner for 4s once data flows again.
 * - Auto-updates via the realtime subscription in useRealtimeSensorData — no
 *   manual reconnect logic needed.
 */
export function EspConnectionBanner() {
  const { hasRealData, hasAnyData, lastSeenAt, ageMs, browserOnline, isConnected } =
    useRealtimeSensorData();

  const [justReconnected, setJustReconnected] = useState(false);
  const [prevHasReal, setPrevHasReal] = useState(hasRealData);

  // Tick every 30s so the "X মিনিট আগে" label stays current while offline.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (hasRealData) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [hasRealData]);

  // Detect offline → online transition.
  useEffect(() => {
    if (!prevHasReal && hasRealData) {
      setJustReconnected(true);
      const id = setTimeout(() => setJustReconnected(false), 4000);
      return () => clearTimeout(id);
    }
    setPrevHasReal(hasRealData);
  }, [hasRealData, prevHasReal]);

  if (justReconnected) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400',
          'animate-in fade-in slide-in-from-top-2'
        )}
        role="status"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>ESP32 আবার সংযুক্ত হয়েছে — লাইভ ডেটা আসছে</span>
      </div>
    );
  }

  if (hasRealData) return null;

  // Offline state — distinguish "never connected" vs "device offline".
  const minutesAgo =
    ageMs != null ? Math.max(1, Math.round(ageMs / 60_000)) : null;

  const formatAge = (mins: number) => {
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    const days = Math.round(hours / 24);
    return `${days} দিন আগে`;
  };

  const message = !browserOnline
    ? 'ইন্টারনেট সংযোগ নেই — পুনরায় সংযোগের চেষ্টা চলছে'
    : !hasAnyData
      ? 'ESP32 কখনো সংযুক্ত হয়নি — ডিভাইস সেটআপ সম্পূর্ণ করুন'
      : `ESP32 অফলাইন — সর্বশেষ ডেটা ${minutesAgo ? formatAge(minutesAgo) : 'অনেক আগে'}`;

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <span className="flex items-center gap-1 text-xs opacity-80">
        <Loader2 className="h-3 w-3 animate-spin" />
        {isConnected ? 'অপেক্ষা করছে' : 'পুনঃসংযোগ'}
      </span>
    </div>
  );
}
