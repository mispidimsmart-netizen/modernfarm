import { describe, it, expect } from 'vitest';
import {
  CAUSES,
  MED_TYPES,
  MED_UNITS,
  REASONS,
  optionLabel,
  mortalityRatePercent,
  stockTone,
  HEALTH_LABELS,
} from '@/lib/healthOptions';

describe('healthOptions', () => {
  it('resolves bilingual labels and falls back to raw value', () => {
    expect(optionLabel(CAUSES, 'heat_stress', 'bn')).toBe('গরম');
    expect(optionLabel(CAUSES, 'heat_stress', 'en')).toBe('Heat Stress');
    expect(optionLabel(CAUSES, 'martian_flu', 'en')).toBe('martian_flu');
    expect(optionLabel(CAUSES, null, 'bn')).toBe('—');
  });

  it('computes mortality rate safely', () => {
    expect(mortalityRatePercent(50, 1000)).toBe('5.00');
    expect(mortalityRatePercent(0, 1000)).toBe('0.00');
    expect(mortalityRatePercent(5, 0)).toBe('0');
    expect(mortalityRatePercent(5, null)).toBe('0');
  });

  it('classifies stock levels', () => {
    expect(stockTone(0, 100)).toBe('out');
    expect(stockTone(-3, 100)).toBe('out');
    expect(stockTone(10, 100)).toBe('low');
    expect(stockTone(50, 100)).toBe('ok');
  });

  it('has unique option values', () => {
    for (const list of [CAUSES, MED_TYPES, MED_UNITS, REASONS]) {
      const values = list.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('keeps every label bilingual', () => {
    for (const [key, val] of Object.entries(HEALTH_LABELS)) {
      expect(typeof val.bn, key).toBe('string');
      expect(typeof val.en, key).toBe('string');
      expect(val.bn.length, key).toBeGreaterThan(0);
    }
  });
});
