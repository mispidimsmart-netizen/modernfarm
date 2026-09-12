import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSelectedShed } from '@/hooks/useSheds';
import { useQuery } from '@tanstack/react-query';
import { subHours } from 'date-fns';
import { BROILER_THRESHOLDS } from '@/hooks/useFarmType';

export interface BroilerWaterResult {
  currentUsage: number;
  avgLast6Hours: number;
  percentChange: number;
  isAnomaly: boolean;
  threshold: number;
  windowHours: number;
  message: {
    bn: string;
    en: string;
  };
}

/**
 * Get water usage readings for the last N hours
 */
async function getWaterUsageForHours(
  userId: string,
  shedId: string | null,
  hours: number
): Promise<number[]> {
  const since = subHours(new Date(), hours);

  let query = supabase
    .from('sensor_readings')
    .select('water_usage, recorded_at')
    .eq('user_id', userId)
    .gte('recorded_at', since.toISOString())
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
 * Monitor water intake for broilers with 6-hour window and 20% threshold
 */
export function useBroilerWaterMonitor(currentWaterUsage: number | null) {
  const { user, language } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const { toast } = useToast();
  const lastAlertTime = useRef<number>(0);
  const [waterResult, setWaterResult] = useState<BroilerWaterResult | null>(null);

  const threshold = BROILER_THRESHOLDS.WATER_DROP_THRESHOLD;
  const windowHours = BROILER_THRESHOLDS.WATER_WINDOW_HOURS;

  // Fetch water usage for the last 6 hours
  const { data: waterHistory } = useQuery({
    queryKey: ['broiler-water-history', user?.id, selectedShedId],
    queryFn: async () => {
      if (!user) return null;
      return getWaterUsageForHours(user.id, selectedShedId, windowHours);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  useEffect(() => {
    if (!user || currentWaterUsage === null || !waterHistory || waterHistory.length < 2) {
      return;
    }

    // Calculate average of last 6 hours
    const avgLast6Hours = waterHistory.reduce((sum, val) => sum + val, 0) / waterHistory.length;

    if (avgLast6Hours === 0) {
      setWaterResult(null);
      return;
    }

    // Calculate percent change (negative = drop)
    const percentChange = ((currentWaterUsage - avgLast6Hours) / avgLast6Hours) * 100;
    const isAnomaly = percentChange <= -threshold; // 20% or more drop

    const result: BroilerWaterResult = {
      currentUsage: currentWaterUsage,
      avgLast6Hours,
      percentChange,
      isAnomaly,
      threshold,
      windowHours,
      message: isAnomaly
        ? {
            bn: `🚨 পানি খাওয়া ${Math.abs(percentChange).toFixed(0)}% কমেছে (৬ ঘণ্টায়)! স্বাস্থ্য পরীক্ষা করুন`,
            en: `🚨 Water intake dropped ${Math.abs(percentChange).toFixed(0)}% (in 6h)! Check bird health`
          }
        : {
            bn: 'পানি খাওয়া স্বাভাবিক',
            en: 'Water intake normal'
          },
    };

    setWaterResult(result);

    // Create alert if anomaly detected (throttle to once per 30 minutes)
    const now = Date.now();
    if (isAnomaly && now - lastAlertTime.current > 30 * 60 * 1000) {
      createHealthAlert(result);
      lastAlertTime.current = now;
    }
  }, [user, currentWaterUsage, waterHistory, selectedShedId]);

  const createHealthAlert = async (result: BroilerWaterResult) => {
    if (!user) return;

    try {
      const alertData = {
        user_id: user.id,
        alert_type: 'water' as const,
        severity: 'warning' as const,
        message: `Broiler Water Alert: ${Math.abs(result.percentChange).toFixed(0)}% drop in ${windowHours}h. Current: ${result.currentUsage.toFixed(1)} L/h, Avg: ${result.avgLast6Hours.toFixed(1)} L/h`,
        message_bn: `ব্রয়লার পানি সতর্কতা: ${windowHours} ঘণ্টায় ${Math.abs(result.percentChange).toFixed(0)}% কমেছে। বর্তমান: ${result.currentUsage.toFixed(1)} লি/ঘ, গড়: ${result.avgLast6Hours.toFixed(1)} লি/ঘ`,
        shed_id: selectedShedId || null,
      };

      const { error } = await supabase.from('alerts').insert(alertData);

      if (!error) {
        toast({
          title: language === 'bn' ? '🚨 পানি সতর্কতা!' : '🚨 Water Alert!',
          description: result.message[language],
          variant: 'destructive',
        });
      }

      console.log(`[Broiler Water] Alert created - Drop: ${result.percentChange.toFixed(1)}% in ${windowHours}h`);
    } catch (error) {
      console.error('[Broiler Water] Failed to create alert:', error);
    }
  };

  return waterResult;
}
