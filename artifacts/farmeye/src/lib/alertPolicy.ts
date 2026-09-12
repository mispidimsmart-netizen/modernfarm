/**
 * Alert notification policy — pure SSOT (no React, no network, no clock coupling).
 *
 * Holds anti-spam cooldowns, quiet-hours rules, priority mapping, alert
 * grouping/sorting and delivery-history filtering used by the alert hooks.
 */

import type { AlertLevel } from './alertTemplates';

export type { AlertLevel };

export type NotificationPriority = 'normal' | 'important' | 'urgent' | 'critical';

export interface SmartAlert {
  id: string;
  type: string;
  level: AlertLevel;
  title: string;
  titleBn: string;
  message: string;
  messageBn: string;
  suggestion: string;
  suggestionBn: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  responseSeconds?: number;
  resolvedAt?: Date;
  groupId?: string;
  priority: NotificationPriority;
  childAlerts?: SmartAlert[];
}

/** Anti-spam cooldown per level (ms). */
export const ALERT_COOLDOWNS: Record<AlertLevel, number> = {
  info: 2 * 60 * 60 * 1000, // 2 hours
  warning: 30 * 60 * 1000, // 30 minutes
  danger: 2 * 60 * 1000, // 2 minutes
};

/** Repeat intervals for unresolved alerts (ms). 0 = never repeat. */
export const REPEAT_INTERVALS: Record<AlertLevel, number> = {
  info: 0,
  warning: 30 * 60 * 1000,
  danger: 2 * 60 * 1000,
};

/** Minimum gap between audible alarms per level (ms). */
export const SOUND_THROTTLE_MS: Record<AlertLevel, number> = {
  info: 0,
  warning: 60_000,
  danger: 30_000,
};

/** Quiet hours window (local clock hours), spans midnight. */
export const QUIET_HOURS = { start: 22, end: 6 };

/**
 * Sensor-derived alert types that must be suppressed while the ESP32 is
 * offline — their data is stale and the connection banner already warns.
 */
export const STALE_SUPPRESS_TYPES = new Set([
  'sensor_failure',
  'no_ventilation',
  'heat_stress',
  'temperature_rising',
]);

export function isQuietHours(now: Date = new Date()): boolean {
  const hour = now.getHours();
  if (QUIET_HOURS.start > QUIET_HOURS.end) {
    return hour >= QUIET_HOURS.start || hour < QUIET_HOURS.end;
  }
  return hour >= QUIET_HOURS.start && hour < QUIET_HOURS.end;
}

/** True when the anti-spam cooldown for this level has elapsed. */
export function isCooldownElapsed(level: AlertLevel, lastNotifiedAt: number, now: number): boolean {
  return now - lastNotifiedAt >= ALERT_COOLDOWNS[level];
}

/**
 * Decide whether an audible alarm should play.
 * Danger always plays (even during quiet hours); warning is silenced at night;
 * info is always silent.
 */
export function shouldPlaySound(
  level: AlertLevel,
  opts: { lastSoundAt: number; now: number; quietHours: boolean },
): boolean {
  if (level === 'info') return false;
  if (level === 'warning' && opts.quietHours) return false;
  return opts.now - opts.lastSoundAt > SOUND_THROTTLE_MS[level];
}

/** Map legacy alert severity levels to notification priorities. */
export function mapAlertLevelToPriority(level: string): NotificationPriority {
  switch (level) {
    case 'info':
      return 'normal';
    case 'warning':
      return 'important';
    case 'danger':
      return 'critical';
    default:
      return 'normal';
  }
}

/** Map emergency engine priorities to notification priorities. */
export function mapEmergencyPriority(priority: string): NotificationPriority {
  switch (priority) {
    case 'INFO':
      return 'normal';
    case 'WARNING':
      return 'important';
    case 'CRITICAL':
      return 'urgent';
    case 'LIFE_THREATENING':
      return 'critical';
    default:
      return 'normal';
  }
}

const LEVEL_ORDER: Record<AlertLevel, number> = { danger: 0, warning: 1, info: 2 };

/** Sort by severity first, then newest first. Returns a new array. */
export function sortAlerts(alerts: SmartAlert[]): SmartAlert[] {
  return [...alerts].sort((a, b) => {
    if (LEVEL_ORDER[a.level] !== LEVEL_ORDER[b.level]) {
      return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
}

/**
 * Collapse alerts of the same level that occurred within the same 5-minute
 * bucket into a single summary alert when there are more than two of them.
 */
export function groupAlerts(alerts: SmartAlert[]): SmartAlert[] {
  const grouped = new Map<string, SmartAlert[]>();

  alerts.forEach((alert) => {
    const groupKey = `${alert.level}_${Math.floor(alert.timestamp.getTime() / 300000)}`;
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey)!.push(alert);
  });

  const result: SmartAlert[] = [];
  grouped.forEach((group, key) => {
    if (group.length > 2) {
      const uniqueTypes = [...new Set(group.map((a) => a.type))];
      const uniqueTitles = [...new Set(group.map((a) => a.title))];
      const uniqueTitlesBn = [...new Set(group.map((a) => a.titleBn))];
      const isSameIssue = uniqueTypes.length === 1;

      result.push({
        ...group[0],
        id: `group_${key}`,
        groupId: key,
        title: isSameIssue
          ? `${group[0].title} (repeated ${group.length}×)`
          : `${uniqueTitles.length} types of issues (${group.length} total)`,
        titleBn: isSameIssue
          ? `${group[0].titleBn} (${group.length} বার)`
          : `${uniqueTitlesBn.length} ধরনের সমস্যা (মোট ${group.length}টি)`,
        message: isSameIssue ? group[0].message : uniqueTitles.join(' • '),
        messageBn: isSameIssue ? group[0].messageBn : uniqueTitlesBn.join(' • '),
        suggestion: isSameIssue ? group[0].suggestion : 'Check the most critical issues first',
        suggestionBn: isSameIssue
          ? group[0].suggestionBn
          : 'সবচেয়ে জরুরি সমস্যাগুলো আগে দেখুন',
        childAlerts: group,
      });
    } else {
      result.push(...group);
    }
  });

  return sortAlerts(result);
}

/** Counts of unacknowledged alerts by level. */
export function countAlertsByLevel(activeAlerts: SmartAlert[]) {
  return {
    danger: activeAlerts.filter((a) => a.level === 'danger').length,
    warning: activeAlerts.filter((a) => a.level === 'warning').length,
    info: activeAlerts.filter((a) => a.level === 'info').length,
    total: activeAlerts.length,
  };
}

/** Most critical active alert: danger > warning > first. */
export function pickCriticalAlert(activeAlerts: SmartAlert[]): SmartAlert | undefined {
  return (
    activeAlerts.find((a) => a.level === 'danger') ||
    activeAlerts.find((a) => a.level === 'warning') ||
    activeAlerts[0]
  );
}

/**
 * Cheap structural equality used to avoid re-rendering when an upstream query
 * hands back a new array with identical content.
 */
export function areAlertListsEquivalent(a: SmartAlert[], b: SmartAlert[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (p, i) =>
        p.id === b[i].id &&
        p.acknowledged === b[i].acknowledged &&
        p.level === b[i].level &&
        p.messageBn === b[i].messageBn,
    )
  );
}

export type DeliveryChannelStatus = 'all' | 'failed' | 'sent' | 'skipped';

/** Does a delivery row match the requested channel-status filter? */
export function matchesChannelStatus(status: string, filter: DeliveryChannelStatus): boolean {
  if (filter === 'all') return true;
  if (filter === 'skipped') return status.startsWith('skipped');
  return status === filter;
}

/** Filter alert history rows by the status of their delivery attempts. */
export function filterRowsByChannelStatus<T extends { deliveries: { status: string }[] }>(
  rows: T[],
  filter: DeliveryChannelStatus | undefined,
): T[] {
  if (!filter || filter === 'all') return rows;
  return rows.filter((r) => r.deliveries.some((d) => matchesChannelStatus(d.status, filter)));
}
