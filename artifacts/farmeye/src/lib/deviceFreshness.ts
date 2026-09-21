/**
 * Single source of truth for "is this device online?".
 *
 * Every page used to carry its own freshness threshold (2 min here, 5 min
 * there, 10 min in the automation path), so the same board could read online on
 * the dashboard and offline on the control page. All UI must use these helpers.
 */

/** A board syncs at least once per minute; 2 minutes of silence = offline. */
export const DEVICE_ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

/** Cloud sync considered stale after this (shown as a warning, not offline). */
export const CLOUD_SYNC_STALE_MS = 5 * 60 * 1000;

/** Telemetry older than this must never drive a decision or a live reading. */
export const SENSOR_FRESHNESS_MS = 5 * 60 * 1000;

export function isFresh(timestamp: string | null | undefined, thresholdMs: number, now = Date.now()): boolean {
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t < thresholdMs;
}

/**
 * Unified online check: the device must claim to be online AND have reported
 * within the shared threshold.
 */
export function isDeviceOnline(
  device: { is_online?: boolean | null; last_seen_at?: string | null } | null | undefined,
  now = Date.now(),
): boolean {
  if (!device) return false;
  if (device.is_online === false) return false;
  return isFresh(device.last_seen_at, DEVICE_ONLINE_THRESHOLD_MS, now);
}

export function isCloudSyncStale(lastCloudSync: string | null | undefined, now = Date.now()): boolean {
  return !isFresh(lastCloudSync, CLOUD_SYNC_STALE_MS, now);
}
