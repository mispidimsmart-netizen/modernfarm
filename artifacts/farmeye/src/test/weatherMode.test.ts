import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WEATHER_AUTO_MODE_CONFIG as CFG,
  determineWeatherMode,
  getReasonForMode,
  parseWeatherAutoModeConfig,
} from '@/lib/weatherMode';
import { SMART_MODE_PROFILES } from '@/lib/smartModeProfiles';

describe('determineWeatherMode', () => {
  it('returns normal in mild conditions', () => {
    expect(determineWeatherMode(25, 10, CFG)).toBe('normal');
  });

  it('returns summer at/above summer threshold', () => {
    expect(determineWeatherMode(32, 0, CFG)).toBe('summer');
    expect(determineWeatherMode(31.9, 0, CFG)).toBe('normal');
  });

  it('returns winter at/below winter threshold', () => {
    expect(determineWeatherMode(18, 0, CFG)).toBe('winter');
    expect(determineWeatherMode(18.1, 0, CFG)).toBe('normal');
  });

  it('returns rainy above rain threshold', () => {
    expect(determineWeatherMode(25, 60, CFG)).toBe('rainy');
  });

  it('emergency outranks rain and summer', () => {
    expect(determineWeatherMode(38, 95, CFG)).toBe('emergency');
    expect(determineWeatherMode(40, 0, CFG)).toBe('emergency');
  });

  it('rain outranks summer but not emergency', () => {
    expect(determineWeatherMode(34, 80, CFG)).toBe('rainy');
  });

  it('respects custom thresholds', () => {
    const custom = { ...CFG, summer_temp_threshold: 28, winter_temp_threshold: 22 };
    expect(determineWeatherMode(29, 0, custom)).toBe('summer');
    expect(determineWeatherMode(21, 0, custom)).toBe('winter');
  });
});

describe('getReasonForMode', () => {
  it('gives bn and en reasons', () => {
    expect(getReasonForMode('summer', 33, 0, CFG, 'en')).toContain('33');
    expect(getReasonForMode('rainy', 25, 70, CFG, 'bn')).toContain('70');
    expect(getReasonForMode('normal', 25, 0, CFG, 'en')).toBe('Normal weather conditions');
  });
});

describe('parseWeatherAutoModeConfig', () => {
  it('falls back to defaults for null/corrupt input', () => {
    expect(parseWeatherAutoModeConfig(null)).toEqual(CFG);
    expect(parseWeatherAutoModeConfig('{not json')).toEqual(CFG);
  });

  it('merges partial stored config over defaults', () => {
    const merged = parseWeatherAutoModeConfig(JSON.stringify({ enabled: false }));
    expect(merged.enabled).toBe(false);
    expect(merged.summer_temp_threshold).toBe(CFG.summer_temp_threshold);
  });
});

describe('smart mode profiles', () => {
  it('has a profile for every mode determineWeatherMode can return', () => {
    for (const mode of ['normal', 'summer', 'winter', 'rainy', 'emergency'] as const) {
      expect(SMART_MODE_PROFILES.find(p => p.id === mode)).toBeTruthy();
    }
  });

  it('keeps emergency thresholds strictest', () => {
    const emergency = SMART_MODE_PROFILES.find(p => p.id === 'emergency')!;
    const normal = SMART_MODE_PROFILES.find(p => p.id === 'normal')!;
    expect(emergency.settings.fan_high_temp_min).toBeLessThan(normal.settings.fan_high_temp_min);
    expect(emergency.settings.ammonia_max).toBeLessThan(normal.settings.ammonia_max);
  });
});
