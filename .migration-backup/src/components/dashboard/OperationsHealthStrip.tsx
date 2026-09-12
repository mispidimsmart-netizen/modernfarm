/**
 * OperationsHealthStrip — Persistent top-of-screen operational status
 *
 * Always-visible thin strip showing:
 *  - Overall farm system state (NORMAL / WARNING / DANGER / EMERGENCY)
 *  - Critical + warning alert counts
 *  - ESP32 / data freshness state
 *  - Tap → /alerts
 *
 * Hidden on auth/public routes. Sticky at top-0; the page Header sits
 * 28px below it (Header uses `top-[28px]`).
 */

import { memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSafetyStatus } from '@/hooks/useSafetyStatus';
import useSmartAlerts from '@/hooks/useSmartAlerts';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { AlertTriangle, ShieldCheck, ShieldAlert, WifiOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

type StripTone = 'ok' | 'warn' | 'danger' | 'emergency' | 'offline';

const HIDDEN_ROUTES = ['/login', '/reset-password', '/org-signup'];

interface ToneConfig {
  bg: string;
  text: string;
  Icon: typeof ShieldCheck;
  label: { bn: string; en: string };
}

const TONES: Record<StripTone, ToneConfig> = {
  ok:        { bg: 'bg-emerald-600',   text: 'text-white', Icon: ShieldCheck,  label: { bn: 'খামার স্বাভাবিক', en: 'Farm Normal' } },
  warn:      { bg: 'bg-amber-500',     text: 'text-white', Icon: AlertTriangle,label: { bn: 'সতর্কতা',          en: 'Warning' } },
  danger:    { bg: 'bg-orange-600',    text: 'text-white', Icon: ShieldAlert,  label: { bn: 'বিপদ',             en: 'Danger' } },
  emergency: { bg: 'bg-red-600 animate-pulse', text: 'text-white', Icon: ShieldAlert, label: { bn: 'জরুরি অবস্থা', en: 'Emergency' } },
  offline:   { bg: 'bg-slate-500',     text: 'text-white', Icon: WifiOff,      label: { bn: 'অফলাইন',           en: 'Offline' } },
};

function calcHealthScore(opts: {
  hasFreshData: boolean;
  systemState: string | undefined;
  critical: number;
  warning: number;
}): number {
  let score = 100;
  if (!opts.hasFreshData) score -= 25;
  if (opts.systemState === 'WARNING') score -= 10;
  if (opts.systemState === 'DANGER') score -= 25;
  if (opts.systemState === 'EMERGENCY' || opts.systemState === 'SURVIVAL') score -= 50;
  if (opts.systemState === 'SENSOR_FAIL') score -= 20;
  score -= Math.min(40, opts.critical * 15);
  score -= Math.min(20, opts.warning * 4);
  return Math.max(0, Math.min(100, score));
}

function OperationsHealthStripInner() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Always call hooks (rules of hooks); we gate rendering below.
  const { status: safety } = useSafetyStatus();
  const smart = useSmartAlerts();
  const { hasRealData } = useRealtimeSensorData();

  const counts = useMemo(() => ({
    critical: smart?.alertCounts?.danger ?? 0,
    warning: smart?.alertCounts?.warning ?? 0,
  }), [smart?.alertCounts?.danger, smart?.alertCounts?.warning]);

  const tone: StripTone = useMemo(() => {
    if (!hasRealData) return 'offline';
    const s = safety?.system_state;
    if (s === 'EMERGENCY' || s === 'SURVIVAL') return 'emergency';
    if (counts.critical > 0 || s === 'DANGER') return 'danger';
    if (counts.warning > 0 || s === 'WARNING' || s === 'SENSOR_FAIL') return 'warn';
    return 'ok';
  }, [hasRealData, safety?.system_state, counts]);

  const score = useMemo(
    () => calcHealthScore({
      hasFreshData: hasRealData,
      systemState: safety?.system_state,
      critical: counts.critical,
      warning: counts.warning,
    }),
    [hasRealData, safety?.system_state, counts]
  );

  // Gate AFTER hooks
  if (!auth?.user) return null;
  if (HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) return null;

  const cfg = TONES[tone];
  const lang = (auth.language ?? 'bn') as 'bn' | 'en';
  const Icon = cfg.Icon;

  return (
    <button
      type="button"
      onClick={() => navigate('/alerts')}
      aria-label={lang === 'bn' ? 'অপারেশন স্ট্যাটাস — সতর্কতা পেজে যান' : 'Operations status — open alerts'}
      className={cn(
        'sticky top-0 left-0 right-0 z-[55] w-full h-7 px-3',
        'flex items-center justify-between gap-2 text-[11px] font-semibold',
        'shadow-sm transition-colors active:opacity-90',
        cfg.bg, cfg.text,
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {cfg.label[lang]} · {lang === 'bn' ? 'স্কোর' : 'Score'} {score}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {counts.critical > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-black/25 px-1.5 py-0.5">
            <AlertTriangle className="h-3 w-3" />
            {counts.critical}
          </span>
        )}
        {counts.warning > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-black/20 px-1.5 py-0.5">
            {counts.warning} {lang === 'bn' ? 'সতর্ক' : 'warn'}
          </span>
        )}
        <span className="inline-flex items-center gap-1 opacity-90">
          <Activity className="h-3 w-3" />
          {hasRealData ? (lang === 'bn' ? 'লাইভ' : 'LIVE') : (lang === 'bn' ? 'বাসি' : 'STALE')}
        </span>
      </div>
    </button>
  );
}

export const OperationsHealthStrip = memo(OperationsHealthStripInner);
export default OperationsHealthStrip;
