import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SunDim, Plug, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Compact dashboard card showing current ambient light from the LDR sensor.
 *
 * States:
 *   1. hasData === null      → loading (renders nothing briefly)
 *   2. hasData === false     → LDR never reported → "not connected" install prompt
 *   3. hasData === true + fresh (<5min)  → live lux reading with color tier
 *   4. hasData === true + stale (>=5min) → "No data for X minutes" offline banner
 */
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Bengali numeral converter for nicer offline copy
const toBn = (n: number) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

export function LightSensorCard() {
  const { language, user } = useAuth();
  const [lux, setLux] = useState<number | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [recordedAt, setRecordedAt] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchLatest = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('light_lux, recorded_at')
        .eq('user_id', user.id)
        .not('light_lux', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      const v = (data as any)?.light_lux;
      const t = (data as any)?.recorded_at;
      if (v === null || v === undefined) {
        setHasData(false);
      } else {
        setLux(Number(v));
        setRecordedAt(t ? new Date(t) : new Date());
        setHasData(true);
      }
    };

    fetchLatest();
    const channel = supabase
      .channel('dashboard-lux-card')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const v = (payload.new as any)?.light_lux;
          const t = (payload.new as any)?.recorded_at;
          if (v !== null && v !== undefined) {
            setLux(Number(v));
            setRecordedAt(t ? new Date(t) : new Date());
            setHasData(true);
          }
        })
      .subscribe();
    const interval = setInterval(fetchLatest, 60000);
    // tick every 30s so the "X minutes ago" label stays current
    const ticker = setInterval(() => setNow(new Date()), 30000);
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearInterval(ticker);
    };
  }, [user]);

  // ─── State 2: LDR never reported (not installed) ──────────────────────
  if (hasData === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div
          className="block rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Plug className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 leading-tight">
                {language === 'bn' ? 'আলোর সেন্সর সংযুক্ত নেই' : 'Light sensor not connected'}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5 leading-tight">
                {language === 'bn'
                  ? 'LDR সেন্সর সংযোগ পরীক্ষা করুন'
                  : 'Check LDR sensor connection'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── Loading / no reading yet ─────────────────────────────────────────
  if (hasData === null) return null;

  // ─── Compute staleness ────────────────────────────────────────────────
  const ageMs = recordedAt ? now.getTime() - recordedAt.getTime() : 0;
  const isStale = recordedAt !== null && ageMs >= STALE_THRESHOLD_MS;
  const ageMinutes = Math.max(1, Math.floor(ageMs / 60000));
  const ageHours = Math.floor(ageMinutes / 60);

  const ageLabel = (() => {
    if (ageHours >= 24) {
      const days = Math.floor(ageHours / 24);
      return language === 'bn'
        ? `${toBn(days)} দিন ধরে কোনো ডাটা নেই`
        : `No data for ${days} day${days > 1 ? 's' : ''}`;
    }
    if (ageHours >= 1) {
      return language === 'bn'
        ? `${toBn(ageHours)} ঘণ্টা ধরে কোনো ডাটা নেই`
        : `No data for ${ageHours} hour${ageHours > 1 ? 's' : ''}`;
    }
    return language === 'bn'
      ? `${toBn(ageMinutes)} মিনিট ধরে কোনো ডাটা নেই`
      : `No data for ${ageMinutes} minute${ageMinutes > 1 ? 's' : ''}`;
  })();

  // ─── State 4: Stale data (controller/sensor offline) ──────────────────
  if (isStale) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            <WifiOff className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              {language === 'bn' ? 'আলোর সেন্সর: অফলাইন' : 'Light sensor: Offline'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              {ageLabel}
              {lux !== null && (
                <span className="opacity-70">
                  {' · '}
                  {language === 'bn' ? 'শেষ মান' : 'last'}: {Math.round(lux)} lux
                </span>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── State 3: Fresh data — show live tier card ────────────────────────
  const tier = (() => {
    if (lux === null) return { color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', label: '—' };
    if (lux < 10)   return { color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/50', border: 'border-indigo-200 dark:border-indigo-800', label: language === 'bn' ? 'অন্ধকার' : 'Dark' };
    if (lux < 50)   return { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-200 dark:border-purple-800', label: language === 'bn' ? 'গোধূলি' : 'Dim' };
    if (lux < 200)  return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800', label: language === 'bn' ? 'ভেতরে আলো' : 'Indoor' };
    if (lux < 1000) return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/50', border: 'border-yellow-200 dark:border-yellow-800', label: language === 'bn' ? 'দিনের আলো' : 'Daylight' };
    return { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50', border: 'border-orange-200 dark:border-orange-800', label: language === 'bn' ? 'উজ্জ্বল রোদ' : 'Bright' };
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={`rounded-2xl border p-3 text-center ${tier.bg} ${tier.border}`}
    >
      <div className="flex items-center justify-center gap-1 mb-1.5">
        <SunDim className={`h-4 w-4 ${tier.color}`} />
      </div>
      <p className={`text-xl font-bold ${tier.color} leading-none mb-0.5 tabular-nums`}>
        {lux !== null ? Math.round(lux) : '—'} <span className="text-xs font-normal opacity-70">lux</span>
      </p>
      <p className={`text-[9px] font-medium ${tier.color} opacity-80 mb-0.5`}>
        {tier.label}
      </p>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {language === 'bn' ? 'আলোর মাত্রা' : 'Light Level'}
      </p>
    </motion.div>
  );
}
