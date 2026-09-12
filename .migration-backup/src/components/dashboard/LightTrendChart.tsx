import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { SunDim } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * 24-hour line chart of LDR lux readings.
 * Hides if no LDR data available.
 */
export function LightTrendChart() {
  const { language, user } = useAuth();
  const [rows, setRows] = useState<{ time: string; lux: number; ts: number }[] | null>(null);

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
      const mapped = (data ?? [])
        .map((r: any) => {
          const d = new Date(r.recorded_at);
          return {
            ts: d.getTime(),
            time: d.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            lux: Number(r.light_lux),
          };
        })
        .filter((r) => Number.isFinite(r.lux));
      setRows(mapped);
    };

    fetch24h();
    const interval = setInterval(fetch24h, 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, [user, language]);

  const maxLux = useMemo(() => (rows && rows.length ? Math.max(...rows.map((r) => r.lux)) : 0), [rows]);

  if (rows === null) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <p className="text-sm text-muted-foreground">
          {language === 'bn' ? 'আলোর গ্রাফ লোড হচ্ছে...' : 'Loading light chart...'}
        </p>
      </div>
    );
  }

  if (rows.length < 2) return null; // Need at least 2 points to draw a line

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-4 shadow-card"
    >
      <div className="mb-3 flex items-center gap-2">
        <SunDim size={18} className="text-amber-500" />
        <h3 className="font-medium">
          {language === 'bn' ? 'গত ২৪ ঘণ্টার আলো (lux)' : 'Last 24h Light (lux)'}
        </h3>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {language === 'bn' ? 'সর্বোচ্চ' : 'Peak'}: {Math.round(maxLux)} lux
        </span>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              domain={[0, 'dataMax + 50']}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(v: any) => [`${Math.round(Number(v))} lux`, language === 'bn' ? 'আলো' : 'Light']}
            />
            <ReferenceLine
              y={10}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{
                value: language === 'bn' ? 'অন্ধকার' : 'Dark',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
                position: 'insideTopRight',
              }}
            />
            <Line
              type="monotone"
              dataKey="lux"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {language === 'bn'
          ? '১০ lux-এর নিচে হলে অন্ধকার ধরা হয়।'
          : 'Below 10 lux is treated as dark.'}
      </p>
    </motion.div>
  );
}
