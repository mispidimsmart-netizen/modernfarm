import { useEffect, useState, useCallback } from 'react';
import type { SensorData } from '@/lib/types';

/**
 * Offline-first sensor cache.
 *
 * - Persists the last known SensorData per user to localStorage so the UI can
 *   show the most recent reading even when:
 *     • the browser itself is offline (no network), OR
 *     • the ESP32 is offline (no fresh INSERT into sensor_readings).
 * - On reconnect (browser online + new realtime row arriving) the live hook
 *   will replace the cached value automatically and re-cache it.
 *
 * Note: this is a UI-only resilience layer. Actual safety decisions are made
 * by the ESP32 (Hardware-as-Source-of-Truth invariant).
 */

const KEY_PREFIX = 'farm_sensor_cache_v1::';

export interface CachedSensorData extends SensorData {
  cachedAt: number; // epoch ms when written to localStorage
}

interface SerializedCache {
  temperature: number;
  humidity: number;
  ammonia: number;
  waterUsage: number;
  timestamp: string; // ISO
  cachedAt: number;
}

function storageKey(userId: string | null | undefined) {
  return userId ? `${KEY_PREFIX}${userId}` : null;
}

export function readCachedSensorData(userId: string | null | undefined): CachedSensorData | null {
  const key = storageKey(userId);
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: SerializedCache = JSON.parse(raw);
    return {
      temperature: parsed.temperature,
      humidity: parsed.humidity,
      ammonia: parsed.ammonia,
      waterUsage: parsed.waterUsage,
      timestamp: new Date(parsed.timestamp),
      cachedAt: parsed.cachedAt,
    };
  } catch {
    return null;
  }
}

export function writeCachedSensorData(
  userId: string | null | undefined,
  data: SensorData
): void {
  const key = storageKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    const payload: SerializedCache = {
      temperature: Number(data.temperature) || 0,
      humidity: Number(data.humidity) || 0,
      ammonia: Number(data.ammonia) || 0,
      waterUsage: Number(data.waterUsage) || 0,
      timestamp: (data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp)).toISOString(),
      cachedAt: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage full / disabled — silently ignore (cache is best-effort).
  }
}

/**
 * Track whether the browser believes it currently has network connectivity.
 * Reflects the navigator.onLine flag plus online/offline events.
 */
export function useBrowserOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);
  return online;
}

/**
 * Sensor freshness classification based on age of the latest reading.
 * - fresh:   < 60s  (live)
 * - stale:   60s – 5m (probably ok, slight delay)
 * - offline: > 5m  (ESP32 likely down)
 */
export type SensorFreshness = 'fresh' | 'stale' | 'offline' | 'unknown';

export function classifyFreshness(timestamp: Date | null | undefined, now: number = Date.now()): SensorFreshness {
  if (!timestamp) return 'unknown';
  const age = now - timestamp.getTime();
  if (age < 60_000) return 'fresh';
  if (age < 5 * 60_000) return 'stale';
  return 'offline';
}

/**
 * Live "now" tick (every 30s) so freshness labels update without a full re-render
 * of the parent. Keeps re-renders cheap and predictable.
 */
export function useFreshnessNow(intervalMs: number = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Convenience hook bundling everything a consumer needs for offline-aware UI.
 */
export function useOfflineSensorCache(userId: string | null | undefined) {
  const browserOnline = useBrowserOnline();
  const now = useFreshnessNow();

  const read = useCallback(() => readCachedSensorData(userId), [userId]);
  const write = useCallback(
    (data: SensorData) => writeCachedSensorData(userId, data),
    [userId]
  );

  return { read, write, browserOnline, now, classifyFreshness };
}
