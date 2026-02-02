import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSelectedShed } from '@/hooks/useSheds';
import { useQuery } from '@tanstack/react-query';
import { subHours } from 'date-fns';

export interface AmmoniaTrendResult {
  currentLevel: number;
  hourlyReadings: { hour: number; avg: number }[];
  isRising: boolean;
  risingHours: number;
  percentIncrease: number;
  shouldIncreaseVentilation: boolean;
  message: {
    bn: string;
    en: string;
  };
}

const RISING_HOURS_THRESHOLD = 3; // Alert after 3 hours of continuous rise
const MIN_READINGS_PER_HOUR = 2; // Minimum readings needed per hour for valid trend

/**
 * Fetch ammonia readings for the last N hours
 */
async function getAmmoniaReadings(
  userId: string,
  shedId: string | null,
  hours: number
): Promise<{ ammonia: number; timestamp: Date }[]> {
  const startTime = subHours(new Date(), hours);
  
  let query = supabase
    .from('sensor_readings')
    .select('ammonia, recorded_at')
    .eq('user_id', userId)
    .gte('recorded_at', startTime.toISOString())
    .order('recorded_at', { ascending: true });

  if (shedId) {
    query = query.eq('shed_id', shedId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching ammonia readings:', error);
    return [];
  }

  return data.map(d => ({
    ammonia: Number(d.ammonia),
    timestamp: new Date(d.recorded_at),
  }));
}

/**
 * Calculate hourly averages from readings
 */
function calculateHourlyAverages(
  readings: { ammonia: number; timestamp: Date }[]
): { hour: number; avg: number; count: number }[] {
  const hourlyData: Map<number, number[]> = new Map();
  const now = new Date();

  readings.forEach(reading => {
    const hoursAgo = Math.floor((now.getTime() - reading.timestamp.getTime()) / (1000 * 60 * 60));
    if (!hourlyData.has(hoursAgo)) {
      hourlyData.set(hoursAgo, []);
    }
    hourlyData.get(hoursAgo)!.push(reading.ammonia);
  });

  const result: { hour: number; avg: number; count: number }[] = [];
  hourlyData.forEach((values, hour) => {
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    result.push({ hour, avg, count: values.length });
  });

  return result.sort((a, b) => b.hour - a.hour); // Most recent first (hour 0)
}

/**
 * Detect if ammonia is continuously rising
 */
function detectRisingTrend(
  hourlyAverages: { hour: number; avg: number; count: number }[]
): { isRising: boolean; risingHours: number; percentIncrease: number } {
  if (hourlyAverages.length < 2) {
    return { isRising: false, risingHours: 0, percentIncrease: 0 };
  }

  // Filter hours with enough readings
  const validHours = hourlyAverages.filter(h => h.count >= MIN_READINGS_PER_HOUR);
  
  if (validHours.length < 2) {
    return { isRising: false, risingHours: 0, percentIncrease: 0 };
  }

  // Check for continuous rise (hour 0 is most recent)
  let risingHours = 0;
  let firstValue = validHours[validHours.length - 1]?.avg || 0;
  let lastValue = validHours[0]?.avg || 0;

  for (let i = 0; i < validHours.length - 1; i++) {
    const current = validHours[i];
    const previous = validHours[i + 1];
    
    if (current.avg > previous.avg) {
      risingHours++;
    } else {
      break; // Stop counting when trend breaks
    }
  }

  const percentIncrease = firstValue > 0 
    ? ((lastValue - firstValue) / firstValue) * 100 
    : 0;

  return {
    isRising: risingHours >= RISING_HOURS_THRESHOLD,
    risingHours,
    percentIncrease,
  };
}

export function useAmmoniaTrendDetection(currentAmmonia: number | null) {
  const { user, language } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const { toast } = useToast();
  const lastAlertTime = useRef<number>(0);
  const lastVentilationAction = useRef<boolean>(false);
  const [trendResult, setTrendResult] = useState<AmmoniaTrendResult | null>(null);

  // Fetch last 4 hours of ammonia readings
  const { data: ammoniaHistory } = useQuery({
    queryKey: ['ammonia-history', user?.id, selectedShedId],
    queryFn: async () => {
      if (!user) return null;
      return getAmmoniaReadings(user.id, selectedShedId, 4);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  useEffect(() => {
    if (!user || currentAmmonia === null || !ammoniaHistory) {
      return;
    }

    // Calculate hourly averages
    const hourlyAverages = calculateHourlyAverages(ammoniaHistory);
    
    // Detect rising trend
    const trend = detectRisingTrend(hourlyAverages);

    const result: AmmoniaTrendResult = {
      currentLevel: currentAmmonia,
      hourlyReadings: hourlyAverages.map(h => ({ hour: h.hour, avg: h.avg })),
      isRising: trend.isRising,
      risingHours: trend.risingHours,
      percentIncrease: trend.percentIncrease,
      shouldIncreaseVentilation: trend.isRising,
      message: trend.isRising
        ? {
            bn: `⚠️ অ্যামোনিয়া ${trend.risingHours} ঘণ্টা ধরে বাড়ছে! বায়ু চলাচল বাড়ান`,
            en: `⚠️ Ammonia rising for ${trend.risingHours} hours! Increase ventilation`
          }
        : {
            bn: 'অ্যামোনিয়া স্তর স্থিতিশীল',
            en: 'Ammonia level stable'
          },
    };

    setTrendResult(result);

    // Take action if rising trend detected
    if (trend.isRising && !lastVentilationAction.current) {
      increaseVentilation(result);
      createAmmoniaAlert(result);
      lastVentilationAction.current = true;
    } else if (!trend.isRising) {
      lastVentilationAction.current = false;
    }
  }, [user, currentAmmonia, ammoniaHistory, selectedShedId]);

  const increaseVentilation = async (result: AmmoniaTrendResult) => {
    if (!user) return;

    try {
      // Turn on fan and set to HIGH speed
      const { error } = await supabase
        .from('device_status')
        .update({
          fan_on: true,
          fan_speed: 'HIGH',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (!error) {
        toast({
          title: language === 'bn' ? '🌀 ভেন্টিলেশন বাড়ানো হয়েছে' : '🌀 Ventilation Increased',
          description: result.message[language],
        });

        // Send push notification
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: user.id,
            title: language === 'bn' ? '🌀 ভেন্টিলেশন বাড়ানো হয়েছে' : '🌀 Ventilation Increased',
            body: result.message[language],
            severity: 'warning',
            url: '/control',
          },
        });
      }

      console.log(`[Ammonia Trend] Ventilation increased - Rising for ${result.risingHours} hours`);
    } catch (error) {
      console.error('[Ammonia Trend] Failed to increase ventilation:', error);
    }
  };

  const createAmmoniaAlert = async (result: AmmoniaTrendResult) => {
    if (!user) return;

    // Throttle alerts to once per hour
    const now = Date.now();
    if (now - lastAlertTime.current < 60 * 60 * 1000) {
      return;
    }
    lastAlertTime.current = now;

    try {
      const alertData = {
        user_id: user.id,
        alert_type: 'ammonia' as const,
        severity: 'warning' as const,
        message: `Ammonia rising trend: Level increased by ${result.percentIncrease.toFixed(0)}% over ${result.risingHours} hours. Current: ${result.currentLevel.toFixed(1)} ppm. Ventilation automatically increased.`,
        message_bn: `অ্যামোনিয়া বৃদ্ধি: ${result.risingHours} ঘণ্টায় ${Math.abs(result.percentIncrease).toFixed(0)}% বেড়েছে। বর্তমান: ${result.currentLevel.toFixed(1)} ppm। স্বয়ংক্রিয়ভাবে বায়ু চলাচল বাড়ানো হয়েছে।`,
        shed_id: selectedShedId || null,
      };

      await supabase.from('alerts').insert(alertData);

      console.log(`[Ammonia Trend] Alert created - Rising for ${result.risingHours} hours`);
    } catch (error) {
      console.error('[Ammonia Trend] Failed to create alert:', error);
    }
  };

  return trendResult;
}
