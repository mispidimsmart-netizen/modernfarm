import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AUTOMATION,
  validateAutomationDefaults,
  isBlockingWarning,
} from '@/lib/calibration';

describe('calibration automation defaults', () => {
  it('defaults produce no warnings', () => {
    expect(validateAutomationDefaults(DEFAULT_AUTOMATION, 'bn')).toEqual([]);
    expect(validateAutomationDefaults(DEFAULT_AUTOMATION, 'en')).toEqual([]);
  });

  it('flags inverted temp range as blocking', () => {
    const w = validateAutomationDefaults({ ...DEFAULT_AUTOMATION, temp_min: 33 }, 'en');
    expect(w.some(isBlockingWarning)).toBe(true);
    expect(w.join(' ')).toContain('Min temp must be less than max');
  });

  it('flags heater ON >= OFF as blocking', () => {
    const w = validateAutomationDefaults({ ...DEFAULT_AUTOMATION, heater_on_temp: 26 }, 'en');
    expect(w.some((x) => x.includes('Heater ON must be less than OFF'))).toBe(true);
  });

  it('overlapping fan bands is advisory, not blocking', () => {
    const w = validateAutomationDefaults(
      { ...DEFAULT_AUTOMATION, fan_low_temp_max: 31, fan_medium_temp_min: 30 },
      'en',
    );
    expect(w.some((x) => x.includes('Fan speed ranges overlap'))).toBe(true);
    expect(w.filter(isBlockingWarning)).toEqual([]);
  });

  it('out-of-range ammonia and humidity produce advisory warnings', () => {
    const w = validateAutomationDefaults(
      { ...DEFAULT_AUTOMATION, ammonia_max: 50, humidity_min: 10, humidity_max: 99 },
      'en',
    );
    expect(w).toHaveLength(3);
    expect(w.every((x) => !isBlockingWarning(x))).toBe(true);
  });

  it('returns Bengali strings when language is bn', () => {
    const w = validateAutomationDefaults({ ...DEFAULT_AUTOMATION, temp_min: 33 }, 'bn');
    expect(w.join(' ')).toContain('সর্বনিম্ন');
  });
});
