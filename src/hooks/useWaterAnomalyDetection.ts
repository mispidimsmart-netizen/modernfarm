import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSelectedShed } from '@/hooks/useSheds';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface WaterAnomalyResult {
  todayUsage: number;
  last3DaysAvg: number;
  percentChange: number;
  isAnomaly: boolean;
  message: {
    bn: string;
    en: string;
  };
}

const ANOMALY_THRESHOLD_PERCENT = 15; // Alert if usage drops by 15%

/**
 * Calculate average water usage for a date range
 */
async function getWaterUsageForPeriod(
  userId: string,
  shedId: string | null,
  startDate: Date,
  endDate: Date
): Promise<number[]> {
  let query = supabase
    .from('sensor_readings')
    .select('water_usage, recorded_at')
    .eq('user_id', userId)
    .gte('recorded_at', startDate.toISOString())
    .lte('recorded_at', endDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (shedId) {
    query = query.eq('shed_id', shedId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching water usage:', error);
    return [];
  }

  return data.map(d => Number(d.water_usage));
}

/**
 * Get daily water totals for the last N days
 */
async function getDailyWaterTotals(
  userId: string,
  shedId: string | null,
  days: number
): Promise<{ date: string; total: number }[]> {
  const results: { date: string; total: number }[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = subDays(today, i);
    const start = startOfDay(date);
    const end = endOfDay(date);
    
    const readings = await getWaterUsageForPeriod(userId, shedId, start, end);
    const total = readings.length > 0 
      ? readings.reduce((sum, val) => sum + val, 0) / readings.length * 24 // Approximate daily total
      : 0;

    results.push({
      date: format(date, 'yyyy-MM-dd'),
      total,
    });
  }

  return results;
}

export function useWaterAnomalyDetection(currentWaterUsage: number | null) {
  const { user, language } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const { toast } = useToast();
  const lastAlertTime = useRef<number>(0);
  const [anomalyResult, setAnomalyResult] = useState<WaterAnomalyResult | null>(null);

  // Fetch last 3 days water usage averages
  const { data: waterHistory } = useQuery({
    queryKey: ['water-history', user?.id, selectedShedId],
    queryFn: async () => {
      if (!user) return null;
      return getDailyWaterTotals(user.id, selectedShedId, 4); // Today + 3 previous days
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  useEffect(() => {
    if (!user || currentWaterUsage === null || !waterHistory || waterHistory.length < 4) {
      return;
    }

    // Calculate today's usage and last 3 days average
    const todayData = waterHistory[0];
    const last3Days = waterHistory.slice(1, 4);
    
    const todayUsage = currentWaterUsage; // Use realtime value
    const last3DaysTotal = last3Days.reduce((sum, d) => sum + d.total, 0);
    const last3DaysAvg = last3Days.length > 0 ? last3DaysTotal / last3Days.length : 0;

    if (last3DaysAvg === 0) {
      setAnomalyResult(null);
      return;
    }

    // Calculate percent change
    const percentChange = ((todayUsage - last3DaysAvg) / last3DaysAvg) * 100;
    const isAnomaly = percentChange < -ANOMALY_THRESHOLD_PERCENT;

    const result: WaterAnomalyResult = {
      todayUsage,
      last3DaysAvg,
      percentChange,
      isAnomaly,
      message: isAnomaly
        ? {
            bn: `⚠️ পানি ব্যবহার ${Math.abs(percentChange).toFixed(0)}% কমেছে! মুরগির স্বাস্থ্য পরীক্ষা করুন`,
            en: `⚠️ Water usage dropped by ${Math.abs(percentChange).toFixed(0)}%! Check chicken health`
          }
        : {
            bn: 'পানি ব্যবহার স্বাভাবিক',
            en: 'Water usage is normal'
          },
    };

    setAnomalyResult(result);

    // Create alert if anomaly detected (throttle to once per hour)
    const now = Date.now();
    if (isAnomaly && now - lastAlertTime.current > 60 * 60 * 1000) {
      createHealthAlert(result);
      lastAlertTime.current = now;
    }
  }, [user, currentWaterUsage, waterHistory, selectedShedId]);

  const createHealthAlert = async (result: WaterAnomalyResult) => {
    if (!user) return;

    try {
      const alertData = {
        user_id: user.id,
        alert_type: 'water' as const,
        severity: 'warning' as const,
        message: `Water usage anomaly: ${result.percentChange.toFixed(0)}% change from 3-day average. Current: ${result.todayUsage.toFixed(1)} L/h, Avg: ${result.last3DaysAvg.toFixed(1)} L/h`,
        message_bn: `পানি ব্যবহার অস্বাভাবিক: ৩ দিনের গড় থেকে ${Math.abs(result.percentChange).toFixed(0)}% কম। বর্তমান: ${result.todayUsage.toFixed(1)} লি/ঘ, গড়: ${result.last3DaysAvg.toFixed(1)} লি/ঘ`,
        shed_id: selectedShedId || null,
      };

      const { error } = await supabase.from('alerts').insert(alertData);

      if (!error) {
        toast({
          title: language === 'bn' ? '🚨 স্বাস্থ্য সতর্কতা!' : '🚨 Health Alert!',
          description: result.message[language],
          variant: 'destructive',
        });
      }

      console.log(`[Water Anomaly] Alert created - Drop: ${result.percentChange.toFixed(1)}%`);
    } catch (error) {
      console.error('[Water Anomaly] Failed to create alert:', error);
    }
  };

  return anomalyResult;
}
