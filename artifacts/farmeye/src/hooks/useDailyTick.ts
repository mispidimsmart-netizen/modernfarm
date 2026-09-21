import { useEffect, useState } from 'react';
import { today as farmToday } from '@/api/types';

/**
 * Returns the current farm-local ISO date (YYYY-MM-DD) and re-renders
 * subscribers automatically when the date changes (midnight cross)
 * or when the tab returns to foreground after a day change.
 *
 * Used by any UI that derives "current age" from a start_date so the
 * displayed value updates without a manual refresh.
 */
export function useDailyTick(): string {
  const [date, setDate] = useState(() => farmToday());

  useEffect(() => {
    let timer: number | undefined;

    const scheduleNextMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 5, 0); // 5s after midnight to be safe
      const ms = next.getTime() - now.getTime();
      timer = window.setTimeout(() => {
        setDate(farmToday());
        scheduleNextMidnight();
      }, ms);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const cur = farmToday();
        setDate((prev) => (prev !== cur ? cur : prev));
      }
    };

    scheduleNextMidnight();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  return date;
}
