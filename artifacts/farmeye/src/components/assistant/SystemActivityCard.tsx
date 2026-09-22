import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Fan, Flame, Bell, Droplets, Activity, Clock, ArrowUpFromDot } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { today as farmToday } from '@/api/types';

interface ActivityStat {
  icon: React.ElementType;
  label: { bn: string; en: string };
  value: string;
  color: string;
  bgColor: string;
}

/** Runtime seconds → compact "Xh" / "Xm" label. */
function runtimeLabel(seconds: number, bn: boolean): string {
  if (seconds <= 0) return bn ? '০ মিনিট' : '0m';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}${bn ? ' মিনিট' : 'm'}`;
  return `${Math.round((seconds / 3600) * 10) / 10}${bn ? ' ঘণ্টা' : 'h'}`;
}

function SystemActivityCardImpl() {
  const { language, user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const today = farmToday();

  const { data: activityData } = useQuery({
    queryKey: ['system-activity', selectedFarmId, today],
    queryFn: async () => {
      // Real per-device on-time for the farm day, derived from the board's own
      // forensic timeline (device_health.*_total_runtime_seconds is never written).
      const [runtimeRes, alertsRes] = await Promise.all([
        supabase.rpc('get_today_device_runtime', {
          p_farm_id: selectedFarmId!,
          p_shed_id: null,
        }),
        supabase
          .from('alerts')
          .select('id')
          .eq('farm_id', selectedFarmId!)
          .gte('created_at', `${today}T00:00:00+06:00`)
          .lte('created_at', `${today}T23:59:59+06:00`),
      ]);

      const r = Array.isArray(runtimeRes.data) ? runtimeRes.data[0] : runtimeRes.data;

      return {
        fanSeconds: r?.fan_seconds ?? 0,
        ceilingSeconds: r?.ceiling_fan_seconds ?? 0,
        heaterSeconds: r?.heater_seconds ?? 0,
        foggerSeconds: r?.fogger_seconds ?? 0,
        sprinklerSeconds: r?.sprinkler_seconds ?? 0,
        hasSamples: (r?.sample_count ?? 0) > 0,
        alertsCount: alertsRes.data?.length || 0,
      };
    },
    enabled: !!user && !!selectedFarmId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 120000,
  });

  const stats = useMemo((): ActivityStat[] => {
    const bn = language === 'bn';
    const data = activityData;
    const show = (seconds: number) => (data?.hasSamples ? runtimeLabel(seconds, bn) : '--');

    return [
      {
        icon: Fan,
        label: { bn: 'এক্সজস্ট ফ্যান', en: 'Exhaust Fan' },
        value: show(data?.fanSeconds ?? 0),
        color: 'text-cyan-600 dark:text-cyan-400',
        bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
      },
      {
        icon: Fan,
        label: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' },
        value: show(data?.ceilingSeconds ?? 0),
        color: 'text-violet-600 dark:text-violet-400',
        bgColor: 'bg-violet-50 dark:bg-violet-950/50',
      },
      {
        icon: Flame,
        label: { bn: 'হিটার', en: 'Heater' },
        value: show(data?.heaterSeconds ?? 0),
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/50',
      },
      {
        icon: ArrowUpFromDot,
        label: { bn: 'স্প্রিংকলার', en: 'Sprinkler' },
        value: show(data?.sprinklerSeconds ?? 0),
        color: 'text-sky-600 dark:text-sky-400',
        bgColor: 'bg-sky-50 dark:bg-sky-950/50',
      },
      {
        icon: Droplets,
        label: { bn: 'ফগার', en: 'Fogger' },
        value: show(data?.foggerSeconds ?? 0),
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      },
      {
        icon: Bell,
        label: { bn: 'এলার্ট', en: 'Alerts' },
        value: `${data?.alertsCount ?? 0}${bn ? ' টি' : ''}`,
        color: (data?.alertsCount ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
        bgColor: (data?.alertsCount ?? 0) > 0 ? 'bg-red-50 dark:bg-red-950/50' : 'bg-emerald-50 dark:bg-emerald-950/50',
      },
    ];
  }, [activityData, language]);

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          {language === 'bn' ? 'আজকের কার্যক্রম' : "Today's Activity"}
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground font-normal">
            <Clock className="h-3 w-3" />
            {language === 'bn' ? 'ডিভাইস লগ' : 'Device Log'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label.en}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl p-2.5 text-center ${stat.bgColor}`}
              >
                <Icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-[9px] text-muted-foreground line-clamp-1">
                  {stat.label[language]}
                </p>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


export const SystemActivityCard = memo(SystemActivityCardImpl);
