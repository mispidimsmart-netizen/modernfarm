import { describe, it, expect } from 'vitest';
import {
  SENSOR_RANGES,
  buildProblemMap,
  formatUptime,
  getSensorStatus,
} from '@/components/admin/health/healthUtils';

describe('getSensorStatus', () => {
  it('returns no_data for null/undefined/NaN', () => {
    expect(getSensorStatus(null, SENSOR_RANGES.temperature)).toBe('no_data');
    expect(getSensorStatus(undefined, SENSOR_RANGES.temperature)).toBe('no_data');
    expect(getSensorStatus(NaN, SENSOR_RANGES.temperature)).toBe('no_data');
  });

  it('grades in-range readings as normal', () => {
    expect(getSensorStatus(28, SENSOR_RANGES.temperature)).toBe('normal');
    expect(getSensorStatus(60, SENSOR_RANGES.humidity)).toBe('normal');
    expect(getSensorStatus(0, SENSOR_RANGES.ammonia)).toBe('normal');
  });

  it('flags out-of-range readings on both edges', () => {
    expect(getSensorStatus(14.9, SENSOR_RANGES.temperature)).toBe('out_of_range');
    expect(getSensorStatus(40.1, SENSOR_RANGES.temperature)).toBe('out_of_range');
    expect(getSensorStatus(31, SENSOR_RANGES.ammonia)).toBe('out_of_range');
    expect(getSensorStatus(501, SENSOR_RANGES.waterFlow)).toBe('out_of_range');
  });

  it('treats exact boundaries as normal', () => {
    expect(getSensorStatus(15, SENSOR_RANGES.temperature)).toBe('normal');
    expect(getSensorStatus(40, SENSOR_RANGES.temperature)).toBe('normal');
  });
});

describe('formatUptime', () => {
  it('returns dash for empty values', () => {
    expect(formatUptime(null)).toBe('-');
    expect(formatUptime(0)).toBe('-');
  });

  it('formats hours and minutes', () => {
    expect(formatUptime(3600 * 5 + 60 * 12)).toBe('5h 12m');
  });

  it('formats days beyond 24h', () => {
    expect(formatUptime(3600 * 76)).toBe('3d 4h');
  });
});

describe('buildProblemMap', () => {
  it('returns empty when no signals', () => {
    expect(buildProblemMap({})).toEqual([]);
  });

  it('merges multiple issue types per user', () => {
    const result = buildProblemMap({
      offlineDevices: [{ user_id: 'u1', last_seen_at: null }],
      powerOutages: [{ user_id: 'u1' }],
      criticalAlerts: [{ user_id: 'u2' }],
      noSensorDataUserIds: ['u1', 'u3'],
    });
    const u1 = result.find((r) => r.userId === 'u1')!;
    expect(u1.issues.map((i) => i.type).sort()).toEqual([
      'device_offline',
      'no_sensor_data',
      'power_outage',
    ]);
    expect(result.map((r) => r.userId).sort()).toEqual(['u1', 'u2', 'u3']);
  });

  it('deduplicates repeated non-offline issues', () => {
    const result = buildProblemMap({
      powerOutages: [{ user_id: 'u1' }, { user_id: 'u1' }],
      criticalAlerts: [{ user_id: 'u1' }, { user_id: 'u1' }],
    });
    expect(result[0].issues).toHaveLength(2);
  });

  it('attaches a formatted last-seen detail for offline devices', () => {
    const result = buildProblemMap({
      offlineDevices: [{ user_id: 'u1', last_seen_at: '2026-01-01T00:00:00Z' }],
      formatLastSeen: () => '২ ঘণ্টা আগে',
    });
    expect(result[0].issues[0].detail).toBe('২ ঘণ্টা আগে');
  });
});
