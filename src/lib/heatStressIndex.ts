/**
 * Heat Stress Index (HSI) Calculator for Poultry
 * 
 * Uses Temperature-Humidity Index (THI) formula commonly used for poultry:
 * THI = 0.8 × T + (RH/100) × (T - 14.4) + 46.4
 * 
 * Heat Stress Levels for Layer Chickens:
 * - Normal: HSI < 70
 * - Mild Stress: 70 ≤ HSI < 75
 * - Moderate Stress: 75 ≤ HSI < 80
 * - Severe Stress: 80 ≤ HSI < 85
 * - Emergency: HSI ≥ 85
 */

export type HeatStressLevel = 'normal' | 'mild' | 'moderate' | 'severe' | 'emergency';

export interface HeatStressResult {
  index: number;
  level: HeatStressLevel;
  shouldActivateFan: boolean;
  shouldAlert: boolean;
  alertSeverity: 'warning' | 'danger' | null;
  message: {
    bn: string;
    en: string;
  };
}

/**
 * Calculate Heat Stress Index from temperature and humidity
 * @param temperature - Temperature in Celsius
 * @param humidity - Relative humidity in percentage (0-100)
 * @returns HeatStressResult object with index, level, and recommended actions
 */
export function calculateHSI(temperature: number, humidity: number): HeatStressResult {
  // THI formula for poultry
  const hsi = 0.8 * temperature + (humidity / 100) * (temperature - 14.4) + 46.4;
  
  // Round to 1 decimal place
  const roundedHSI = Math.round(hsi * 10) / 10;
  
  // Determine stress level and actions
  if (roundedHSI < 70) {
    return {
      index: roundedHSI,
      level: 'normal',
      shouldActivateFan: false,
      shouldAlert: false,
      alertSeverity: null,
      message: {
        bn: 'স্বাভাবিক অবস্থা',
        en: 'Normal conditions'
      }
    };
  } else if (roundedHSI < 75) {
    return {
      index: roundedHSI,
      level: 'mild',
      shouldActivateFan: true,
      shouldAlert: false,
      alertSeverity: null,
      message: {
        bn: 'হালকা তাপ চাপ - ফ্যান চালু করুন',
        en: 'Mild heat stress - Turn on fans'
      }
    };
  } else if (roundedHSI < 80) {
    return {
      index: roundedHSI,
      level: 'moderate',
      shouldActivateFan: true,
      shouldAlert: true,
      alertSeverity: 'warning',
      message: {
        bn: 'মাঝারি তাপ চাপ - অতিরিক্ত বায়ু চলাচল প্রয়োজন',
        en: 'Moderate heat stress - Extra ventilation needed'
      }
    };
  } else if (roundedHSI < 85) {
    return {
      index: roundedHSI,
      level: 'severe',
      shouldActivateFan: true,
      shouldAlert: true,
      alertSeverity: 'danger',
      message: {
        bn: 'গুরুতর তাপ চাপ! জরুরি পদক্ষেপ নিন',
        en: 'Severe heat stress! Take immediate action'
      }
    };
  } else {
    return {
      index: roundedHSI,
      level: 'emergency',
      shouldActivateFan: true,
      shouldAlert: true,
      alertSeverity: 'danger',
      message: {
        bn: 'জরুরি অবস্থা! মুরগির জীবন ঝুঁকিতে',
        en: 'Emergency! Chicken lives at risk'
      }
    };
  }
}

/**
 * Get color for HSI level display
 */
export function getHSIColor(level: HeatStressLevel): string {
  switch (level) {
    case 'normal':
      return 'text-green-600';
    case 'mild':
      return 'text-yellow-600';
    case 'moderate':
      return 'text-orange-500';
    case 'severe':
      return 'text-red-500';
    case 'emergency':
      return 'text-red-700';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get background color for HSI level display
 */
export function getHSIBgColor(level: HeatStressLevel): string {
  switch (level) {
    case 'normal':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'mild':
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    case 'moderate':
      return 'bg-orange-100 dark:bg-orange-900/30';
    case 'severe':
      return 'bg-red-100 dark:bg-red-900/30';
    case 'emergency':
      return 'bg-red-200 dark:bg-red-900/50';
    default:
      return 'bg-muted';
  }
}

/**
 * Get Bengali label for HSI level
 */
export function getHSILabel(level: HeatStressLevel, language: 'bn' | 'en'): string {
  const labels = {
    normal: { bn: 'স্বাভাবিক', en: 'Normal' },
    mild: { bn: 'হালকা চাপ', en: 'Mild Stress' },
    moderate: { bn: 'মাঝারি চাপ', en: 'Moderate' },
    severe: { bn: 'গুরুতর', en: 'Severe' },
    emergency: { bn: 'জরুরি', en: 'Emergency' },
  };
  return labels[level][language];
}
