/**
 * device_status column maps + pure readers.
 *
 * Cloud writes `desired_*` ONLY; ESP32 owns the actual `*_on` columns.
 * These maps are the single source of truth for that mapping so the Control
 * page, timer hydration and the cron-expiry logic can never drift apart.
 */

export type DeviceKey =
  | 'fan'
  | 'light'
  | 'alarm'
  | 'heater'
  | 'circulation_fan'
  | 'fogger'
  | 'ceiling_fan'
  | 'sprinkler';

/** Cloud-writable intent columns. */
export const DESIRED_COL_MAP: Record<DeviceKey, string> = {
  fan: 'desired_fan_on',
  light: 'desired_light_on',
  alarm: 'desired_alarm_on',
  heater: 'desired_heater_on',
  circulation_fan: 'desired_circulation_fan_on',
  fogger: 'desired_fogger_on',
  ceiling_fan: 'desired_ceiling_fan_on',
  sprinkler: 'desired_sprinkler_on',
};

/** Expiry timestamps paired 1:1 with DESIRED_COL_MAP. */
export const EXPIRES_COL_MAP: Record<DeviceKey, string> = {
  fan: 'desired_fan_expires_at',
  light: 'desired_light_expires_at',
  alarm: 'desired_alarm_expires_at',
  heater: 'desired_heater_expires_at',
  circulation_fan: 'desired_circulation_fan_expires_at',
  fogger: 'desired_fogger_expires_at',
  ceiling_fan: 'desired_ceiling_fan_expires_at',
  sprinkler: 'desired_sprinkler_expires_at',
};

/** Hardware-reported actual state columns (written by ESP32 only). */
export const ACTUAL_COL_MAP: Record<DeviceKey, string> = {
  fan: 'fan_on',
  light: 'light_on',
  alarm: 'alarm_on',
  heater: 'heater_on',
  circulation_fan: 'circulation_fan_on',
  fogger: 'fogger_on',
  ceiling_fan: 'ceiling_fan_on',
  sprinkler: 'sprinkler_on',
};

/** Read the hardware-confirmed state for a device. Unknown keys → false. */
export function readActualStatus(
  row: Record<string, unknown> | null | undefined,
  deviceKey: string,
): boolean {
  if (!row) return false;
  const col = ACTUAL_COL_MAP[deviceKey as DeviceKey];
  return col ? !!row[col] : false;
}

export interface RestoredTimer {
  endTime: number;
  duration: number;
}

/**
 * Rebuild active override timers from persisted `desired_*_expires_at` values.
 * Already-expired or unparseable timestamps are ignored.
 */
export function restoreTimersFromRow(
  row: Record<string, unknown> | null | undefined,
  now: number = Date.now(),
): Record<string, RestoredTimer> {
  const restored: Record<string, RestoredTimer> = {};
  if (!row) return restored;
  (Object.entries(EXPIRES_COL_MAP) as [DeviceKey, string][]).forEach(([deviceKey, colName]) => {
    const raw = row[colName];
    if (!raw) return;
    const end = new Date(raw as string).getTime();
    if (!Number.isFinite(end) || end <= now) return;
    restored[deviceKey] = { endTime: end, duration: Math.ceil((end - now) / 60000) };
  });
  return restored;
}

/** `mm:ss` remaining, or null when no timer is active. */
export function formatRemaining(endTime: number | undefined, now: number = Date.now()): string | null {
  if (!endTime) return null;
  const remaining = Math.max(0, endTime - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
