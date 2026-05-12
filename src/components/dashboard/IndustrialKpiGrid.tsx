/**
 * IndustrialKpiGrid — 2×2 always-visible KPI tiles
 *
 * Above-the-fold sensor strip showing 4 critical metrics with status color:
 *   Temperature · Humidity · Ammonia · Water
 *
 * Offline / stale handling (S2.2 + offline hardening):
 *  - never received data → animated skeleton tiles
 *  - stale (>1h old) or browser offline → muted "last seen" tile, NO value
 *  - fresh → live value + status color
 *
 * The grid never displays misleading old numbers as if they were live.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind, GlassWater, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeStatusLevels } from '@/hooks/useRealtimeSensorData';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';
import type { StatusLevel } from '@/lib/types';
import { MiniSparkline } from './MiniSparkline';

type TileState = 'fresh' | 'stale' | 'never';

interface KpiTileProps {
  icon: React.ReactNode;
  value: string;
  unit: string;
  label: string;
  status: StatusLevel;
  state: TileState;
  trend?: number[];
  delay?: number;
}

const STATUS_STYLES: Record<StatusLevel, { ring: string; text: string; dot: string }> = {
  normal:  { ring: 'ring-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  warning: { ring: 'ring-amber-500/30',   text: 'text-amber-600 dark:text-amber-400',   dot: 'bg-amber-500' },
  danger:  { ring: 'ring-red-500/40',     text: 'text-red-600 dark:text-red-400',       dot: 'bg-red-500' },
};

function KpiTile({ icon, value, unit, label, status, state, delay = 0 }: KpiTileProps) {
  const s = STATUS_STYLES[status];
  const isFresh = state === 'fresh';
  const isNever = state === 'never';

  if (isNever) {
    // Skeleton state — animated placeholder, never shows numbers
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay }}
        className="relative flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 p-2.5"
        aria-busy="true"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground/50">
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-2 w-12 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'relative flex items-center gap-2 rounded-xl border bg-card p-2.5 ring-1',
        isFresh ? s.ring : 'ring-border/40 border-dashed'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
          isFresh ? cn('bg-current/10', s.text) : 'bg-muted text-muted-foreground/60'
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          {isFresh && <span className={cn('h-1 w-1 rounded-full flex-shrink-0', s.dot)} />}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span
            className={cn(
              'text-lg font-bold tabular-nums leading-tight',
              isFresh ? s.text : 'text-muted-foreground/50'
            )}
          >
            {value}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground">{unit}</span>
        </div>
      </div>
    </motion.div>
  );
}

function formatLastSeen(ageMs: number, lang: 'bn' | 'en'): string {
  const min = Math.floor(ageMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (lang === 'bn') {
    if (day > 0) return `${day} দিন আগে`;
    if (hr > 0) return `${hr} ঘন্টা আগে`;
    if (min > 0) return `${min} মিনিট আগে`;
    return 'এইমাত্র';
  }
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return 'just now';
}

export const IndustrialKpiGrid = memo(function IndustrialKpiGrid() {
  const { language } = useAuth();
  const { sensorData, hasRealData, hasAnyData, ageMs, browserOnline } = useRealtimeSensorData();
  const status = useRealtimeStatusLevels(sensorData);

  // Determine grid state
  const tileState: TileState = hasRealData
    ? 'fresh'
    : hasAnyData
      ? 'stale'
      : 'never';

  const fmt = (n: number, decimals = 0) =>
    tileState === 'fresh' ? n.toFixed(decimals) : '--';

  const showOfflineBanner = !browserOnline || tileState === 'stale';

  return (
    <div className="space-y-2">
      {showOfflineBanner && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] dark:border-amber-900 dark:bg-amber-950/40"
          role="status"
        >
          <WifiOff size={12} className="text-amber-600 dark:text-amber-400" />
          <span className="text-amber-800 dark:text-amber-200 font-medium">
            {!browserOnline
              ? language === 'bn' ? 'আপনি অফলাইন — সর্বশেষ মান দেখানো বন্ধ' : 'You are offline — live values paused'
              : language === 'bn' ? 'সেন্সর অফলাইন' : 'Sensor offline'}
          </span>
          {tileState === 'stale' && ageMs !== null && (
            <span className="text-amber-700/80 dark:text-amber-300/80">
              · {language === 'bn' ? 'সর্বশেষ' : 'last'} {formatLastSeen(ageMs, language)}
            </span>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <KpiTile
          icon={<Thermometer size={18} />}
          value={fmt(sensorData.temperature, 1)}
          unit={translations.units.celsius[language]}
          label={translations.sensors.temperature[language]}
          status={status.temperature}
          state={tileState}
          delay={0}
        />
        <KpiTile
          icon={<Droplets size={18} />}
          value={fmt(sensorData.humidity)}
          unit={translations.units.percent[language]}
          label={translations.sensors.humidity[language]}
          status={status.humidity}
          state={tileState}
          delay={0.05}
        />
        <KpiTile
          icon={<Wind size={18} />}
          value={fmt(sensorData.ammonia)}
          unit={translations.units.ppm[language]}
          label={translations.sensors.ammonia[language]}
          status={status.ammonia}
          state={tileState}
          delay={0.1}
        />
        <KpiTile
          icon={<GlassWater size={18} />}
          value={fmt(sensorData.waterUsage)}
          unit={translations.units.litersPerHour[language]}
          label={translations.sensors.water[language]}
          status={status.water}
          state={tileState}
          delay={0.15}
        />
      </div>
    </div>
  );
});

export default IndustrialKpiGrid;
