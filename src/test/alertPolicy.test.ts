import { describe, it, expect } from 'vitest';
import {
  isQuietHours,
  isCooldownElapsed,
  shouldPlaySound,
  mapAlertLevelToPriority,
  mapEmergencyPriority,
  groupAlerts,
  sortAlerts,
  countAlertsByLevel,
  pickCriticalAlert,
  areAlertListsEquivalent,
  filterRowsByChannelStatus,
  matchesChannelStatus,
  ALERT_COOLDOWNS,
  type SmartAlert,
  type AlertLevel,
} from '@/lib/alertPolicy';
import { getAlertTemplate, ALERT_TEMPLATES } from '@/lib/alertTemplates';

function alert(overrides: Partial<SmartAlert> & { id: string; level: AlertLevel }): SmartAlert {
  return {
    type: 'high_temperature',
    title: 'T',
    titleBn: 'ট',
    message: 'm',
    messageBn: 'ম',
    suggestion: 's',
    suggestionBn: 'স',
    timestamp: new Date('2026-01-01T10:00:00Z'),
    acknowledged: false,
    priority: mapAlertLevelToPriority(overrides.level),
    ...overrides,
  } as SmartAlert;
}

describe('quiet hours', () => {
  it('is quiet at 23:00 and 05:00 (spans midnight)', () => {
    expect(isQuietHours(new Date(2026, 0, 1, 23, 0))).toBe(true);
    expect(isQuietHours(new Date(2026, 0, 1, 5, 0))).toBe(true);
  });
  it('is not quiet at 06:00 or 21:59', () => {
    expect(isQuietHours(new Date(2026, 0, 1, 6, 0))).toBe(false);
    expect(isQuietHours(new Date(2026, 0, 1, 21, 59))).toBe(false);
  });
});

describe('cooldown gating', () => {
  it('blocks repeats inside the level cooldown', () => {
    expect(isCooldownElapsed('danger', 1000, 1000 + ALERT_COOLDOWNS.danger - 1)).toBe(false);
    expect(isCooldownElapsed('danger', 1000, 1000 + ALERT_COOLDOWNS.danger)).toBe(true);
  });
  it('info has the longest cooldown, danger the shortest', () => {
    expect(ALERT_COOLDOWNS.info).toBeGreaterThan(ALERT_COOLDOWNS.warning);
    expect(ALERT_COOLDOWNS.warning).toBeGreaterThan(ALERT_COOLDOWNS.danger);
  });
});

describe('sound policy', () => {
  it('danger plays even during quiet hours', () => {
    expect(shouldPlaySound('danger', { lastSoundAt: 0, now: 60_000, quietHours: true })).toBe(true);
  });
  it('warning is silenced during quiet hours', () => {
    expect(shouldPlaySound('warning', { lastSoundAt: 0, now: 600_000, quietHours: true })).toBe(false);
  });
  it('info is always silent', () => {
    expect(shouldPlaySound('info', { lastSoundAt: 0, now: 9e9, quietHours: false })).toBe(false);
  });
  it('throttles repeated danger alarms within 30s', () => {
    expect(shouldPlaySound('danger', { lastSoundAt: 0, now: 29_000, quietHours: false })).toBe(false);
  });
});

describe('priority mapping', () => {
  it('maps levels', () => {
    expect(mapAlertLevelToPriority('info')).toBe('normal');
    expect(mapAlertLevelToPriority('warning')).toBe('important');
    expect(mapAlertLevelToPriority('danger')).toBe('critical');
    expect(mapAlertLevelToPriority('nonsense')).toBe('normal');
  });
  it('maps emergency priorities', () => {
    expect(mapEmergencyPriority('LIFE_THREATENING')).toBe('critical');
    expect(mapEmergencyPriority('CRITICAL')).toBe('urgent');
    expect(mapEmergencyPriority('x')).toBe('normal');
  });
});

describe('grouping and sorting', () => {
  it('keeps two or fewer alerts ungrouped', () => {
    const out = groupAlerts([alert({ id: 'a', level: 'warning' }), alert({ id: 'b', level: 'warning' })]);
    expect(out).toHaveLength(2);
  });
  it('collapses 3+ same-level alerts in the same bucket', () => {
    const out = groupAlerts([
      alert({ id: 'a', level: 'warning' }),
      alert({ id: 'b', level: 'warning' }),
      alert({ id: 'c', level: 'warning' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].childAlerts).toHaveLength(3);
    expect(out[0].titleBn).toContain('৩ বার'.replace('৩', '3'));
  });
  it('sorts danger before warning before info', () => {
    const out = sortAlerts([
      alert({ id: 'i', level: 'info' }),
      alert({ id: 'd', level: 'danger' }),
      alert({ id: 'w', level: 'warning' }),
    ]);
    expect(out.map((a) => a.id)).toEqual(['d', 'w', 'i']);
  });
});

describe('counts and selection', () => {
  const list = [alert({ id: 'd', level: 'danger' }), alert({ id: 'w', level: 'warning' })];
  it('counts by level', () => {
    expect(countAlertsByLevel(list)).toEqual({ danger: 1, warning: 1, info: 0, total: 2 });
  });
  it('picks danger as the critical alert', () => {
    expect(pickCriticalAlert(list)?.id).toBe('d');
  });
  it('returns undefined for an empty list', () => {
    expect(pickCriticalAlert([])).toBeUndefined();
  });
});

describe('list equivalence', () => {
  it('treats identical content as equal', () => {
    expect(areAlertListsEquivalent([alert({ id: 'a', level: 'info' })], [alert({ id: 'a', level: 'info' })])).toBe(true);
  });
  it('detects acknowledgement change', () => {
    expect(
      areAlertListsEquivalent(
        [alert({ id: 'a', level: 'info' })],
        [alert({ id: 'a', level: 'info', acknowledged: true })],
      ),
    ).toBe(false);
  });
});

describe('delivery channel filtering', () => {
  const rows = [
    { deliveries: [{ status: 'sent' }] },
    { deliveries: [{ status: 'failed' }] },
    { deliveries: [{ status: 'skipped_quiet_hours' }] },
  ];
  it('matches skipped by prefix', () => {
    expect(matchesChannelStatus('skipped_quiet_hours', 'skipped')).toBe(true);
    expect(matchesChannelStatus('sent', 'skipped')).toBe(false);
  });
  it('returns all rows for "all" or undefined', () => {
    expect(filterRowsByChannelStatus(rows, 'all')).toHaveLength(3);
    expect(filterRowsByChannelStatus(rows, undefined)).toHaveLength(3);
  });
  it('filters failed only', () => {
    expect(filterRowsByChannelStatus(rows, 'failed')).toHaveLength(1);
  });
});

describe('alert templates', () => {
  it('falls back to sensor_failure for unknown types', () => {
    expect(getAlertTemplate('does_not_exist')).toBe(ALERT_TEMPLATES.sensor_failure);
  });
  it('renders bilingual copy for every template', () => {
    Object.values(ALERT_TEMPLATES).forEach((t) => {
      expect(t.title.bn.length).toBeGreaterThan(0);
      expect(t.getMessage({}).bn.length).toBeGreaterThan(0);
      expect(t.getSuggestion().bn.length).toBeGreaterThan(0);
      expect(['info', 'warning', 'danger']).toContain(t.level);
    });
  });
});
