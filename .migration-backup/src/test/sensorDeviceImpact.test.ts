import { describe, it, expect } from 'vitest';
import {
  statusFromSensors,
  buildDeviceTimeline,
  getDeviceStateAt,
  ALL_DEVICES,
  ALL_SENSORS,
  SENSOR_META,
  DEVICE_META,
} from '@/lib/sensorDeviceImpact';

describe('statusFromSensors', () => {
  it('critical wins over everything', () => {
    expect(statusFromSensors(36, 50, 10, 50).en).toBe('CRITICAL');
    expect(statusFromSensors(25, 50, 30, 50).en).toBe('CRITICAL');
    expect(statusFromSensors(25, 50, 10, 90).en).toBe('CRITICAL');
  });
  it('warning band', () => {
    expect(statusFromSensors(33, 50, 10, 50).en).toBe('WARNING');
    expect(statusFromSensors(25, 50, 22, 50).en).toBe('WARNING');
  });
  it('cold and humid bands', () => {
    expect(statusFromSensors(15, 50, 5, 40).en).toBe('COLD');
    expect(statusFromSensors(25, 90, 5, 40).en).toBe('HUMID');
  });
  it('normal otherwise', () => {
    expect(statusFromSensors(26, 60, 8, 60).en).toBe('NORMAL');
  });
});

describe('device timeline', () => {
  const cmds = [
    { command_type: 'fan', command_value: true, created_at: '2026-01-01T02:00:00Z' },
    { command_type: 'fan', command_value: false, created_at: '2026-01-01T01:00:00Z' },
    { command_type: 'unknown_device', command_value: true, created_at: '2026-01-01T01:30:00Z' },
    { command_type: 'heater', command_value: 1, created_at: '2026-01-01T03:00:00Z' },
  ];

  it('sorts chronologically and ignores unknown devices', () => {
    const t = buildDeviceTimeline(cmds);
    expect(Object.keys(t).sort()).toEqual([...ALL_DEVICES].sort());
    expect(t.fan.map((e) => e.on)).toEqual([false, true]);
    expect(t.unknown_device).toBeUndefined();
  });

  it('resolves state at a timestamp', () => {
    const t = buildDeviceTimeline(cmds);
    const at = (iso: string) => getDeviceStateAt(t.fan, new Date(iso).getTime());
    expect(at('2026-01-01T00:30:00Z')).toBe(false); // before any command
    expect(at('2026-01-01T01:30:00Z')).toBe(false);
    expect(at('2026-01-01T05:00:00Z')).toBe(true);
    expect(getDeviceStateAt(t.heater, new Date('2026-01-01T04:00:00Z').getTime())).toBe(true);
  });

  it('empty command list yields all-off devices', () => {
    const t = buildDeviceTimeline([]);
    ALL_DEVICES.forEach((d) => expect(getDeviceStateAt(t[d], Date.now())).toBe(false));
  });
});

describe('metadata completeness', () => {
  it('every sensor and device has bilingual labels', () => {
    ALL_SENSORS.forEach((s) => {
      expect(SENSOR_META[s].bn).toBeTruthy();
      expect(SENSOR_META[s].en).toBeTruthy();
    });
    ALL_DEVICES.forEach((d) => {
      expect(DEVICE_META[d].bn).toBeTruthy();
      expect(DEVICE_META[d].en).toBeTruthy();
    });
  });
});
