import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Fan, Flame, Bell, Droplets, Activity, Clock, ArrowUpFromDot } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityStat {
  icon: React.ElementType;
  label: { bn: string; en: string };
  value: string;
  color: string;
  bgColor: string;
}

function SystemActivityCardImpl() {
  const { language, user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const { data: activityData } = useQuery({
    queryKey: ['system-activity', user?.id, today],
    queryFn: async () => {
      // Fetch real data from device_health and alerts in parallel
      const [healthRes, alertsRes] = await Promise.all([
        supabase
          .from('device_health')
          .select('motor_total_runtime_seconds, heater_total_runtime_seconds, ceiling_fan_total_runtime_seconds, sprinkler_total_runtime_seconds, fogger_last_cycle_at, sprinkler_last_cycle_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('alerts')
          .select('id')
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`),
      ]);

      const health = healthRes.data;

      const fanSeconds = health?.motor_total_runtime_seconds ?? 0;
      const heaterSeconds = health?.heater_total_runtime_seconds ?? 0;
      const ceilingSeconds = health?.ceiling_fan_total_runtime_seconds ?? 0;
      const sprinklerSeconds = health?.sprinkler_total_runtime_seconds ?? 0;

      return {
        fanRuntimeHours: Math.round((fanSeconds / 3600) * 10) / 10,
        heatingHours: Math.round((heaterSeconds / 3600) * 10) / 10,
        ceilingHours: Math.round((ceilingSeconds / 3600) * 10) / 10,
        sprinklerMinutes: Math.round(sprinklerSeconds / 60),
        alertsCount: alertsRes.data?.length || 0,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5min — runtime stats don't move that fast
    gcTime: 1000 * 60 * 30,
    refetchInterval: 300000,
    refetchOnMount: false,
  });

  const stats = useMemo((): ActivityStat[] => {
    const data = activityData || { fanRuntimeHours: 0, heatingHours: 0, ceilingHours: 0, sprinklerMinutes: 0, alertsCount: 0 };

    return [
      {
        icon: Fan,
        label: { bn: 'এক্সজস্ট ফ্যান', en: 'Exhaust Fan' },
        value: `${data.fanRuntimeHours}${language === 'bn' ? ' ঘণ্টা' : 'h'}`,
        color: 'text-cyan-600 dark:text-cyan-400',
        bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
      },
      {
        icon: Fan,
        label: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' },
        value: `${data.ceilingHours}${language === 'bn' ? ' ঘণ্টা' : 'h'}`,
        color: 'text-violet-600 dark:text-violet-400',
        bgColor: 'bg-violet-50 dark:bg-violet-950/50',
      },
      {
        icon: Flame,
        label: { bn: 'হিটার', en: 'Heater' },
        value: `${data.heatingHours}${language === 'bn' ? ' ঘণ্টা' : 'h'}`,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/50',
      },
      {
        icon: ArrowUpFromDot,
        label: { bn: 'স্প্রিংকলার', en: 'Sprinkler' },
        value: `${data.sprinklerMinutes}${language === 'bn' ? ' মিনিট' : 'm'}`,
        color: 'text-sky-600 dark:text-sky-400',
        bgColor: 'bg-sky-50 dark:bg-sky-950/50',
      },
      {
        icon: Droplets,
        label: { bn: 'ফগার', en: 'Fogger' },
        value: '--',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      },
      {
        icon: Bell,
        label: { bn: 'এলার্ট', en: 'Alerts' },
        value: `${data.alertsCount}${language === 'bn' ? ' টি' : ''}`,
        color: data.alertsCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
        bgColor: data.alertsCount > 0 ? 'bg-red-50 dark:bg-red-950/50' : 'bg-emerald-50 dark:bg-emerald-950/50',
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
