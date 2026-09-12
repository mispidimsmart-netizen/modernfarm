/**
 * Weather Auto-Mode — PURE LOGIC (Single Source of Truth)
 *
 * Decides which smart-mode profile matches the current outdoor weather.
 * No React, no network, no side effects — safe to unit test and reuse
 * from hooks, edge functions or future automation code.
 *
 * NOTE: This is advisory/cloud-side only. The ESP32 remains the source of
 * truth for actual relay states (Hardware-as-Source-of-Truth).
 */

import type { SmartModeType } from './smartModeProfiles';

export interface WeatherAutoModeConfig {
  enabled: boolean;
  /** Above this outdoor temp (°C) => Summer Mode */
  summer_temp_threshold: number;
  /** Below/equal this outdoor temp (°C) => Winter Mode */
  winter_temp_threshold: number;
  /** Above this rain probability (%) => Rainy Mode */
  rain_probability_threshold: number;
  /** Above this outdoor temp (°C) => Emergency Mode */
  emergency_temp_threshold: number;
  last_auto_mode: SmartModeType | null;
  last_mode_change: string | null;
}

export const DEFAULT_WEATHER_AUTO_MODE_CONFIG: WeatherAutoModeConfig = {
  enabled: true,
  summer_temp_threshold: 32,
  winter_temp_threshold: 18,
  rain_probability_threshold: 60,
  emergency_temp_threshold: 38,
  last_auto_mode: null,
  last_mode_change: null,
};

/**
 * Priority order (highest first): emergency > rainy > summer > winter > normal.
 */
export function determineWeatherMode(
  temperature: number,
  rainProbability: number,
  config: WeatherAutoModeConfig
): SmartModeType {
  if (temperature >= config.emergency_temp_threshold) return 'emergency';
  if (rainProbability >= config.rain_probability_threshold) return 'rainy';
  if (temperature >= config.summer_temp_threshold) return 'summer';
  if (temperature <= config.winter_temp_threshold) return 'winter';
  return 'normal';
}

export function getReasonForMode(
  mode: SmartModeType,
  temp: number,
  rain: number,
  config: WeatherAutoModeConfig,
  lang: 'bn' | 'en'
): string {
  switch (mode) {
    case 'emergency':
      return lang === 'bn'
        ? `তাপমাত্রা ${temp}°C (>${config.emergency_temp_threshold}°C)`
        : `Temperature ${temp}°C (>${config.emergency_temp_threshold}°C)`;
    case 'summer':
      return lang === 'bn'
        ? `তাপমাত্রা ${temp}°C (>${config.summer_temp_threshold}°C)`
        : `Temperature ${temp}°C (>${config.summer_temp_threshold}°C)`;
    case 'winter':
      return lang === 'bn'
        ? `তাপমাত্রা ${temp}°C (<${config.winter_temp_threshold}°C)`
        : `Temperature ${temp}°C (<${config.winter_temp_threshold}°C)`;
    case 'rainy':
      return lang === 'bn'
        ? `বৃষ্টির সম্ভাবনা ${rain}% (>${config.rain_probability_threshold}%)`
        : `Rain probability ${rain}% (>${config.rain_probability_threshold}%)`;
    default:
      return lang === 'bn' ? 'স্বাভাবিক আবহাওয়া' : 'Normal weather conditions';
  }
}

/** Merge stored partial config with defaults, tolerating corrupt JSON. */
export function parseWeatherAutoModeConfig(raw: string | null): WeatherAutoModeConfig {
  if (!raw) return DEFAULT_WEATHER_AUTO_MODE_CONFIG;
  try {
    return { ...DEFAULT_WEATHER_AUTO_MODE_CONFIG, ...JSON.parse(raw) } as WeatherAutoModeConfig;
  } catch {
    return DEFAULT_WEATHER_AUTO_MODE_CONFIG;
  }
}
