import { describe, it, expect } from 'vitest';
import {
  calculateFanSpeed,
  getFanSpeedColor,
  getFanSpeedBgColor,
  DEFAULT_FAN_SPEED_THRESHOLDS,
} from '@/lib/fanSpeed';

describe('calculateFanSpeed', () => {
  it('keeps fans off below the low threshold', () => {
    const r = calculateFanSpeed(26);
    expect(r.speed).toBe('OFF');
    expect(r.shouldActivate).toBe(false);
  });

  it('steps LOW / MEDIUM / HIGH at the documented boundaries', () => {
    expect(calculateFanSpeed(28).speed).toBe('LOW');
    expect(calculateFanSpeed(29.9).speed).toBe('LOW');
    expect(calculateFanSpeed(30).speed).toBe('MEDIUM');
    expect(calculateFanSpeed(32.9).speed).toBe('MEDIUM');
    expect(calculateFanSpeed(33).speed).toBe('HIGH');
    expect(calculateFanSpeed(41).speed).toBe('HIGH');
  });

  it('activates the fan for every non-OFF step', () => {
    for (const t of [28, 30, 33, 39]) {
      expect(calculateFanSpeed(t).shouldActivate).toBe(true);
    }
  });

  it('honours custom thresholds', () => {
    const thresholds = {
      ...DEFAULT_FAN_SPEED_THRESHOLDS,
      fanLowTempMin: 24,
      fanLowTempMax: 26,
      fanMediumTempMin: 26,
      fanMediumTempMax: 29,
      fanHighTempMin: 29,
    };
    expect(calculateFanSpeed(25, thresholds).speed).toBe('LOW');
    expect(calculateFanSpeed(29, thresholds).speed).toBe('HIGH');
  });

  it('exposes a bilingual message', () => {
    const r = calculateFanSpeed(35);
    expect(r.message.bn.length).toBeGreaterThan(0);
    expect(r.message.en.length).toBeGreaterThan(0);
  });
});

describe('fan speed display helpers', () => {
  it('returns a distinct class per speed', () => {
    const colors = (['OFF', 'LOW', 'MEDIUM', 'HIGH'] as const).map(getFanSpeedColor);
    expect(new Set(colors).size).toBe(4);
    const bgs = (['OFF', 'LOW', 'MEDIUM', 'HIGH'] as const).map(getFanSpeedBgColor);
    expect(new Set(bgs).size).toBe(4);
  });
});
