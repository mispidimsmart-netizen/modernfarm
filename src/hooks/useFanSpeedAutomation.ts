import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings } from '@/hooks/useFarmData';

export type FanSpeed = 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface FanSpeedThresholds {
  fanLowTempMin: number;
  fanLowTempMax: number;
  fanMediumTempMin: number;
  fanMediumTempMax: number;
  fanHighTempMin: number;
}

export const DEFAULT_FAN_SPEED_THRESHOLDS: FanSpeedThresholds = {
  fanLowTempMin: 28,
  fanLowTempMax: 30,
  fanMediumTempMin: 30,
  fanMediumTempMax: 33,
  fanHighTempMin: 33,
};

export interface FanSpeedResult {
  speed: FanSpeed;
  shouldActivate: boolean;
  message: {
    bn: string;
    en: string;
  };
}

/**
 * Calculate fan speed based on temperature
 */
export function calculateFanSpeed(
  temperature: number,
  thresholds: FanSpeedThresholds = DEFAULT_FAN_SPEED_THRESHOLDS
): FanSpeedResult {
  if (temperature >= thresholds.fanHighTempMin) {
    return {
      speed: 'HIGH',
      shouldActivate: true,
      message: {
        bn: 'উচ্চ তাপমাত্রা - ফ্যান সর্বোচ্চ গতিতে',
        en: 'High temperature - Fan at maximum speed'
      }
    };
  } else if (temperature >= thresholds.fanMediumTempMin && temperature < thresholds.fanMediumTempMax) {
    return {
      speed: 'MEDIUM',
      shouldActivate: true,
      message: {
        bn: 'মাঝারি তাপমাত্রা - ফ্যান মাঝারি গতিতে',
        en: 'Moderate temperature - Fan at medium speed'
      }
    };
  } else if (temperature >= thresholds.fanLowTempMin && temperature < thresholds.fanLowTempMax) {
    return {
      speed: 'LOW',
      shouldActivate: true,
      message: {
        bn: 'হালকা তাপমাত্রা - ফ্যান নিম্ন গতিতে',
        en: 'Mild temperature - Fan at low speed'
      }
    };
  } else {
    return {
      speed: 'OFF',
      shouldActivate: false,
      message: {
        bn: 'স্বাভাবিক তাপমাত্রা - ফ্যান বন্ধ',
        en: 'Normal temperature - Fan off'
      }
    };
  }
}

/**
 * Get color for fan speed display
 */
export function getFanSpeedColor(speed: FanSpeed): string {
  switch (speed) {
    case 'OFF':
      return 'text-muted-foreground';
    case 'LOW':
      return 'text-green-600';
    case 'MEDIUM':
      return 'text-yellow-600';
    case 'HIGH':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get background color for fan speed display
 */
export function getFanSpeedBgColor(speed: FanSpeed): string {
  switch (speed) {
    case 'OFF':
      return 'bg-muted';
    case 'LOW':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'MEDIUM':
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    case 'HIGH':
      return 'bg-red-100 dark:bg-red-900/30';
    default:
      return 'bg-muted';
  }
}

interface UseFanSpeedAutomationProps {
  temperature: number | null;
  shedId?: string | null;
  enabled?: boolean;
}

export function useFanSpeedAutomation({
  temperature,
  shedId,
  enabled = true,
}: UseFanSpeedAutomationProps) {
  const { user } = useAuth();
  const { data: farmSettings } = useFarmSettings();
  const lastFanSpeed = useRef<FanSpeed | null>(null);
  const isInitialMount = useRef(true);

  // Get custom thresholds from settings
  const thresholds: FanSpeedThresholds = farmSettings ? {
    fanLowTempMin: Number(farmSettings.fan_low_temp_min) || DEFAULT_FAN_SPEED_THRESHOLDS.fanLowTempMin,
    fanLowTempMax: Number(farmSettings.fan_low_temp_max) || DEFAULT_FAN_SPEED_THRESHOLDS.fanLowTempMax,
    fanMediumTempMin: Number(farmSettings.fan_medium_temp_min) || DEFAULT_FAN_SPEED_THRESHOLDS.fanMediumTempMin,
    fanMediumTempMax: Number(farmSettings.fan_medium_temp_max) || DEFAULT_FAN_SPEED_THRESHOLDS.fanMediumTempMax,
    fanHighTempMin: Number(farmSettings.fan_high_temp_min) || DEFAULT_FAN_SPEED_THRESHOLDS.fanHighTempMin,
  } : DEFAULT_FAN_SPEED_THRESHOLDS;

  useEffect(() => {
    if (!enabled || !user || temperature === null) {
      return;
    }

    const fanSpeedResult = calculateFanSpeed(temperature, thresholds);

    // On initial mount, just record the current speed without triggering notifications
    if (isInitialMount.current) {
      lastFanSpeed.current = fanSpeedResult.speed;
      isInitialMount.current = false;
      return;
    }

    // Only log if fan speed changed — NO DB writes, ESP32 is the authority
    if (fanSpeedResult.speed !== lastFanSpeed.current) {
      lastFanSpeed.current = fanSpeedResult.speed;
      console.log(`[Fan Speed Automation] Calculated speed: ${fanSpeedResult.speed}, Temp: ${temperature}°C (display only)`);
    }
  }, [temperature, enabled, user, thresholds]);


  // Return current fan speed result for display
  if (temperature === null) {
    return null;
  }

  return calculateFanSpeed(temperature, thresholds);
}
