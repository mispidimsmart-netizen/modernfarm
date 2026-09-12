/**
 * Pure helpers for the System Health slice (no React / no Supabase).
 * Extracted so behaviour can be unit tested independently of the UI.
 */

export type SensorStatus = 'normal' | 'out_of_range' | 'no_data';

export interface SensorRange {
  min: number;
  max: number;
}

/** Normal operating ranges used to grade the latest sensor reading. */
export const SENSOR_RANGES = {
  temperature: { min: 15, max: 40 },
  humidity: { min: 30, max: 90 },
  ammonia: { min: 0, max: 30 },
  waterFlow: { min: 0, max: 500 },
} satisfies Record<string, SensorRange>;

/** Grades a single reading against its normal range. */
export function getSensorStatus(
  value: number | null | undefined,
  range: SensorRange,
): SensorStatus {
  if (value === null || value === undefined || Number.isNaN(value)) return 'no_data';
  if (value < range.min || value > range.max) return 'out_of_range';
  return 'normal';
}

/** Human readable uptime, e.g. `3d 4h` or `5h 12m`. */
export function formatUptime(seconds: number | null | undefined): string {
  if (!seconds) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export type ProblemIssueType =
  | 'device_offline'
  | 'power_outage'
  | 'critical_alert'
  | 'no_sensor_data';

export interface ProblemIssue {
  type: ProblemIssueType;
  detail?: string;
}

export interface ProblemUserEntry {
  userId: string;
  issues: ProblemIssue[];
}

/**
 * Merges the different problem signals into one entry per user.
 * Duplicate issue types are collapsed (except offline, which carries a detail).
 */
export function buildProblemMap(input: {
  offlineDevices?: Array<{ user_id: string; last_seen_at?: string | null }> | null;
  powerOutages?: Array<{ user_id: string }> | null;
  criticalAlerts?: Array<{ user_id: string }> | null;
  noSensorDataUserIds?: string[];
  formatLastSeen?: (iso: string) => string;
}): ProblemUserEntry[] {
  const map: Record<string, ProblemUserEntry> = {};
  const ensure = (userId: string) => {
    if (!map[userId]) map[userId] = { userId, issues: [] };
    return map[userId];
  };
  const addOnce = (userId: string, type: ProblemIssueType) => {
    const entry = ensure(userId);
    if (!entry.issues.some((i) => i.type === type)) entry.issues.push({ type });
  };

  input.offlineDevices?.forEach((d) => {
    const entry = ensure(d.user_id);
    entry.issues.push({
      type: 'device_offline',
      detail: d.last_seen_at && input.formatLastSeen ? input.formatLastSeen(d.last_seen_at) : undefined,
    });
  });
  input.powerOutages?.forEach((p) => addOnce(p.user_id, 'power_outage'));
  input.criticalAlerts?.forEach((a) => addOnce(a.user_id, 'critical_alert'));
  input.noSensorDataUserIds?.forEach((id) => addOnce(id, 'no_sensor_data'));

  return Object.values(map);
}
