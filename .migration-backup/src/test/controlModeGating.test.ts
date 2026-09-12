/**
 * Regression tests for the Auto/Manual × Safety Engine matrix used in
 * ControlPage. Locks in the invariants so future refactors don't silently
 * regress the safety semantics.
 */
import { describe, it, expect } from 'vitest';
import {
  canUserCommand,
  isDeviceSafetyLocked,
  isGasProtectionActive,
  isHeatProtectionActive,
  shouldClearOnTimerExpiry,
  shouldCloudApplySafetyAutomation,
  shouldShowSafetyLockedPanel,
  type SafetyContext,
} from '@/lib/controlModeGating';

const base = (over: Partial<SafetyContext> = {}): SafetyContext => ({
  mode: 'AUTO',
  safetyEngineEnabled: true,
  temperature: 28,
  ammonia: 10,
  temperatureMax: 32,
  ammoniaMax: 25,
  ...over,
});

describe('ControlPage gating — Safety Engine ON', () => {
  it('flags heat protection when temp exceeds max', () => {
    expect(isHeatProtectionActive(base({ temperature: 40 }))).toBe(true);
    expect(isHeatProtectionActive(base({ temperature: 30 }))).toBe(false);
  });

  it('flags gas protection when ammonia exceeds max', () => {
    expect(isGasProtectionActive(base({ ammonia: 40 }))).toBe(true);
    expect(isGasProtectionActive(base({ ammonia: 20 }))).toBe(false);
  });

  it('locks cooling devices during heat stress', () => {
    const ctx = base({ temperature: 40 });
    expect(isDeviceSafetyLocked('fan', ctx)).toBe(true);
    expect(isDeviceSafetyLocked('fogger', ctx)).toBe(true);
    expect(isDeviceSafetyLocked('sprinkler', ctx)).toBe(true);
    expect(isDeviceSafetyLocked('heater', ctx)).toBe(false);
    expect(isDeviceSafetyLocked('light', ctx)).toBe(false);
  });

  it('locks fans during ammonia purge but not fogger/sprinkler', () => {
    const ctx = base({ ammonia: 40 });
    expect(isDeviceSafetyLocked('fan', ctx)).toBe(true);
    expect(isDeviceSafetyLocked('circulation_fan', ctx)).toBe(true);
    expect(isDeviceSafetyLocked('fogger', ctx)).toBe(false);
    expect(isDeviceSafetyLocked('sprinkler', ctx)).toBe(false);
  });

  it('blocks OFF commands on safety-locked devices, allows ON', () => {
    const ctx = base({ temperature: 40 });
    expect(canUserCommand('fan', ctx, 'off')).toBe(false);
    expect(canUserCommand('fan', ctx, 'on')).toBe(true);
    expect(canUserCommand('heater', ctx, 'off')).toBe(true);
  });

  it('keeps device running when timer expires under active protection', () => {
    const ctx = base({ temperature: 40 });
    expect(shouldClearOnTimerExpiry('fan', ctx)).toBe(false);
    expect(shouldClearOnTimerExpiry('heater', ctx)).toBe(true);
  });

  it('shows Safety Locked Devices panel', () => {
    expect(shouldShowSafetyLockedPanel(true)).toBe(true);
  });
});

describe('ControlPage gating — Safety Engine OFF', () => {
  it('never flags heat/gas protection', () => {
    const ctx = base({ safetyEngineEnabled: false, temperature: 45, ammonia: 60 });
    expect(isHeatProtectionActive(ctx)).toBe(false);
    expect(isGasProtectionActive(ctx)).toBe(false);
  });

  it('never safety-locks any device', () => {
    const ctx = base({ safetyEngineEnabled: false, temperature: 45, ammonia: 60 });
    for (const key of ['fan', 'fogger', 'sprinkler', 'heater', 'light', 'circulation_fan'] as const) {
      expect(isDeviceSafetyLocked(key, ctx)).toBe(false);
      expect(canUserCommand(key, ctx, 'off')).toBe(true);
    }
  });

  it('clears desired_* on timer expiry even in dangerous conditions', () => {
    const ctx = base({ safetyEngineEnabled: false, temperature: 45 });
    expect(shouldClearOnTimerExpiry('fan', ctx)).toBe(true);
  });

  it('hides the Safety Locked Devices panel', () => {
    expect(shouldShowSafetyLockedPanel(false)).toBe(false);
  });
});

describe('Cloud safety automation gate (Auto/Manual × Engine)', () => {
  const cases: Array<{
    mode: 'AUTO' | 'MANUAL';
    engine: boolean;
    expected: boolean;
    label: string;
  }> = [
    { mode: 'AUTO', engine: true, expected: true, label: 'AUTO + engine ON → apply' },
    { mode: 'AUTO', engine: false, expected: false, label: 'AUTO + engine OFF → skip' },
    { mode: 'MANUAL', engine: true, expected: false, label: 'MANUAL + engine ON → skip' },
    { mode: 'MANUAL', engine: false, expected: false, label: 'MANUAL + engine OFF → skip' },
  ];

  for (const c of cases) {
    it(c.label, () => {
      expect(
        shouldCloudApplySafetyAutomation({ mode: c.mode, safetyEngineEnabled: c.engine }),
      ).toBe(c.expected);
    });
  }
});

describe('Full 2×2 device-command matrix (fan under heat stress)', () => {
  const scenarios: Array<{
    mode: 'AUTO' | 'MANUAL';
    engine: boolean;
    canStopFan: boolean;
  }> = [
    { mode: 'AUTO', engine: true, canStopFan: false }, // locked
    { mode: 'AUTO', engine: false, canStopFan: true }, // engine off → unlocked
    { mode: 'MANUAL', engine: true, canStopFan: false }, // still locked by client-side safety
    { mode: 'MANUAL', engine: false, canStopFan: true }, // raw manual control
  ];

  for (const s of scenarios) {
    it(`mode=${s.mode} engine=${s.engine} → canStopFan=${s.canStopFan}`, () => {
      const ctx = base({
        mode: s.mode,
        safetyEngineEnabled: s.engine,
        temperature: 40,
      });
      expect(canUserCommand('fan', ctx, 'off')).toBe(s.canStopFan);
      expect(canUserCommand('fan', ctx, 'on')).toBe(true);
    });
  }
});
