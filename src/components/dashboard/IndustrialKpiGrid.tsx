/**
 * IndustrialKpiGrid — 2×2 always-visible KPI tiles
 *
 * Above-the-fold sensor strip showing 4 critical metrics with status color:
 *   Temperature · Humidity · Ammonia · Water
 *
 * Each tile shows: icon, value, unit, status pill, label. Color follows the
 * unified status level (normal / warning / danger). Compact for mobile.
 *
 * Stays tab-independent — appears in the sticky critical zone of Dashboard.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind, GlassWater } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeStatusLevels } from '@/hooks/useRealtimeSensorData';
import { useSnapshotSensorFallback } from '@/context/DashboardSnapshotContext';
import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';
import type { StatusLevel } from '@/lib/types';

interface KpiTileProps {
  icon: React.ReactNode;
  value: string;
  unit: string;
  label: string;
  status: StatusLevel;
  hasData: boolean;
  delay?: number;
}

const STATUS_STYLES: Record<StatusLevel, { ring: string; text: string; dot: string; pillBg: string; pillText: string }> = {
  normal: {
    ring: 'ring-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    pillBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    pillText: 'text-emerald-700 dark:text-emerald-300',
  },
  warning: {
    ring: 'ring-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    pillBg: 'bg-amber-50 dark:bg-amber-950/40',
    pillText: 'text-amber-700 dark:text-amber-300',
  },
  danger: {
    ring: 'ring-red-500/40',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    pillBg: 'bg-red-50 dark:bg-red-950/40',
    pillText: 'text-red-700 dark:text-red-300',
  },
};

function KpiTile({ icon, value, unit, label, status, hasData, delay = 0 }: KpiTileProps) {
  const s = STATUS_STYLES[status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'relative flex items-center gap-2 rounded-xl border bg-card p-2.5 ring-1',
        hasData ? s.ring : 'ring-border/40 border-dashed'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
          hasData ? cn('bg-current/10', s.text) : 'bg-muted text-muted-foreground/60'
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          {hasData && <span className={cn('h-1 w-1 rounded-full flex-shrink-0', s.dot)} />}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span
            className={cn(
              'text-lg font-bold tabular-nums leading-tight',
              hasData ? s.text : 'text-muted-foreground/50'
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

export const IndustrialKpiGrid = memo(function IndustrialKpiGrid() {
  const { language } = useAuth();
  const { sensorData: live, hasRealData } = useRealtimeSensorData();
  const fallback = useSnapshotSensorFallback();
  const sensorData = hasRealData ? live : fallback ?? live;
  const status = useRealtimeStatusLevels(sensorData);

  const fmt = (n: number, decimals = 0) =>
    hasRealData ? n.toFixed(decimals) : '--';

  return (
    <div className="grid grid-cols-2 gap-2">
      <KpiTile
        icon={<Thermometer size={18} />}
        value={fmt(sensorData.temperature, 1)}
        unit={translations.units.celsius[language]}
        label={translations.sensors.temperature[language]}
        status={status.temperature}
        hasData={hasRealData}
        delay={0}
      />
      <KpiTile
        icon={<Droplets size={18} />}
        value={fmt(sensorData.humidity)}
        unit={translations.units.percent[language]}
        label={translations.sensors.humidity[language]}
        status={status.humidity}
        hasData={hasRealData}
        delay={0.05}
      />
      <KpiTile
        icon={<Wind size={18} />}
        value={fmt(sensorData.ammonia)}
        unit={translations.units.ppm[language]}
        label={translations.sensors.ammonia[language]}
        status={status.ammonia}
        hasData={hasRealData}
        delay={0.1}
      />
      <KpiTile
        icon={<GlassWater size={18} />}
        value={fmt(sensorData.waterUsage)}
        unit={translations.units.litersPerHour[language]}
        label={translations.sensors.water[language]}
        status={status.water}
        hasData={hasRealData}
        delay={0.15}
      />
    </div>
  );
});

export default IndustrialKpiGrid;
