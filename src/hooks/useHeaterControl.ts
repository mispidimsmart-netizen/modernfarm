/**
 * MODULE 2: Heater Control + Broiler Temperature Curve
 * 
 * LAYER MODE:
 * - If temp < 20°C → Heater ON
 * - If temp > 24°C → Heater OFF
 * 
 * BROILER MODE (age-based curve):
 * - Day 1-3 = 33°C
 * - Day 4-7 = 31°C
 * - Day 8-14 = 29°C
 * - Day 15-21 = 26°C
 * - Day 22-28 = 24°C
 * - Day 29+ = 22°C
 * 
 * - If temp < targetTemp − 0.7 → Heater ON
 * - If temp > targetTemp + 0.7 → Heater OFF
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAdvancedAutomationSettings } from './useAdvancedAutomation';
import { useFarmType, getBroilerTempRangeByDays } from './useFarmType';
import { useActiveBatch } from './useBroilerData';
import { calculateBroilerAge } from './useBroilerAutomation';

export interface HeaterStatus {
  isOn: boolean;
  targetTemp: number;
  currentTemp: number;
  deviation: number;
  mode: 'layer' | 'broiler';
  ageDays?: number;
  message: {
    bn: string;
    en: string;
  };
}

// Broiler temperature curve (based on days)
const BROILER_TEMP_CURVE = [
  { minDays: 1, maxDays: 3, temp: 33 },
  { minDays: 4, maxDays: 7, temp: 31 },
  { minDays: 8, maxDays: 14, temp: 29 },
  { minDays: 15, maxDays: 21, temp: 26 },
  { minDays: 22, maxDays: 28, temp: 24 },
  { minDays: 29, maxDays: 999, temp: 22 },
];

function getBroilerTargetTemp(ageDays: number): number {
  for (const range of BROILER_TEMP_CURVE) {
    if (ageDays >= range.minDays && ageDays <= range.maxDays) {
      return range.temp;
    }
  }
  return 22; // Default for 29+ days
}

interface UseHeaterControlProps {
  temperature: number | null;
  enabled?: boolean;
  onHeaterChange?: (on: boolean) => void;
}

export function useHeaterControl({
  temperature,
  enabled = true,
  onHeaterChange,
}: UseHeaterControlProps) {
  const { user } = useAuth();
  const { data: settings } = useAdvancedAutomationSettings();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  
  const lastHeaterState = useRef<boolean | null>(null);
  
  const [status, setStatus] = useState<HeaterStatus>({
    isOn: false,
    targetTemp: 22,
    currentTemp: 0,
    deviation: 0,
    mode: 'layer',
    message: { bn: 'হিটার বন্ধ', en: 'Heater off' },
  });

  // Calculate broiler age
  const ageDays = useMemo(() => {
    if (!isBroiler || !activeBatch) return null;
    const age = calculateBroilerAge(activeBatch.start_date);
    return age.days;
  }, [isBroiler, activeBatch]);

  // Calculate target temperature based on farm type
  const targetTemp = useMemo(() => {
    if (isBroiler && ageDays !== null) {
      return getBroilerTargetTemp(ageDays);
    }
    // Layer mode - use midpoint of on/off temps
    return ((settings?.heater_on_temp || 20) + (settings?.heater_off_temp || 24)) / 2;
  }, [isBroiler, ageDays, settings]);

  // Main heater control logic
  useEffect(() => {
    if (!user || !settings?.heater_enabled || !enabled || temperature === null) {
      return;
    }

    const tolerance = settings.heater_tolerance || 0.7;
    let shouldHeaterBeOn = false;
    let message = { bn: '', en: '' };

    if (isLayer) {
      // LAYER MODE: Simple threshold-based control
      const onTemp = settings.heater_on_temp || 20;
      const offTemp = settings.heater_off_temp || 24;
      
      if (temperature < onTemp) {
        shouldHeaterBeOn = true;
        message = {
          bn: `🔥 হিটার চালু (${temperature.toFixed(1)}°C < ${onTemp}°C)`,
          en: `🔥 Heater ON (${temperature.toFixed(1)}°C < ${onTemp}°C)`,
        };
      } else if (temperature > offTemp) {
        shouldHeaterBeOn = false;
        message = {
          bn: `হিটার বন্ধ (${temperature.toFixed(1)}°C > ${offTemp}°C)`,
          en: `Heater OFF (${temperature.toFixed(1)}°C > ${offTemp}°C)`,
        };
      } else {
        // In between - maintain current state
        shouldHeaterBeOn = lastHeaterState.current ?? false;
        message = {
          bn: `তাপমাত্রা স্বাভাবিক (${onTemp}-${offTemp}°C)`,
          en: `Temperature normal (${onTemp}-${offTemp}°C)`,
        };
      }
    } else if (isBroiler && ageDays !== null) {
      // BROILER MODE: Age-based curve with tolerance
      const target = getBroilerTargetTemp(ageDays);
      const deviation = temperature - target;
      
      if (temperature < target - tolerance) {
        shouldHeaterBeOn = true;
        message = {
          bn: `🔥 হিটার চালু - Day ${ageDays} (${temperature.toFixed(1)}°C < ${target}°C)`,
          en: `🔥 Heater ON - Day ${ageDays} (${temperature.toFixed(1)}°C < ${target}°C)`,
        };
      } else if (temperature > target + tolerance) {
        shouldHeaterBeOn = false;
        message = {
          bn: `হিটার বন্ধ - Day ${ageDays} (${temperature.toFixed(1)}°C > ${target}°C)`,
          en: `Heater OFF - Day ${ageDays} (${temperature.toFixed(1)}°C > ${target}°C)`,
        };
      } else {
        // Within tolerance - maintain current state
        shouldHeaterBeOn = lastHeaterState.current ?? false;
        message = {
          bn: `তাপমাত্রা আদর্শ - Day ${ageDays} (${target}°C ± ${tolerance})`,
          en: `Temperature ideal - Day ${ageDays} (${target}°C ± ${tolerance})`,
        };
      }
    }

    // Only trigger callback if state actually changed
    if (shouldHeaterBeOn !== lastHeaterState.current) {
      lastHeaterState.current = shouldHeaterBeOn;
      onHeaterChange?.(shouldHeaterBeOn);
    }

    setStatus({
      isOn: shouldHeaterBeOn,
      targetTemp,
      currentTemp: temperature,
      deviation: temperature - targetTemp,
      mode: isBroiler ? 'broiler' : 'layer',
      ageDays: ageDays ?? undefined,
      message,
    });
  }, [user, settings, enabled, temperature, isLayer, isBroiler, ageDays, targetTemp, onHeaterChange]);

  return status;
}

// Export the curve for display purposes
export function getHeaterTempCurve(farmType: 'layer' | 'broiler', settings?: { heater_on_temp?: number; heater_off_temp?: number }) {
  if (farmType === 'layer') {
    return [
      { label: 'Heater ON', temp: settings?.heater_on_temp || 20 },
      { label: 'Heater OFF', temp: settings?.heater_off_temp || 24 },
    ];
  }
  
  return BROILER_TEMP_CURVE.map(range => ({
    label: range.minDays === 29 ? 'Day 29+' : `Day ${range.minDays}-${range.maxDays}`,
    temp: range.temp,
  }));
}
