import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { getBroilerTempRange, BROILER_TEMP_CURVE } from '@/hooks/useFarmType';

export type BroilerAlertLevel = 'normal' | 'low_temp' | 'high_temp' | 'critical';

export interface BroilerTempResult {
  currentTemp: number;
  targetMin: number;
  targetMax: number;
  ageWeeks: number;
  ageDays: number;
  level: BroilerAlertLevel;
  deviation: number; // How far from ideal range
  shouldActivateFan: boolean;
  shouldActivateHeater: boolean;
  shouldAlert: boolean;
  message: {
    bn: string;
    en: string;
  };
}

/**
 * Calculate age in days and weeks from start date
 */
export function calculateBroilerAge(startDate: string): { days: number; weeks: number } {
  const start = new Date(startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - start.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  return { days, weeks };
}

/**
 * Evaluate temperature for broilers based on age
 */
export function evaluateBroilerTemp(
  temperature: number,
  ageWeeks: number,
  ageDays: number
): BroilerTempResult {
  const { minTemp, maxTemp } = getBroilerTempRange(ageWeeks);
  const idealTemp = (minTemp + maxTemp) / 2;
  
  let level: BroilerAlertLevel = 'normal';
  let shouldActivateFan = false;
  let shouldActivateHeater = false;
  let shouldAlert = false;
  let message = { bn: 'স্বাভাবিক তাপমাত্রা', en: 'Normal temperature' };
  let deviation = 0;

  // Too cold
  if (temperature < minTemp) {
    deviation = minTemp - temperature;
    if (deviation > 3) {
      level = 'critical';
      shouldActivateHeater = true;
      shouldAlert = true;
      message = {
        bn: `⚠️ গুরুতর ঠান্ডা! ${deviation.toFixed(1)}°C কম`,
        en: `⚠️ Critical cold! ${deviation.toFixed(1)}°C below range`
      };
    } else {
      level = 'low_temp';
      shouldActivateHeater = true;
      shouldAlert = deviation > 2;
      message = {
        bn: `🥶 তাপমাত্রা কম - হিটার চালু করুন`,
        en: `🥶 Temperature low - Turn on heater`
      };
    }
  }
  // Too hot
  else if (temperature > maxTemp) {
    deviation = temperature - maxTemp;
    if (deviation > 3) {
      level = 'critical';
      shouldActivateFan = true;
      shouldAlert = true;
      message = {
        bn: `🔥 গুরুতর গরম! ${deviation.toFixed(1)}°C বেশি`,
        en: `🔥 Critical heat! ${deviation.toFixed(1)}°C above range`
      };
    } else {
      level = 'high_temp';
      shouldActivateFan = true;
      shouldAlert = deviation > 2;
      message = {
        bn: `🌡️ তাপমাত্রা বেশি - ফ্যান চালু করুন`,
        en: `🌡️ Temperature high - Turn on fan`
      };
    }
  }
  // Normal range
  else {
    level = 'normal';
    message = {
      bn: `✅ আদর্শ তাপমাত্রা (${minTemp}-${maxTemp}°C)`,
      en: `✅ Ideal temperature (${minTemp}-${maxTemp}°C)`
    };
  }

  return {
    currentTemp: temperature,
    targetMin: minTemp,
    targetMax: maxTemp,
    ageWeeks,
    ageDays,
    level,
    deviation,
    shouldActivateFan,
    shouldActivateHeater,
    shouldAlert,
    message,
  };
}

/**
 * Get color for broiler temp level
 */
export function getBroilerTempColor(level: BroilerAlertLevel): string {
  switch (level) {
    case 'normal':
      return 'text-green-600';
    case 'low_temp':
      return 'text-blue-600';
    case 'high_temp':
      return 'text-orange-500';
    case 'critical':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

export function getBroilerTempBgColor(level: BroilerAlertLevel): string {
  switch (level) {
    case 'normal':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'low_temp':
      return 'bg-blue-100 dark:bg-blue-900/30';
    case 'high_temp':
      return 'bg-orange-100 dark:bg-orange-900/30';
    case 'critical':
      return 'bg-red-100 dark:bg-red-900/30';
    default:
      return 'bg-muted';
  }
}

interface UseBroilerAutomationProps {
  temperature: number | null;
  humidity: number | null;
  shedId?: string | null;
  enabled?: boolean;
}

/**
 * Hook for broiler-specific temperature automation
 * Uses age-based temperature thresholds instead of fixed HSI
 */
export function useBroilerAutomation({
  temperature,
  humidity,
  shedId,
  enabled = true,
}: UseBroilerAutomationProps) {
  const { user, language } = useAuth();
  const { data: activeBatch } = useActiveBatch();
  const { toast } = useToast();
  const lastAlertLevel = useRef<BroilerAlertLevel | null>(null);
  const lastFanAction = useRef<boolean | null>(null);

  // Calculate batch age
  const batchAge = activeBatch 
    ? calculateBroilerAge(activeBatch.start_date) 
    : { days: 0, weeks: 0 };

  useEffect(() => {
    if (!enabled || !user || !activeBatch || temperature === null) {
      return;
    }

    const tempResult = evaluateBroilerTemp(temperature, batchAge.weeks, batchAge.days);

    // Handle fan automation
    if (tempResult.shouldActivateFan && lastFanAction.current !== true) {
      activateFan(tempResult);
      lastFanAction.current = true;
    } else if (!tempResult.shouldActivateFan && lastFanAction.current !== false) {
      // Turn off fan when temp is normal
      deactivateFan();
      lastFanAction.current = false;
    }

    // Handle alerts (only create if level changed and alert is needed)
    if (
      tempResult.shouldAlert &&
      tempResult.level !== lastAlertLevel.current
    ) {
      createAlert(tempResult);
      lastAlertLevel.current = tempResult.level;
    } else if (!tempResult.shouldAlert) {
      lastAlertLevel.current = null;
    }
  }, [temperature, enabled, user, activeBatch, batchAge.weeks]);

  const activateFan = async (tempResult: BroilerTempResult) => {
    if (!user) return;

    try {
      // Determine fan speed based on deviation
      const fanSpeed = tempResult.deviation > 3 ? 'HIGH' : 
                       tempResult.deviation > 1.5 ? 'MEDIUM' : 'LOW';

      const updateData = {
        fan_on: true,
        fan_speed: fanSpeed,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('device_status')
        .update(updateData)
        .eq('user_id', user.id);

      if (!error) {
        toast({
          title: language === 'bn' ? `🌀 ফ্যান ${fanSpeed}` : `🌀 Fan ${fanSpeed}`,
          description: tempResult.message[language],
        });
      }

      console.log(`[Broiler Automation] Fan ${fanSpeed} - Age: ${batchAge.weeks}w, Temp: ${temperature}°C`);
    } catch (error) {
      console.error('[Broiler Automation] Failed to activate fan:', error);
    }
  };

  const deactivateFan = async () => {
    if (!user) return;

    try {
      await supabase
        .from('device_status')
        .update({
          fan_on: false,
          fan_speed: 'OFF',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      console.log('[Broiler Automation] Fan OFF - Temperature normal');
    } catch (error) {
      console.error('[Broiler Automation] Failed to deactivate fan:', error);
    }
  };

  const createAlert = async (tempResult: BroilerTempResult) => {
    if (!user) return;

    try {
      const severity: 'danger' | 'warning' = tempResult.level === 'critical' ? 'danger' : 'warning';
      
      const alertData = {
        user_id: user.id,
        alert_type: 'temperature' as const,
        severity: severity,
        message: `Broiler (${batchAge.weeks}w): ${tempResult.message.en}`,
        message_bn: `ব্রয়লার (${batchAge.weeks} সপ্তাহ): ${tempResult.message.bn}`,
        shed_id: shedId || null,
      };

      const { error } = await supabase
        .from('alerts')
        .insert([alertData]);

      if (!error && tempResult.level === 'critical') {
        toast({
          title: language === 'bn' ? '⚠️ তাপমাত্রা সতর্কতা!' : '⚠️ Temperature Alert!',
          description: tempResult.message[language],
          variant: 'destructive',
        });
      }

      console.log(`[Broiler Automation] Alert created - Level: ${tempResult.level}`);
    } catch (error) {
      console.error('[Broiler Automation] Failed to create alert:', error);
    }
  };

  // Return current temp evaluation for display
  if (temperature === null || !activeBatch) {
    return null;
  }

  return evaluateBroilerTemp(temperature, batchAge.weeks, batchAge.days);
}

/**
 * Get broiler temperature curve data for display
 */
export function getBroilerTempCurveData() {
  return BROILER_TEMP_CURVE.map((point, index) => ({
    week: index,
    label: index === 0 ? 'Day 1-7' : `Week ${index}`,
    minTemp: point.minTemp,
    maxTemp: point.maxTemp,
    idealTemp: (point.minTemp + point.maxTemp) / 2,
  }));
}
