import { motion } from 'framer-motion';
import { Droplets, Fan, Calendar, Bird, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveBatch, useBatchStats } from '@/hooks/useBroilerData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface SummaryCard {
  id: string;
  title: { bn: string; en: string };
  value: string;
  subtitle: { bn: string; en: string };
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: string;
  bgGradient: string;
}

export function SmartSummaryCards() {
  const { language, user } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  const batchStats = useBatchStats(activeBatch?.id);

  // Fetch water usage comparison (today vs yesterday)
  const { data: waterComparison } = useQuery({
    queryKey: ['water-comparison', user?.id],
    queryFn: async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const [todayData, yesterdayData] = await Promise.all([
        supabase
          .from('daily_summary')
          .select('total_water_usage')
          .eq('summary_date', todayStr)
          .maybeSingle(),
        supabase
          .from('daily_summary')
          .select('total_water_usage')
          .eq('summary_date', yesterdayStr)
          .maybeSingle(),
      ]);

      const todayUsage = todayData.data?.total_water_usage || sensorData.waterUsage * 8; // Estimate if no data
      const yesterdayUsage = yesterdayData.data?.total_water_usage || todayUsage;

      const percentChange = yesterdayUsage > 0 
        ? ((todayUsage - yesterdayUsage) / yesterdayUsage) * 100 
        : 0;

      return { todayUsage, yesterdayUsage, percentChange };
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Determine current farm mode
  const farmMode = useMemo(() => {
    if (isBroiler && batchStats) {
      const age = batchStats.ageDays;
      if (age <= 10) return { bn: 'ব্রুডিং', en: 'Brooding' };
      if (age <= 25) return { bn: 'গ্রোয়িং', en: 'Growing' };
      return { bn: 'ফিনিশিং', en: 'Finishing' };
    }
    if (isLayer) {
      const temp = sensorData.temperature;
      if (temp > 32) return { bn: 'গরম মৌসুম', en: 'Summer Mode' };
      if (temp < 20) return { bn: 'শীত মৌসুম', en: 'Winter Mode' };
      return { bn: 'লেয়ার', en: 'Layer Production' };
    }
    return { bn: 'স্বয়ংক্রিয়', en: 'Auto Mode' };
  }, [isLayer, isBroiler, batchStats, sensorData.temperature]);

  // Calculate fan runtime (estimated based on current status)
  const fanRuntime = useMemo(() => {
    // This is a simplified estimate - in real app, track actual runtime
    if (deviceStatus.fan) {
      return { hours: '~6', trend: 'up' as const };
    }
    return { hours: '~2', trend: 'neutral' as const };
  }, [deviceStatus.fan]);

  const cards = useMemo((): SummaryCard[] => {
    const result: SummaryCard[] = [];

    // 1. Water Comparison Card
    const waterChange = waterComparison?.percentChange || 0;
    result.push({
      id: 'water',
      title: { bn: 'আজকের পানি', en: "Today's Water" },
      value: `${(waterComparison?.todayUsage || 0).toFixed(0)}L`,
      subtitle: { 
        bn: waterChange >= 0 ? `গতকালের চেয়ে ${Math.abs(waterChange).toFixed(0)}% বেশি` : `গতকালের চেয়ে ${Math.abs(waterChange).toFixed(0)}% কম`,
        en: waterChange >= 0 ? `${Math.abs(waterChange).toFixed(0)}% more than yesterday` : `${Math.abs(waterChange).toFixed(0)}% less than yesterday`,
      },
      icon: Droplets,
      trend: waterChange > 5 ? 'up' : waterChange < -5 ? 'down' : 'neutral',
      trendValue: `${Math.abs(waterChange).toFixed(0)}%`,
      color: 'text-sky-600 dark:text-sky-400',
      bgGradient: 'from-sky-50 to-blue-50 dark:from-sky-950/50 dark:to-blue-950/50',
    });

    // 2. Ventilation Activity
    result.push({
      id: 'ventilation',
      title: { bn: 'ফ্যান চলেছে', en: 'Fan Runtime' },
      value: fanRuntime.hours,
      subtitle: { bn: 'ঘন্টা আজ', en: 'hours today' },
      icon: Fan,
      trend: fanRuntime.trend,
      color: 'text-teal-600 dark:text-teal-400',
      bgGradient: 'from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/50',
    });

    // 3. Farm Mode
    result.push({
      id: 'mode',
      title: { bn: 'ফার্ম মোড', en: 'Farm Mode' },
      value: farmMode[language],
      subtitle: { bn: 'স্বয়ংক্রিয়ভাবে নির্বাচিত', en: 'Auto-selected' },
      icon: Calendar,
      color: 'text-violet-600 dark:text-violet-400',
      bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50',
    });

    // 4. Bird Age (for broiler) or Environment Summary (for layer)
    if (isBroiler && batchStats) {
      result.push({
        id: 'age',
        title: { bn: 'মুরগির বয়স', en: 'Bird Age' },
        value: `${batchStats.ageDays}`,
        subtitle: { bn: `দিন (সপ্তাহ ${batchStats.ageWeeks})`, en: `days (week ${batchStats.ageWeeks})` },
        icon: Bird,
        color: 'text-amber-600 dark:text-amber-400',
        bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50',
      });
    } else {
      // Environment Summary for Layer
      const envScore = sensorData.temperature >= 22 && sensorData.temperature <= 28 
        && sensorData.humidity >= 50 && sensorData.humidity <= 70
        && sensorData.ammonia < 15 ? 'good' : 'moderate';
      result.push({
        id: 'environment',
        title: { bn: 'পরিবেশ', en: 'Environment' },
        value: envScore === 'good' ? (language === 'bn' ? 'ভালো' : 'Good') : (language === 'bn' ? 'মাঝারি' : 'Fair'),
        subtitle: { bn: 'সামগ্রিক অবস্থা', en: 'Overall condition' },
        icon: Clock,
        color: envScore === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
        bgGradient: envScore === 'good' 
          ? 'from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50'
          : 'from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50',
      });
    }

    return result;
  }, [waterComparison, fanRuntime, farmMode, batchStats, sensorData, isLayer, isBroiler, language]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trend === 'up' ? TrendingUp : card.trend === 'down' ? TrendingDown : Minus;
        
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-2xl p-4 bg-gradient-to-br ${card.bgGradient} border border-border/50 shadow-sm`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              {card.trend && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${
                  card.trend === 'up' ? 'text-emerald-600' : 
                  card.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  <TrendIcon className="h-3 w-3" />
                  {card.trendValue}
                </span>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-0.5">
              {card.title[language]}
            </p>
            <p className={`text-xl font-bold ${card.color}`}>
              {card.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {card.subtitle[language]}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
