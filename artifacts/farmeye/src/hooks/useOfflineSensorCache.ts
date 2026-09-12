import { useEffect, useState, useCallback } from 'react';
import type { SensorData } from '@/lib/types';
import {
  classifyFreshness,
  deserializeSensorCache,
  sensorCacheKey,
  serializeSensorCache,
  type CachedSensorData,
  type SensorFreshness,
} from '@/lib/sensorCache';

/**
 * Offline-first sensor cache (React adapter).
 *
 * - Persists the last known SensorData per user to localStorage so the UI can
 *   show the most recent reading even when:
 *     • the browser itself is offline (no network), OR
 *     • the ESP32 is offline (no fresh INSERT into sensor_readings).
 * - On reconnect the live hook replaces the cached value and re-caches it.
 *
 * Pure serialization/freshness logic lives in @/lib/sensorCache.
 * UI-only resilience layer — safety decisions stay on the ESP32.
 */

export type { CachedSensorData, SensorFreshness };
export { classifyFreshness };

export function readCachedSensorData(userId: string | null | undefined): CachedSensorData | null {
  const key = sensorCacheKey(userId);
  if (!key || typeof window === 'undefined') return null;
  try {
    return deserializeSensorCache(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

export function writeCachedSensorData(
  userId: string | null | undefined,
  data: SensorData
): void {
  const key = sensorCacheKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(serializeSensorCache(data)));
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
