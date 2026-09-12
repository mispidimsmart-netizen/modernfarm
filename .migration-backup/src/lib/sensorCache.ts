/**
 * Sensor Cache & Freshness — PURE LOGIC (Single Source of Truth)
 *
 * Serialization for the offline-first localStorage sensor cache plus the
 * freshness classification used by every "live / stale / offline" badge.
 * No React — unit tested in src/test/sensorCache.test.ts.
 *
 * UI-only resilience layer: real safety decisions stay on the ESP32
 * (Hardware-as-Source-of-Truth).
 */

import type { SensorData } from '@/lib/types';

export const SENSOR_CACHE_KEY_PREFIX = 'farm_sensor_cache_v1::';

/** Reading younger than this is "fresh" (live). */
export const FRESH_MAX_AGE_MS = 60_000;
/** Reading younger than this (but not fresh) is "stale". Older => offline. */
export const STALE_MAX_AGE_MS = 5 * 60_000;

export interface CachedSensorData extends SensorData {
  /** epoch ms when written to localStorage */
  cachedAt: number;
}

export interface SerializedSensorCache {
  temperature: number;
  humidity: number;
  ammonia: number;
  waterUsage: number;
  timestamp: string; // ISO
  cachedAt: number;
}

export type SensorFreshness = 'fresh' | 'stale' | 'offline' | 'unknown';

export function sensorCacheKey(userId: string | null | undefined): string | null {
  return userId ? `${SENSOR_CACHE_KEY_PREFIX}${userId}` : null;
}

export function serializeSensorCache(data: SensorData, cachedAt: number = Date.now()): SerializedSensorCache {
  return {
    temperature: Number(data.temperature) || 0,
    humidity: Number(data.humidity) || 0,
    ammonia: Number(data.ammonia) || 0,
    waterUsage: Number(data.waterUsage) || 0,
    timestamp: (data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp)).toISOString(),
    cachedAt,
  };
}

/** Tolerates missing/corrupt payloads by returning null. */
export function deserializeSensorCache(raw: string | null): CachedSensorData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SerializedSensorCache;
    if (!parsed || typeof parsed !== 'object' || !parsed.timestamp) return null;
    const timestamp = new Date(parsed.timestamp);
    if (Number.isNaN(timestamp.getTime())) return null;
    return {
      temperature: Number(parsed.temperature) || 0,
      humidity: Number(parsed.humidity) || 0,
      ammonia: Number(parsed.ammonia) || 0,
      waterUsage: Number(parsed.waterUsage) || 0,
      timestamp,
      cachedAt: Number(parsed.cachedAt) || 0,
    };
  } catch {
    return null;
  }
}

export function classifyFreshness(
  timestamp: Date | null | undefined,
  now: number = Date.now()
): SensorFreshness {
  if (!timestamp) return 'unknown';
  const age = now - timestamp.getTime();
  if (age < FRESH_MAX_AGE_MS) return 'fresh';
  if (age < STALE_MAX_AGE_MS) return 'stale';
  return 'offline';
}
