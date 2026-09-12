import { describe, it, expect } from 'vitest';
import { formatDateBn, ageWeeksFromBatch, batchDurationDays } from '@/lib/layerBatch';
import { LAYER_BREEDS } from '@/data/layerBreeds';

describe('layerBatch helpers', () => {
  it('returns em-dash for empty/invalid dates', () => {
    expect(formatDateBn(null)).toBe('—');
    expect(formatDateBn(undefined)).toBe('—');
    expect(formatDateBn('not-a-date')).toBe('—');
  });

  it('formats a valid ISO date', () => {
    expect(formatDateBn('2026-01-15')).not.toBe('—');
  });

  it('adds full elapsed weeks to starting age', () => {
    expect(
      ageWeeksFromBatch({ start_date: '2026-01-01', age_at_start_weeks: 18 }, '2026-01-01')
    ).toBe(18);
    expect(
      ageWeeksFromBatch({ start_date: '2026-01-01', age_at_start_weeks: 18 }, '2026-01-08')
    ).toBe(19);
    expect(
      ageWeeksFromBatch({ start_date: '2026-01-01', age_at_start_weeks: 18 }, '2026-01-13')
    ).toBe(19);
  });

  it('never goes below starting age for future start dates', () => {
    expect(
      ageWeeksFromBatch({ start_date: '2026-06-01', age_at_start_weeks: 5 }, '2026-01-01')
    ).toBe(5);
  });

  it('computes batch duration in days', () => {
    expect(batchDurationDays('2026-01-01', '2026-01-31')).toBe(30);
    expect(batchDurationDays('2026-01-31', '2026-01-01')).toBe(0);
  });

  it('exposes unique layer breed values', () => {
    const values = LAYER_BREEDS.map((b) => b.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toContain('Hy-Line Brown');
  });
});
