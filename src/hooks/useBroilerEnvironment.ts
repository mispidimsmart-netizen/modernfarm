import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { 
  getBroilerTempRangeByDays, 
  BROILER_THRESHOLDS,
  BROILER_TEMP_CURVE_DAYS 
} from '@/hooks/useFarmType';

// Inline function to avoid circular import
function calculateBroilerAge(startDate: string): { days: number; weeks: number } {
  const start = new Date(startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - start.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  return { days, weeks };
}

export type BroilerAlertLevel = 'normal' | 'low_temp' | 'high_temp' | 'critical' | 'emergency';
export type HumidityStatus = 'normal' | 'low' | 'high';
export type AmmoniaStatus = 'normal' | 'warning' | 'danger';

export interface BroilerEnvironmentResult {
  // Temperature
  temperature: {
    current: number;
    targetMin: number;
    targetMax: number;
    targetTemp: number;
    deviation: number;
    level: BroilerAlertLevel;
    shouldActivateFan: boolean;
    shouldActivateHeater: boolean;
    fanSpeed: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH' | 'MAX';
    shouldAlarm: boolean;
  };
  // Humidity
  humidity: {
    current: number;
    status: HumidityStatus;
    shouldIncreaseVentilation: boolean;
    message: { bn: string; en: string };
  };
  // Ammonia
  ammonia: {
    current: number;
    status: AmmoniaStatus;
    shouldActivateFan: boolean;
    shouldAlarm: boolean;
    message: { bn: string; en: string };
  };
  // Heat Stress
  hsi: {
    value: number;
    shouldFanHigh: boolean;
    shouldFanMax: boolean;
    shouldEmergencyAlert: boolean;
    level: 'normal' | 'high' | 'danger' | 'emergency';
  };
  // Age info
  ageDays: number;
  ageWeeks: number;
  tempRangeLabel: string;
  tempRangeLabelBn: string;
  // Overall
  overallMessage: { bn: string; en: string };
  needsAction: boolean;
}

/**
 * Calculate Heat Stress Index for broilers
 */
export function calculateBroilerHSI(temperature: number, humidity: number): number {
  return temperature + (humidity * 0.1);
}

/**
 * Evaluate all environmental factors for broilers
 */
export function evaluateBroilerEnvironment(
  temperature: number,
  humidity: number,
  ammonia: number,
  ageDays: number
): BroilerEnvironmentResult {
  const { minTemp, maxTemp, targetTemp, label, labelBn } = getBroilerTempRangeByDays(ageDays);
  const ageWeeks = Math.floor(ageDays / 7);
  const hsiValue = calculateBroilerHSI(temperature, humidity);
  
  // ========== TEMPERATURE EVALUATION ==========
  let tempLevel: BroilerAlertLevel = 'normal';
  let shouldActivateFan = false;
  let shouldActivateHeater = false;
  let fanSpeed: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH' | 'MAX' = 'OFF';
  let shouldTempAlarm = false;
  let tempDeviation = 0;

  if (temperature > targetTemp) {
    tempDeviation = temperature - targetTemp;
    
    if (tempDeviation >= BROILER_THRESHOLDS.TEMP_ALARM_DEVIATION) {
      // +4°C or more → alarm
      tempLevel = 'emergency';
      shouldActivateFan = true;
      fanSpeed = 'HIGH';
      shouldTempAlarm = true;
    } else if (tempDeviation >= BROILER_THRESHOLDS.TEMP_FAN_HIGH_DEVIATION) {
      // +2°C → fan HIGH
      tempLevel = 'high_temp';
      shouldActivateFan = true;
      fanSpeed = 'HIGH';
    } else if (tempDeviation > 0.5) {
      tempLevel = 'high_temp';
      shouldActivateFan = true;
      fanSpeed = 'MEDIUM';
    }
  } else if (temperature < targetTemp) {
    tempDeviation = targetTemp - temperature;
    
    if (tempDeviation >= BROILER_THRESHOLDS.TEMP_HEATER_ON_DEVIATION) {
      // -2°C → heater ON
      tempLevel = tempDeviation >= BROILER_THRESHOLDS.TEMP_ALARM_DEVIATION ? 'critical' : 'low_temp';
      shouldActivateHeater = true;
    }
  }

  // ========== HUMIDITY EVALUATION ==========
  let humidityStatus: HumidityStatus = 'normal';
  let shouldIncreaseVentilation = false;
  let humidityMessage = { bn: 'আর্দ্রতা স্বাভাবিক', en: 'Humidity normal' };

  if (humidity < BROILER_THRESHOLDS.HUMIDITY_LOW_WARNING) {
    humidityStatus = 'low';
    humidityMessage = {
      bn: `⚠️ আর্দ্রতা কম (${humidity}%) - পানির ব্যবস্থা করুন`,
      en: `⚠️ Low humidity (${humidity}%) - Add water`
    };
  } else if (humidity > BROILER_THRESHOLDS.HUMIDITY_HIGH_VENTILATION) {
    humidityStatus = 'high';
    shouldIncreaseVentilation = true;
    humidityMessage = {
      bn: `💨 আর্দ্রতা বেশি (${humidity}%) - বায়ু চলাচল বাড়ান`,
      en: `💨 High humidity (${humidity}%) - Increase ventilation`
    };
    // Force fan ON for high humidity even if temp is OK
    if (!shouldActivateFan) {
      shouldActivateFan = true;
      fanSpeed = fanSpeed === 'OFF' ? 'LOW' : fanSpeed;
    }
  }

  // ========== AMMONIA EVALUATION ==========
  let ammoniaStatus: AmmoniaStatus = 'normal';
  let shouldAmmoniaFan = false;
  let shouldAmmoniaAlarm = false;
  let ammoniaMessage = { bn: 'অ্যামোনিয়া স্বাভাবিক', en: 'Ammonia normal' };

  if (ammonia >= BROILER_THRESHOLDS.AMMONIA_ALARM) {
    // >30 ppm → alarm
    ammoniaStatus = 'danger';
    shouldAmmoniaFan = true;
    shouldAmmoniaAlarm = true;
    ammoniaMessage = {
      bn: `🚨 অ্যামোনিয়া বিপদ! (${ammonia} ppm) - জরুরি বায়ু চলাচল`,
      en: `🚨 Ammonia danger! (${ammonia} ppm) - Emergency ventilation`
    };
  } else if (ammonia >= BROILER_THRESHOLDS.AMMONIA_FAN_ON) {
    // >20 ppm → fan ON
    ammoniaStatus = 'warning';
    shouldAmmoniaFan = true;
    ammoniaMessage = {
      bn: `⚠️ অ্যামোনিয়া বেশি (${ammonia} ppm) - ফ্যান চালু করুন`,
      en: `⚠️ High ammonia (${ammonia} ppm) - Turn on fan`
    };
  }

  // Combine ammonia fan requirement
  if (shouldAmmoniaFan && !shouldActivateFan) {
    shouldActivateFan = true;
    fanSpeed = shouldAmmoniaAlarm ? 'HIGH' : 'MEDIUM';
  }

  // ========== HSI EVALUATION ==========
  // 👉 Cloud এর অপেক্ষা করবে না - ESP32 handles locally!
  let hsiLevel: 'normal' | 'high' | 'danger' | 'emergency' = 'normal';
  let shouldHsiFanHigh = false;
  let shouldHsiEmergency = false;
  let shouldHsiFanMax = false;

  // HSI >= 45: EMERGENCY MODE (continuous alarm)
  if (hsiValue >= BROILER_THRESHOLDS.HSI_EMERGENCY) {
    hsiLevel = 'emergency';
    shouldHsiFanMax = true;
    shouldHsiEmergency = true;
    fanSpeed = 'MAX';
    shouldActivateFan = true;
  }
  // HSI >= 42: Fan MAX + Alarm
  else if (hsiValue >= BROILER_THRESHOLDS.HSI_FAN_MAX_ALARM) {
    hsiLevel = 'danger';
    shouldHsiFanMax = true;
    fanSpeed = 'MAX';
    shouldActivateFan = true;
    shouldTempAlarm = true;
  }
  // HSI >= 38: Fan HIGH
  else if (hsiValue >= BROILER_THRESHOLDS.HSI_FAN_HIGH) {
    hsiLevel = 'high';
    shouldHsiFanHigh = true;
    fanSpeed = 'HIGH';
    shouldActivateFan = true;
  }

  // ========== OVERALL MESSAGE ==========
  const needsAction = shouldActivateFan || shouldActivateHeater || 
                      shouldTempAlarm || shouldAmmoniaAlarm || shouldHsiEmergency;

  let overallMessage = { bn: '✅ সব স্বাভাবিক', en: '✅ All normal' };
  
  if (shouldHsiEmergency) {
    overallMessage = { 
      bn: `🚨 জরুরি! HSI ${hsiValue.toFixed(1)} - তাৎক্ষণিক ব্যবস্থা নিন`, 
      en: `🚨 Emergency! HSI ${hsiValue.toFixed(1)} - Take immediate action` 
    };
  } else if (shouldTempAlarm) {
    overallMessage = {
      bn: `🔥 তাপমাত্রা অতিরিক্ত! ${temperature}°C (টার্গেট: ${targetTemp}°C)`,
      en: `🔥 Temperature too high! ${temperature}°C (Target: ${targetTemp}°C)`
    };
  } else if (shouldAmmoniaAlarm) {
    overallMessage = ammoniaMessage;
  } else if (tempLevel === 'low_temp' || tempLevel === 'critical') {
    overallMessage = {
      bn: `🥶 তাপমাত্রা কম! ${temperature}°C - হিটার চালু করুন`,
      en: `🥶 Temperature low! ${temperature}°C - Turn on heater`
    };
  } else if (tempLevel === 'high_temp') {
    overallMessage = {
      bn: `🌡️ তাপমাত্রা বেশি - ফ্যান ${fanSpeed}`,
      en: `🌡️ Temperature high - Fan ${fanSpeed}`
    };
  } else if (humidityStatus !== 'normal') {
    overallMessage = humidityMessage;
  } else if (ammoniaStatus !== 'normal') {
    overallMessage = ammoniaMessage;
  }

  return {
    temperature: {
      current: temperature,
      targetMin: minTemp,
      targetMax: maxTemp,
      targetTemp,
      deviation: tempDeviation,
      level: tempLevel,
      shouldActivateFan,
      shouldActivateHeater,
      fanSpeed,
      shouldAlarm: shouldTempAlarm,
    },
    humidity: {
      current: humidity,
      status: humidityStatus,
      shouldIncreaseVentilation,
      message: humidityMessage,
    },
    ammonia: {
      current: ammonia,
      status: ammoniaStatus,
      shouldActivateFan: shouldAmmoniaFan,
      shouldAlarm: shouldAmmoniaAlarm,
      message: ammoniaMessage,
    },
    hsi: {
      value: hsiValue,
      shouldFanHigh: shouldHsiFanHigh,
      shouldFanMax: shouldHsiFanMax,
      shouldEmergencyAlert: shouldHsiEmergency,
      level: hsiLevel,
    },
    ageDays,
    ageWeeks,
    tempRangeLabel: label,
    tempRangeLabelBn: labelBn,
    overallMessage,
    needsAction,
  };
}

interface UseBroilerEnvironmentProps {
  temperature: number | null;
  humidity: number | null;
  ammonia: number | null;
  shedId?: string | null;
  enabled?: boolean;
}

/**
 * Complete broiler environment automation hook
 * Handles temperature, humidity, ammonia, and HSI based on user's specs
 */
export function useBroilerEnvironment({
  temperature,
  humidity,
  ammonia,
  shedId,
  enabled = true,
}: UseBroilerEnvironmentProps) {
  const { user, language } = useAuth();
  const { data: activeBatch } = useActiveBatch();
  const { toast } = useToast();
  
  const lastAlertLevel = useRef<string | null>(null);
  const lastFanAction = useRef<string | null>(null);
  const lastHeaterAction = useRef<boolean | null>(null);

  // Calculate batch age
  const batchAge = activeBatch 
    ? calculateBroilerAge(activeBatch.start_date) 
    : { days: 1, weeks: 0 };

  useEffect(() => {
    if (!enabled || !user || !activeBatch || temperature === null || humidity === null) {
      return;
    }

    const ammoniaValue = ammonia ?? 0;
    const result = evaluateBroilerEnvironment(temperature, humidity, ammoniaValue, batchAge.days);

    // ===== FAN CONTROL =====
    const fanKey = `${result.temperature.shouldActivateFan}-${result.temperature.fanSpeed}`;
    if (fanKey !== lastFanAction.current) {
      if (result.temperature.shouldActivateFan) {
        activateFan(result.temperature.fanSpeed, result);
      } else if (lastFanAction.current && lastFanAction.current.startsWith('true')) {
        deactivateFan();
      }
      lastFanAction.current = fanKey;
    }

    // ===== HEATER CONTROL =====
    if (result.temperature.shouldActivateHeater !== lastHeaterAction.current) {
      if (result.temperature.shouldActivateHeater) {
        showHeaterAlert(result);
      }
      lastHeaterAction.current = result.temperature.shouldActivateHeater;
    }

    // ===== ALERTS =====
    const alertKey = `${result.temperature.level}-${result.ammonia.status}-${result.hsi.level}`;
    if (alertKey !== lastAlertLevel.current && result.needsAction) {
      createAlert(result);
      lastAlertLevel.current = alertKey;
    }

  }, [temperature, humidity, ammonia, enabled, user, activeBatch, batchAge.days]);

  const activateFan = async (speed: string, result: BroilerEnvironmentResult) => {
    if (!user) return;

    try {
      await supabase
        .from('device_status')
        .update({
          fan_on: true,
          fan_speed: speed,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      toast({
        title: language === 'bn' ? `🌀 ফ্যান ${speed}` : `🌀 Fan ${speed}`,
        description: result.overallMessage[language],
      });

      console.log(`[Broiler Env] Fan ${speed} - Age: ${batchAge.days}d, Temp: ${temperature}°C, NH3: ${ammonia}ppm`);
    } catch (error) {
      console.error('[Broiler Env] Failed to activate fan:', error);
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

      console.log('[Broiler Env] Fan OFF - Environment normalized');
    } catch (error) {
      console.error('[Broiler Env] Failed to deactivate fan:', error);
    }
  };

  const showHeaterAlert = (result: BroilerEnvironmentResult) => {
    toast({
      title: language === 'bn' ? '🔥 হিটার চালু করুন!' : '🔥 Turn on heater!',
      description: language === 'bn' 
        ? `তাপমাত্রা ${result.temperature.current}°C (টার্গেট: ${result.temperature.targetTemp}°C)`
        : `Temperature ${result.temperature.current}°C (Target: ${result.temperature.targetTemp}°C)`,
      variant: 'destructive',
    });
  };

  const createAlert = async (result: BroilerEnvironmentResult) => {
    if (!user) return;

    try {
      const severity: 'danger' | 'warning' = 
        result.hsi.shouldEmergencyAlert || result.temperature.shouldAlarm || result.ammonia.shouldAlarm
          ? 'danger' 
          : 'warning';

      const alertData = {
        user_id: user.id,
        alert_type: 'temperature' as const,
        severity,
        message: `Broiler (${batchAge.days}d): ${result.overallMessage.en}`,
        message_bn: `ব্রয়লার (${batchAge.days} দিন): ${result.overallMessage.bn}`,
        shed_id: shedId || null,
      };

      await supabase.from('alerts').insert([alertData]);

      if (severity === 'danger') {
        toast({
          title: language === 'bn' ? '⚠️ জরুরি সতর্কতা!' : '⚠️ Emergency Alert!',
          description: result.overallMessage[language],
          variant: 'destructive',
        });
      }

      console.log(`[Broiler Env] Alert created - Severity: ${severity}`);
    } catch (error) {
      console.error('[Broiler Env] Failed to create alert:', error);
    }
  };

  // Return current evaluation
  if (temperature === null || humidity === null || !activeBatch) {
    return null;
  }

  return evaluateBroilerEnvironment(temperature, humidity, ammonia ?? 0, batchAge.days);
}

/**
 * Get temperature curve data for display
 */
export function getBroilerTempCurveDisplayData() {
  return BROILER_TEMP_CURVE_DAYS.map(point => ({
    days: `${point.minDays}-${point.maxDays === 999 ? '∞' : point.maxDays}`,
    label: point.label,
    labelBn: point.labelBn,
    minTemp: point.minTemp,
    maxTemp: point.maxTemp,
    targetTemp: (point.minTemp + point.maxTemp) / 2,
  }));
}
