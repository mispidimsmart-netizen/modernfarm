/**
 * Phase 5d — Fan speed SSOT (pure).
 *
 * Extracted from the unused `useFanSpeedAutomation` hook. Only the pure
 * threshold logic + display helpers were ever consumed by the UI, so they now
 * live in `src/lib` and are unit-tested.
 */
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
  message: { bn: string; en: string };
}

/** Temperature → fan speed step. */
export function calculateFanSpeed(
  temperature: number,
  thresholds: FanSpeedThresholds = DEFAULT_FAN_SPEED_THRESHOLDS,
): FanSpeedResult {
  if (temperature >= thresholds.fanHighTempMin) {
    return {
      speed: 'HIGH',
      shouldActivate: true,
      message: {
        bn: 'উচ্চ তাপমাত্রা - ফ্যান সর্বোচ্চ গতিতে',
        en: 'High temperature - Fan at maximum speed',
      },
    };
  }
  if (temperature >= thresholds.fanMediumTempMin && temperature < thresholds.fanMediumTempMax) {
    return {
      speed: 'MEDIUM',
      shouldActivate: true,
      message: {
        bn: 'মাঝারি তাপমাত্রা - ফ্যান মাঝারি গতিতে',
        en: 'Moderate temperature - Fan at medium speed',
      },
    };
  }
  if (temperature >= thresholds.fanLowTempMin && temperature < thresholds.fanLowTempMax) {
    return {
      speed: 'LOW',
      shouldActivate: true,
      message: {
        bn: 'হালকা তাপমাত্রা - ফ্যান নিম্ন গতিতে',
        en: 'Mild temperature - Fan at low speed',
      },
    };
  }
  return {
    speed: 'OFF',
    shouldActivate: false,
    message: {
      bn: 'স্বাভাবিক তাপমাত্রা - ফ্যান বন্ধ',
      en: 'Normal temperature - Fan off',
    },
  };
}

export function getFanSpeedColor(speed: FanSpeed): string {
  switch (speed) {
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

export function getFanSpeedBgColor(speed: FanSpeed): string {
  switch (speed) {
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
