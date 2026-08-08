/**
 * Pure sensor → status-level derivation.
 *
 * Single source of truth shared by `useStatusLevels` (polling hook) and
 * `useRealtimeStatusLevels` (realtime hook). Keeping this pure makes the
 * thresholds unit-testable without React or Supabase.
 *
 * Behaviour is intentionally identical to the previous duplicated
 * implementations — do NOT change thresholds here without a farm-safety review.
 */
import type { SensorData, StatusLevel } from '@/lib/types';

export interface SensorThresholds {
  temperature_max?: number | string | null;
  temperature_min?: number | string | null;
  humidity_max?: number | string | null;
  humidity_min?: number | string | null;
  ammonia_max?: number | string | null;
}

export interface SensorStatusLevels {
  temperature: StatusLevel;
  humidity: StatusLevel;
  ammonia: StatusLevel;
  water: StatusLevel;
}

export function getTemperatureStatus(
  temperature: number,
  settings?: SensorThresholds | null
): StatusLevel {
  if (!settings) return 'normal';
  const tMax = Number(settings.temperature_max);
  const tMin = Number(settings.temperature_min);
  const t = Number(temperature);
  if (t > tMax + 5) return 'danger';
  if (t > tMax || t < tMin) return 'warning';
  return 'normal';
}

export function getHumidityStatus(
  humidity: number,
  settings?: SensorThresholds | null
): StatusLevel {
  if (!settings) return 'normal';
  const hMax = Number(settings.humidity_max);
  const hMin = Number(settings.humidity_min);
  const h = Number(humidity);
  if (h > hMax + 10 || h < hMin - 10) return 'danger';
  if (h > hMax || h < hMin) return 'warning';
  return 'normal';
}

export function getAmmoniaStatus(
  ammonia: number,
  settings?: SensorThresholds | null
): StatusLevel {
  if (!settings) return 'normal';
  const aMax = Number(settings.ammonia_max);
  const a = Number(ammonia);
  if (a > aMax + 10) return 'danger';
  if (a > aMax) return 'warning';
  return 'normal';
}

/** Water status is threshold-independent (litres/day heuristic). */
export function getWaterStatus(waterUsage: number): StatusLevel {
  const w = Number(waterUsage);
  if (w < 10) return 'danger';
  if (w < 20) return 'warning';
  return 'normal';
}

export function computeSensorStatusLevels(
  sensorData: Pick<SensorData, 'temperature' | 'humidity' | 'ammonia' | 'waterUsage'>,
  settings?: SensorThresholds | null
): SensorStatusLevels {
  return {
    temperature: getTemperatureStatus(sensorData.temperature, settings),
    humidity: getHumidityStatus(sensorData.humidity, settings),
    ammonia: getAmmoniaStatus(sensorData.ammonia, settings),
    water: getWaterStatus(sensorData.waterUsage),
  };
}
