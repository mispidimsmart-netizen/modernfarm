import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SunDim } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Compact dashboard card showing current ambient light from the LDR sensor.
 * Mirrors the styling of CoreMetricsRow tiles. Hides itself if no LDR data
 * has ever been received (sensor not installed).
 */
export function LightSensorCard() {
  const { language, user } = useAuth();
  const [lux, setLux] = useState<number | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchLatest = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('light_lux')
        .eq('user_id', user.id)
        .not('light_lux', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      const v = (data as any)?.light_lux;
      if (v === null || v === undefined) {
        setHasData(false);
      } else {
        setLux(Number(v));
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
          if (v !== null && v !== undefined) {
            setLux(Number(v));
            setHasData(true);
          }
        })
      .subscribe();
    const interval = setInterval(fetchLatest, 60000);
    return () => { mounted = false; supabase.removeChannel(channel); clearInterval(interval); };
  }, [user]);

  // Hide card entirely if LDR has never reported (no install)
  if (hasData === false) return null;

  // Color tiers (uses semantic-friendly tailwind colors used elsewhere in dashboard)
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
