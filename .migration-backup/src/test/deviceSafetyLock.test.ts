import { describe, it, expect } from 'vitest';
import { evaluateSafetyLock, COOLING_DEVICES } from '@/lib/deviceSafetyLock';
import { getDeviceColors } from '@/data/deviceColors';

const base = { temperature: 25, ammonia: 10, tempMax: 32, ammoniaMax: 25 };

describe('evaluateSafetyLock', () => {
  it('does not lock anything in normal conditions', () => {
    COOLING_DEVICES.forEach((key) => {
      expect(evaluateSafetyLock({ ...base, deviceKey: key }).isSafetyLocked).toBe(false);
    });
  });

  it('locks all cooling devices during heat stress', () => {
    COOLING_DEVICES.forEach((key) => {
      const r = evaluateSafetyLock({ ...base, deviceKey: key, temperature: 38 });
      expect(r.isSafetyLocked).toBe(true);
      expect(r.reason?.en).toContain('Heat stress');
    });
  });

  it('does not lock heater or light during heat stress', () => {
    expect(evaluateSafetyLock({ ...base, deviceKey: 'heater', temperature: 38 }).isSafetyLocked).toBe(false);
    expect(evaluateSafetyLock({ ...base, deviceKey: 'light', temperature: 38 }).isSafetyLocked).toBe(false);
  });

  it('locks only exhaust + circulation fan during gas purge', () => {
    const high = { ...base, ammonia: 40 };
    expect(evaluateSafetyLock({ ...high, deviceKey: 'fan' }).isSafetyLocked).toBe(true);
    expect(evaluateSafetyLock({ ...high, deviceKey: 'circulation_fan' }).isSafetyLocked).toBe(true);
    expect(evaluateSafetyLock({ ...high, deviceKey: 'fogger' }).isSafetyLocked).toBe(false);
    expect(evaluateSafetyLock({ ...high, deviceKey: 'fan' }).reason?.en).toContain('Gas purge');
  });

  it('never locks when the safety engine is disabled', () => {
    const r = evaluateSafetyLock({ ...base, deviceKey: 'fan', temperature: 40, ammonia: 60, engineEnabled: false });
    expect(r.isSafetyLocked).toBe(false);
  });

  it('treats undefined/null engine flag as enabled', () => {
    expect(evaluateSafetyLock({ ...base, deviceKey: 'fan', temperature: 40 }).isSafetyLocked).toBe(true);
    expect(evaluateSafetyLock({ ...base, deviceKey: 'fan', temperature: 40, engineEnabled: null }).isSafetyLocked).toBe(true);
  });

  it('uses strictly-greater-than threshold comparison', () => {
    expect(evaluateSafetyLock({ ...base, deviceKey: 'fan', temperature: 32 }).isSafetyLocked).toBe(false);
    expect(evaluateSafetyLock({ ...base, deviceKey: 'fan', temperature: 32.1 }).isSafetyLocked).toBe(true);
  });

  it('prefers the heat-stress message when both conditions trigger', () => {
    const r = evaluateSafetyLock({ ...base, deviceKey: 'fan', temperature: 40, ammonia: 60 });
    expect(r.reason?.en).toContain('Heat stress');
  });
});

describe('getDeviceColors', () => {
  it('returns a distinct scheme per known device', () => {
    expect(getDeviceColors('heater').activeBg).toBe('bg-orange-500');
    expect(getDeviceColors('circulation_fan').activeBg).toBe('bg-teal-500');
  });

  it('falls back for unknown devices', () => {
    expect(getDeviceColors('unknown').activeBg).toBe('bg-emerald-500');
  });
});
