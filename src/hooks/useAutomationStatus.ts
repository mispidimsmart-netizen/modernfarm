import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useWeatherCache } from '@/hooks/useWeather';
import { useLightingCurve } from '@/hooks/useLightingCurve';
import { calculateHSI, DEFAULT_HSI_THRESHOLDS, HSIThresholds } from '@/lib/heatStressIndex';
import { useFarmType, getBroilerTempRangeByDays, BROILER_THRESHOLDS } from '@/hooks/useFarmType';
import { useActiveBatch } from '@/hooks/useBroilerData';

// Inline function to avoid circular import from useBroilerAutomation
function calculateBroilerAge(startDate: string): { days: number; weeks: number } {
  const start = new Date(startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - start.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  return { days, weeks };
}

export type AutomationRuleStatus = 'active' | 'triggered' | 'idle' | 'disabled';

export interface AutomationRule {
  id: string;
  name: {
    bn: string;
    en: string;
  };
  description: {
    bn: string;
    en: string;
  };
  category: 'climate' | 'lighting' | 'safety' | 'prediction';
  status: AutomationRuleStatus;
  currentValue: string;
  threshold: string;
  action: {
    bn: string;
    en: string;
  };
  icon: string;
  lastTriggered?: Date;
}

export function useAutomationStatus() {
  const { data: farmSettings } = useFarmSettings();
  const { sensorData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { data: weatherData } = useWeatherCache();
  const { currentState: lightingState, settings: lightingSettings } = useLightingCurve();
  const { isBroiler, isLayer } = useFarmType();
  const { data: activeBatch } = useActiveBatch();

  // Calculate broiler age if applicable
  const broilerAge = useMemo(() => {
    if (!isBroiler || !activeBatch?.start_date) return null;
    return calculateBroilerAge(activeBatch.start_date);
  }, [isBroiler, activeBatch?.start_date]);

  const rules = useMemo<AutomationRule[]>(() => {
    const allRules: AutomationRule[] = [];
    const currentTemp = sensorData.temperature ?? 0;

    // ======== BROILER-SPECIFIC RULES ========
    if (isBroiler) {
      const ageDays = broilerAge?.days ?? 0;
      const tempRange = getBroilerTempRangeByDays(ageDays);
      const deviation = currentTemp - tempRange.targetTemp;
      
      // Broiler Temperature Status
      let broilerTempStatus: AutomationRuleStatus = 'idle';
      let broilerAction = { bn: 'স্বাভাবিক', en: 'Normal' };
      let deviceAction = '';

      if (deviation >= BROILER_THRESHOLDS.TEMP_ALARM_DEVIATION) {
        broilerTempStatus = 'triggered';
        broilerAction = { bn: 'ফ্যান HIGH + অ্যালার্ম', en: 'Fan HIGH + Alarm' };
        deviceAction = '🔥';
      } else if (deviation >= BROILER_THRESHOLDS.TEMP_FAN_HIGH_DEVIATION) {
        broilerTempStatus = 'triggered';
        broilerAction = { bn: 'ফ্যান HIGH', en: 'Fan HIGH' };
        deviceAction = '🌀';
      } else if (deviation <= -BROILER_THRESHOLDS.TEMP_HEATER_ON_DEVIATION) {
        broilerTempStatus = 'triggered';
        broilerAction = { bn: 'হিটার চালু', en: 'Heater ON' };
        deviceAction = '🔥';
      } else if (currentTemp >= tempRange.minTemp && currentTemp <= tempRange.maxTemp) {
        broilerTempStatus = 'active';
        broilerAction = { bn: 'আদর্শ তাপমাত্রা', en: 'Ideal Temperature' };
        deviceAction = '✅';
      }

      allRules.push({
        id: 'broiler-temp',
        name: { bn: 'ব্রয়লার তাপমাত্রা নিয়ন্ত্রণ', en: 'Broiler Temp Control' },
        description: { 
          bn: `বয়স: ${ageDays} দিন | টার্গেট: ${tempRange.minTemp}-${tempRange.maxTemp}°C`, 
          en: `Age: ${ageDays} days | Target: ${tempRange.minTemp}-${tempRange.maxTemp}°C` 
        },
        category: 'climate',
        status: broilerTempStatus,
        currentValue: `${currentTemp.toFixed(1)}°C ${deviceAction}`,
        threshold: `${tempRange.minTemp}-${tempRange.maxTemp}°C`,
        action: broilerAction,
        icon: '🐔',
      });

      // Heater Status (Broiler Only)
      const heaterNeeded = deviation <= -BROILER_THRESHOLDS.TEMP_HEATER_ON_DEVIATION;
      allRules.push({
        id: 'broiler-heater',
        name: { bn: 'হিটার স্ট্যাটাস', en: 'Heater Status' },
        description: { 
          bn: `ঠান্ডা হলে হিটার চালু`, 
          en: `Heater ON when cold` 
        },
        category: 'climate',
        status: heaterNeeded ? 'triggered' : 'idle',
        currentValue: heaterNeeded ? 'ON 🔥' : 'OFF',
        threshold: `< ${tempRange.targetTemp - 2}°C`,
        action: heaterNeeded 
          ? { bn: 'হিটার চালু', en: 'Heater ON' }
          : { bn: 'হিটার বন্ধ', en: 'Heater OFF' },
        icon: '🔥',
      });
    }

    // ======== LAYER-SPECIFIC RULES ========
    if (isLayer) {
      // Heat Stress Index Automation (Layer Only)
      const hsiThresholds: HSIThresholds = farmSettings ? {
        mild: Number(farmSettings.hsi_mild_threshold) || DEFAULT_HSI_THRESHOLDS.mild,
        moderate: Number(farmSettings.hsi_moderate_threshold) || DEFAULT_HSI_THRESHOLDS.moderate,
        severe: Number(farmSettings.hsi_severe_threshold) || DEFAULT_HSI_THRESHOLDS.severe,
        emergency: Number(farmSettings.hsi_emergency_threshold) || DEFAULT_HSI_THRESHOLDS.emergency,
      } : DEFAULT_HSI_THRESHOLDS;

      const hsiResult = sensorData.temperature !== null && sensorData.humidity !== null
        ? calculateHSI(sensorData.temperature, sensorData.humidity, hsiThresholds)
        : null;

      allRules.push({
        id: 'hsi-automation',
        name: { bn: 'হিট স্ট্রেস ইনডেক্স', en: 'Heat Stress Index' },
        description: { 
          bn: 'তাপমাত্রা ও আর্দ্রতার উপর ভিত্তি করে ফ্যান নিয়ন্ত্রণ', 
          en: 'Fan control based on temperature & humidity' 
        },
        category: 'climate',
        status: farmSettings?.hsi_automation_enabled === false ? 'disabled' 
          : hsiResult?.shouldActivateFan ? 'triggered' 
          : 'idle',
        currentValue: hsiResult ? `HSI: ${hsiResult.index}` : '--',
        threshold: `≥ ${hsiThresholds.mild}`,
        action: { bn: 'ফ্যান চালু', en: 'Fan ON' },
        icon: '🌡️',
      });
    }

    // ======== COMMON RULES (BOTH FARM TYPES) ========
    
    // Fan Speed Automation
    const fanLowMin = Number(farmSettings?.fan_low_temp_min) || 28;
    const fanMediumMin = Number(farmSettings?.fan_medium_temp_min) || 30;
    const fanHighMin = Number(farmSettings?.fan_high_temp_min) || 33;

    let fanSpeedStatus: AutomationRuleStatus = 'idle';
    let fanSpeedValue = 'OFF';
    if (currentTemp >= fanHighMin) {
      fanSpeedStatus = 'triggered';
      fanSpeedValue = 'HIGH';
    } else if (currentTemp >= fanMediumMin) {
      fanSpeedStatus = 'triggered';
      fanSpeedValue = 'MEDIUM';
    } else if (currentTemp >= fanLowMin) {
      fanSpeedStatus = 'active';
      fanSpeedValue = 'LOW';
    }

    allRules.push({
      id: 'fan-speed',
      name: { bn: 'ফ্যান স্পিড অটোমেশন', en: 'Fan Speed Automation' },
      description: { 
        bn: 'তাপমাত্রা অনুযায়ী ফ্যানের গতি নিয়ন্ত্রণ', 
        en: 'Fan speed control based on temperature' 
      },
      category: 'climate',
      status: fanSpeedStatus,
      currentValue: `${currentTemp.toFixed(1)}°C → ${fanSpeedValue}`,
      threshold: `LOW≥${fanLowMin}°, MED≥${fanMediumMin}°, HIGH≥${fanHighMin}°`,
      action: { bn: `স্পিড: ${fanSpeedValue}`, en: `Speed: ${fanSpeedValue}` },
      icon: '🌀',
    });

    // Ammonia Trend Detection
    const ammoniaMax = Number(farmSettings?.ammonia_max) || 25;
    const currentAmmonia = sensorData.ammonia ?? 0;
    const ammoniaHigh = currentAmmonia >= ammoniaMax;

    allRules.push({
      id: 'ammonia-trend',
      name: { bn: 'অ্যামোনিয়া ট্রেন্ড ডিটেকশন', en: 'Ammonia Trend Detection' },
      description: { 
        bn: '৩ ঘণ্টা ধরে অ্যামোনিয়া বাড়লে ভেন্টিলেশন বাড়ায়', 
        en: 'Increases ventilation if ammonia rises for 3 hours' 
      },
      category: 'safety',
      status: ammoniaHigh ? 'triggered' : 'idle',
      currentValue: `${currentAmmonia.toFixed(1)} ppm`,
      threshold: `3h rising trend`,
      action: { bn: 'ফ্যান HIGH', en: 'Fan HIGH' },
      icon: '💨',
    });

    // Water Anomaly Detection
    const waterThreshold = Number(farmSettings?.water_anomaly_threshold) || 15;

    allRules.push({
      id: 'water-anomaly',
      name: { bn: 'পানি অ্যানোমালি ডিটেকশন', en: 'Water Anomaly Detection' },
      description: { 
        bn: 'পানি ব্যবহার হঠাৎ কমলে সতর্কতা', 
        en: 'Alert if water usage suddenly drops' 
      },
      category: 'safety',
      status: 'idle',
      currentValue: `${sensorData.waterUsage?.toFixed(1) ?? '--'} L`,
      threshold: `>${waterThreshold}% drop`,
      action: { bn: 'স্বাস্থ্য সতর্কতা', en: 'Health Alert' },
      icon: '💧',
    });

    // Smart Lighting Curve (Layer focused but useful for broiler too)
    allRules.push({
      id: 'smart-lighting',
      name: { bn: 'স্মার্ট লাইটিং কার্ভ', en: 'Smart Lighting Curve' },
      description: { 
        bn: 'ধীরে ধীরে আলো বাড়ানো/কমানো', 
        en: 'Gradual light increase/decrease' 
      },
      category: 'lighting',
      status: lightingSettings?.gradualEnabled ? 
        (lightingState?.phase === 'fade-in' || lightingState?.phase === 'fade-out' ? 'triggered' : 'active') 
        : 'disabled',
      currentValue: lightingState ? `${lightingState.brightness}% (${lightingState.phase})` : '--',
      threshold: `Fade: ${lightingSettings?.fadeInMinutes ?? 30}m / ${lightingSettings?.fadeOutMinutes ?? 30}m`,
      action: { bn: 'গ্র্যাজুয়াল ডিমিং', en: 'Gradual Dimming' },
      icon: '💡',
    });

    // Tomorrow's Heat Stress Prediction
    const tomorrowTemp = weatherData?.forecast_json?.daily?.temperature_2m_max?.[1];
    const tomorrowHumidity = weatherData?.forecast_json?.daily?.relative_humidity_2m_mean?.[1];
    const isTomorrowRisky = (tomorrowTemp ?? 0) >= 35 || (tomorrowHumidity ?? 0) >= 80;

    allRules.push({
      id: 'heat-prediction',
      name: { bn: 'আগামীকালের ঝুঁকি পূর্বাভাস', en: 'Tomorrow Risk Prediction' },
      description: { 
        bn: 'আবহাওয়া + ফ্যান রানটাইম থেকে ঝুঁকি অনুমান', 
        en: 'Risk estimation from weather + fan runtime' 
      },
      category: 'prediction',
      status: isTomorrowRisky ? 'triggered' : 'idle',
      currentValue: tomorrowTemp ? `${tomorrowTemp}°C / ${tomorrowHumidity ?? '--'}%` : '--',
      threshold: `Temp≥35° or Humidity≥80%`,
      action: { bn: 'প্রস্তুতি সতর্কতা', en: 'Preparation Alert' },
      icon: '🔮',
    });

    // Weather-based Fan Adjustment
    allRules.push({
      id: 'weather-fan',
      name: { bn: 'আবহাওয়া-ভিত্তিক ফ্যান', en: 'Weather-based Fan' },
      description: { 
        bn: 'বাইরের আবহাওয়া অনুযায়ী ফ্যান সামঞ্জস্য', 
        en: 'Adjust fan based on outdoor weather' 
      },
      category: 'climate',
      status: 'active',
      currentValue: weatherData ? `${weatherData.temperature}°C (outdoor)` : '--',
      threshold: `Heat wave ≥35°C`,
      action: { bn: 'অটো অ্যাডজাস্ট', en: 'Auto Adjust' },
      icon: '☀️',
    });

    return allRules;
  }, [farmSettings, sensorData, deviceStatus, weatherData, lightingState, lightingSettings, isBroiler, isLayer, broilerAge]);

  const stats = useMemo(() => {
    const total = rules.length;
    const triggered = rules.filter(r => r.status === 'triggered').length;
    const active = rules.filter(r => r.status === 'active').length;
    const disabled = rules.filter(r => r.status === 'disabled').length;

    return { total, triggered, active, disabled };
  }, [rules]);

  return { rules, stats };
}
