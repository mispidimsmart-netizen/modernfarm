import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SunDim, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Daily light summary for the Reports page.
 * Aggregates `light_lux` from sensor_readings for the last 24 hours.
 * Hides itself if no LDR data is available.
 */
export function DailyLightSummaryCard() {
  const { language, user } = useAuth();
  const [readings, setReadings] = useState<{ lux: number; ts: Date }[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetch24h = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('sensor_readings')
        .select('light_lux, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', since)
        .not('light_lux', 'is', null)
        .order('recorded_at', { ascending: true })
        .limit(1000);
      if (!mounted) return;
      const rows = (data ?? [])
        .map((r: any) => ({ lux: Number(r.light_lux), ts: new Date(r.recorded_at) }))
        .filter((r) => Number.isFinite(r.lux));
      setReadings(rows);
    };

    fetch24h();
    const interval = setInterval(fetch24h, 5 * 60 * 1000); // refresh every 5 min
    return () => { mounted = false; clearInterval(interval); };
  }, [user]);

  const summary = useMemo(() => {
    if (!readings || readings.length === 0) return null;
    const luxes = readings.map((r) => r.lux);
    const avg = luxes.reduce((a, b) => a + b, 0) / luxes.length;
    const min = Math.min(...luxes);
    const max = Math.max(...luxes);
    // Estimate dark/light hours: count readings under 10 lux as "dark"
    const darkCount = luxes.filter((v) => v < 10).length;
    const darkRatio = darkCount / luxes.length;
    const darkHours = +(darkRatio * 24).toFixed(1);
    const lightHours = +(24 - darkHours).toFixed(1);
    return { avg, min, max, darkHours, lightHours, count: luxes.length };
  }, [readings]);

  // Loading
  if (readings === null) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <p className="text-sm text-muted-foreground">
          {language === 'bn' ? 'আলোর ডেটা লোড হচ্ছে...' : 'Loading light data...'}
        </p>
      </div>
    );
  }

  // No LDR data — hide entirely
  if (!summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-4 shadow-card"
    >
      <div className="mb-3 flex items-center gap-2">
        <SunDim size={18} className="text-amber-500" />
        <h3 className="font-semibold">
          {language === 'bn' ? 'গত ২৪ ঘণ্টার আলো' : 'Last 24h Light'}
        </h3>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {summary.count} {language === 'bn' ? 'রিডিং' : 'readings'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label={language === 'bn' ? 'গড়' : 'Avg'} value={Math.round(summary.avg)} />
        <Stat label={language === 'bn' ? 'সর্বনিম্ন' : 'Min'} value={Math.round(summary.min)} />
        <Stat label={language === 'bn' ? 'সর্বোচ্চ' : 'Max'} value={Math.round(summary.max)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/30 dark:border-amber-900">
          <Sun size={20} className="text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'আলোকিত সময়' : 'Lit hours'}
            </p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300 leading-none">
              {summary.lightHours}h
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:bg-indigo-950/30 dark:border-indigo-900">
          <Moon size={20} className="text-indigo-600 dark:text-indigo-400" />
          <div>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'অন্ধকার সময়' : 'Dark hours'}
            </p>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 leading-none">
              {summary.darkHours}h
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        {language === 'bn'
          ? 'অনুমান: ১০ lux-এর কম মানে অন্ধকার। লেয়ার মুরগির জন্য ১৪–১৬ ঘণ্টা আলো প্রয়োজন।'
          : 'Heuristic: <10 lux counts as dark. Layers need 14–16h of light.'}
      </p>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-2.5 text-center">
      <p className="text-lg font-bold tabular-nums">
        {value}
        <span className="text-xs font-normal text-muted-foreground"> lux</span>
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
