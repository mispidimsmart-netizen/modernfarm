import { describe, it, expect } from 'vitest';
import { detectSeason, detectProfile } from '@/lib/farmSetup';
import { FARM_TYPES, SEASONS, FARM_SIZES, PROFILES } from '@/data/farmSetupOptions';

describe('detectSeason', () => {
  it('defaults to summer when temperature is unknown', () => {
    expect(detectSeason(null, 60, 10)).toBe('summer');
    expect(detectSeason(0, 60, 10)).toBe('summer');
  });

  it('detects rainy from high rain probability', () => {
    expect(detectSeason(32, 70, 60)).toBe('rainy');
  });

  it('detects rainy from high humidity plus moderate rain chance', () => {
    expect(detectSeason(32, 90, 40)).toBe('rainy');
  });

  it('detects winter below 20C', () => {
    expect(detectSeason(15, 60, 0)).toBe('winter');
  });

  it('detects summer at or above 30C', () => {
    expect(detectSeason(31, 50, 0)).toBe('summer');
  });

  it('detects rainy for humid mid-range temperature', () => {
    expect(detectSeason(25, 85, 0)).toBe('rainy');
    expect(detectSeason(25, 50, 0)).toBe('summer');
  });
});

describe('detectProfile', () => {
  it('maps broiler age in days', () => {
    expect(detectProfile(5, 'broiler')).toBe('chick_care');
    expect(detectProfile(10, 'broiler')).toBe('chick_care');
    expect(detectProfile(11, 'broiler')).toBe('grower');
    expect(detectProfile(21, 'broiler')).toBe('grower');
    expect(detectProfile(30, 'broiler')).toBe('production');
  });

  it('maps layer age in weeks', () => {
    expect(detectProfile(28, 'layer')).toBe('chick_care'); // 4 weeks
    expect(detectProfile(35, 'layer')).toBe('grower'); // 5 weeks
    expect(detectProfile(126, 'layer')).toBe('grower'); // 18 weeks
    expect(detectProfile(140, 'layer')).toBe('production'); // 20 weeks
  });
});

describe('farm setup options', () => {
  it('exposes unique ids with bilingual names', () => {
    for (const list of [FARM_TYPES, SEASONS, FARM_SIZES, PROFILES]) {
      const ids = list.map(o => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const o of list) {
        expect(o.name.bn.length).toBeGreaterThan(0);
        expect(o.name.en.length).toBeGreaterThan(0);
      }
    }
  });

  it('has five care profiles including heat and cold protection', () => {
    expect(PROFILES.map(p => p.id)).toContain('heat_protection');
    expect(PROFILES.map(p => p.id)).toContain('cold_protection');
    expect(PROFILES).toHaveLength(5);
  });
});
