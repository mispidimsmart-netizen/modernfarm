import { describe, it, expect } from 'vitest';
import {
  DESIRED_COL_MAP,
  EXPIRES_COL_MAP,
  ACTUAL_COL_MAP,
  readActualStatus,
  restoreTimersFromRow,
  formatRemaining,
} from '@/lib/deviceColumns';
import { BROILER_DEVICES, LAYER_DEVICES, getControlDevices } from '@/data/controlDevices';

describe('device column maps', () => {
  it('keeps desired/expires/actual maps in 1:1 sync', () => {
    const keys = Object.keys(DESIRED_COL_MAP).sort();
    expect(Object.keys(EXPIRES_COL_MAP).sort()).toEqual(keys);
    expect(Object.keys(ACTUAL_COL_MAP).sort()).toEqual(keys);
  });

  it('never maps a cloud-writable column onto an actual column', () => {
    Object.values(DESIRED_COL_MAP).forEach((col) => {
      expect(Object.values(ACTUAL_COL_MAP)).not.toContain(col);
    });
  });
});

describe('readActualStatus', () => {
  it('reads hardware columns only', () => {
    const row = { fan_on: true, desired_fan_on: false, heater_on: false };
    expect(readActualStatus(row, 'fan')).toBe(true);
    expect(readActualStatus(row, 'heater')).toBe(false);
  });

  it('returns false for unknown keys or missing rows', () => {
    expect(readActualStatus(null, 'fan')).toBe(false);
    expect(readActualStatus({ fan_on: true }, 'nope')).toBe(false);
  });
});

describe('restoreTimersFromRow', () => {
  const now = 1_700_000_000_000;

  it('restores future timers with rounded-up minutes', () => {
    const row = { desired_fan_expires_at: new Date(now + 5 * 60000).toISOString() };
    const timers = restoreTimersFromRow(row, now);
    expect(timers.fan.duration).toBe(5);
    expect(timers.fan.endTime).toBe(now + 5 * 60000);
  });

  it('ignores expired and invalid timestamps', () => {
    const row = {
      desired_fan_expires_at: new Date(now - 1000).toISOString(),
      desired_light_expires_at: 'not-a-date',
      desired_heater_expires_at: null,
    };
    expect(restoreTimersFromRow(row, now)).toEqual({});
  });

  it('handles a missing row', () => {
    expect(restoreTimersFromRow(undefined, now)).toEqual({});
  });
});

describe('formatRemaining', () => {
  const now = 1_700_000_000_000;
  it('formats mm:ss and clamps at zero', () => {
    expect(formatRemaining(now + 65_000, now)).toBe('1:05');
    expect(formatRemaining(now - 5_000, now)).toBe('0:00');
    expect(formatRemaining(undefined, now)).toBeNull();
  });
});

describe('control device catalogs', () => {
  it('includes the circulation fan in both farm types', () => {
    expect(BROILER_DEVICES.map(d => d.key)).toContain('circulation_fan');
    expect(LAYER_DEVICES.map(d => d.key)).toContain('circulation_fan');
  });

  it('has unique keys backed by desired columns', () => {
    [BROILER_DEVICES, LAYER_DEVICES].forEach((list) => {
      const keys = list.map(d => d.key);
      expect(new Set(keys).size).toBe(keys.length);
      keys.forEach(k => expect(DESIRED_COL_MAP[k as keyof typeof DESIRED_COL_MAP]).toBeTruthy());
    });
  });

  it('prioritises heater first for broilers', () => {
    expect(BROILER_DEVICES[0].key).toBe('heater');
    expect(getControlDevices(true)).toBe(BROILER_DEVICES);
    expect(getControlDevices(false)).toBe(LAYER_DEVICES);
  });
});
