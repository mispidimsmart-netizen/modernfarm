/**
 * DashboardSnapshotBar — Compact at-a-glance mini-stats bar
 *
 * Sits at the very top of the Dashboard (below Header). 4 chips:
 *  - Sheds (count)
 *  - Birds (total flock)
 *  - Active alerts (danger + warning)
 *  - Devices online (X/Y ESP32s)
 *
 * Goal: farmer sees farm size + current load in <2s without scrolling.
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Bird, AlertTriangle, Cpu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSheds } from '@/hooks/useSheds';
import { useFlockInfo } from '@/hooks/useFarmManagement';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import useSmartAlerts from '@/hooks/useSmartAlerts';
import { cn } from '@/lib/utils';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

interface ChipProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone: 'neutral' | 'ok' | 'warn' | 'danger';
  onClick?: () => void;
}

const TONE_CLASSES: Record<ChipProps['tone'], string> = {
  neutral: 'bg-muted/50 text-foreground border-border',
  ok:      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900',
  warn:    'bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-950/30  dark:text-amber-300  dark:border-amber-900',
  danger:  'bg-red-50    text-red-700    border-red-200    dark:bg-red-950/30    dark:text-red-300    dark:border-red-900',
};

function Chip({ icon, value, label, tone, onClick }: ChipProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex flex-1 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
        TONE_CLASSES[tone],
        onClick && 'hover:opacity-90 active:scale-[0.98]'
      )}
    >
      <span className="flex-shrink-0 opacity-80">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold leading-tight tabular-nums">{value}</div>
        <div className="text-[10px] leading-tight opacity-80 truncate">{label}</div>
      </div>
    </Tag>
  );
}

export const DashboardSnapshotBar = memo(function DashboardSnapshotBar() {
  const { language } = useAuth();
  const navigate = useNavigate();
  const { data: sheds = [] } = useSheds();
  const { data: flock } = useFlockInfo();
  const { data: deviceHealth = [] } = useAllDeviceHealth();
  const { alertCounts } = useSmartAlerts();

  const totalDevices = deviceHealth.length;
  const onlineDevices = deviceHealth.filter(d => {
    if (!d.is_online || !d.last_seen_at) return false;
    return Date.now() - new Date(d.last_seen_at).getTime() < ONLINE_THRESHOLD_MS;
  }).length;

  const activeAlerts = alertCounts.danger + alertCounts.warning;

  // Hide the snapshot bar entirely when the account manages only a single shed —
  // the same info is already visible elsewhere on the dashboard, so this row
  // becomes redundant noise for single-shed farms.
  if (sheds.length <= 1) return null;

  const alertTone: ChipProps['tone'] =
    alertCounts.danger > 0 ? 'danger' : alertCounts.warning > 0 ? 'warn' : 'ok';

  const deviceTone: ChipProps['tone'] =
    totalDevices === 0 ? 'neutral'
      : onlineDevices === totalDevices ? 'ok'
      : onlineDevices === 0 ? 'danger' : 'warn';

  const fmt = (n: number) =>
    language === 'bn' ? n.toLocaleString('bn-BD') : n.toLocaleString('en-US');

  return (
    <div className="px-3 pt-2 pb-1 sm:px-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
        <Chip
          icon={<Home size={16} />}
          value={fmt(sheds.length)}
          label={language === 'bn' ? 'শেড' : 'Sheds'}
          tone="neutral"
          onClick={() => navigate('/farm')}
        />
        <Chip
          icon={<Bird size={16} />}
          value={fmt(flock?.total_birds ?? 0)}
          label={language === 'bn' ? 'মোট পাখি' : 'Total birds'}
          tone="neutral"
          onClick={() => navigate('/farm')}
        />
        <Chip
          icon={<AlertTriangle size={16} />}
          value={fmt(activeAlerts)}
          label={language === 'bn' ? 'সক্রিয় সতর্কতা' : 'Active alerts'}
          tone={alertTone}
          onClick={() => navigate('/alerts')}
        />
        <Chip
          icon={<Cpu size={16} />}
          value={totalDevices === 0 ? '—' : `${fmt(onlineDevices)}/${fmt(totalDevices)}`}
          label={language === 'bn' ? 'ডিভাইস অনলাইন' : 'Devices online'}
          tone={deviceTone}
          onClick={() => navigate('/settings')}
        />
      </div>
    </div>
  );
});

export default DashboardSnapshotBar;
