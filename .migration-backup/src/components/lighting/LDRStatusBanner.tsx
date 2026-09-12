import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Sun, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

/**
 * Large, farmer-friendly LDR hardware status banner.
 * Shows: Detected/Not detected + live lux value with a friendly label.
 * Designed to be prominent at the top of Installation Guide & Lighting pages.
 */
export function LDRStatusBanner() {
  const { language, user } = useAuth();
  const [lux, setLux] = useState<number | null>(null);
  const [detected, setDetected] = useState<boolean | null>(null);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchLatest = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('light_lux, recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      const value = (data as any)?.light_lux;
      const ts = (data as any)?.recorded_at;
      if (value === null || value === undefined) {
        setLux(null);
        setDetected(false);
      } else {
        setLux(Number(value));
        setDetected(true);
        if (ts) setLastSeen(new Date(ts));
      }
    };

    fetchLatest();
    const channel = supabase
      .channel('ldr-status-banner')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const value = (payload.new as any)?.light_lux;
          const ts = (payload.new as any)?.recorded_at;
          if (value !== null && value !== undefined) {
            setLux(Number(value));
            setDetected(true);
            if (ts) setLastSeen(new Date(ts));
          }
        })
      .subscribe();
    const interval = setInterval(fetchLatest, 30000);

    return () => { mounted = false; supabase.removeChannel(channel); clearInterval(interval); };
  }, [user]);

  // Friendly lux label (Bengali-first)
  const luxLabel = (() => {
    if (lux === null) return language === 'bn' ? '—' : '—';
    if (lux < 10)   return language === 'bn' ? 'অন্ধকার 🌑' : 'Dark 🌑';
    if (lux < 50)   return language === 'bn' ? 'গোধূলি 🌆' : 'Dim 🌆';
    if (lux < 200)  return language === 'bn' ? 'ভেতরে আলো 💡' : 'Indoor 💡';
    if (lux < 1000) return language === 'bn' ? 'দিনের আলো 🌤️' : 'Daylight 🌤️';
    return language === 'bn' ? 'উজ্জ্বল রোদ ☀️' : 'Bright sun ☀️';
  })();

  // Loading
  if (detected === null) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-card flex items-center gap-3">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
        <p className="text-sm text-muted-foreground">
          {language === 'bn' ? 'LDR হার্ডওয়্যার যাচাই হচ্ছে...' : 'Checking LDR hardware...'}
        </p>
      </div>
    );
  }

  // NOT DETECTED — bold red banner
  if (!detected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-5 shadow-card dark:from-red-950/40 dark:to-orange-950/30 dark:border-red-900"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            <XCircle size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-300">
                {language === 'bn' ? 'LDR সংযুক্ত নয়' : 'LDR Not Connected'}
              </h3>
              <Badge variant="outline" className="bg-white/60 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
                GPIO 36
              </Badge>
            </div>
            <p className="text-sm text-red-700/80 dark:text-red-300/80 leading-relaxed">
              {language === 'bn'
                ? 'এখনো কোন আলো সেন্সর ডেটা পাওয়া যায়নি। নিচের ইনস্টলেশন গাইড অনুসরণ করে LDR সংযোগ দিন এবং ESP32 রিস্টার্ট করুন।'
                : 'No light sensor data received yet. Follow the installation guide below to connect the LDR and restart the ESP32.'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // DETECTED — large green banner with prominent lux readout
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-amber-50 to-orange-50 p-5 shadow-card dark:from-emerald-950/40 dark:via-amber-950/20 dark:to-orange-950/30 dark:border-emerald-900"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Status pill */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {language === 'bn' ? 'LDR সংযুক্ত' : 'LDR Connected'}
              </h3>
              <Badge variant="outline" className="bg-white/60 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                GPIO 36
              </Badge>
            </div>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 mt-0.5">
              {language === 'bn' ? 'হার্ডওয়্যার ঠিক আছে ✓' : 'Hardware OK ✓'}
            </p>
          </div>
        </div>

        {/* Big lux readout */}
        <div className="flex-1 flex items-center justify-between sm:justify-end gap-4 rounded-xl bg-white/60 dark:bg-black/20 px-4 py-3 sm:bg-transparent sm:dark:bg-transparent sm:px-0 sm:py-0">
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {language === 'bn' ? 'বর্তমান আলো' : 'Current Light'}
            </p>
            <div className="flex items-baseline gap-1.5 justify-end">
              <span className="text-4xl sm:text-5xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {lux !== null ? Math.round(lux) : '—'}
              </span>
              <span className="text-base text-muted-foreground">lux</span>
            </div>
            <p className="text-sm font-medium text-foreground/80 mt-0.5">{luxLabel}</p>
          </div>
          <Sun size={56} className="text-amber-400 opacity-70 hidden sm:block" />
        </div>
      </div>

      {lastSeen && (
        <p className="mt-3 text-[11px] text-muted-foreground text-right">
          {language === 'bn' ? 'সর্বশেষ আপডেট: ' : 'Last update: '}
          {lastSeen.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US')}
        </p>
      )}
    </motion.div>
  );
}
