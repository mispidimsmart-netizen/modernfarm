import { describe, it, expect } from 'vitest';
import { calculateBirdAge, ageDaysFrom, calculateLayerAgeWeeks, DAY_MS } from '@/lib/birdAge';

const NOW = new Date('2026-08-08T12:00:00Z').getTime();
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY_MS).toISOString();

describe('ageDaysFrom', () => {
  it('floors elapsed days', () => {
    expect(ageDaysFrom(iso(10), NOW)).toBe(10);
    expect(ageDaysFrom(new Date(NOW - 1.9 * DAY_MS), NOW)).toBe(1);
  });
  it('clamps future dates to 0', () => {
    expect(ageDaysFrom(iso(-5), NOW)).toBe(0);
  });
  it('returns 0 for an invalid date', () => {
    expect(ageDaysFrom('not-a-date', NOW)).toBe(0);
  });
});

describe('calculateBirdAge', () => {
  it('derives weeks from days', () => {
    expect(calculateBirdAge(iso(0), NOW)).toEqual({ days: 0, weeks: 0 });
    expect(calculateBirdAge(iso(6), NOW)).toEqual({ days: 6, weeks: 0 });
    expect(calculateBirdAge(iso(7), NOW)).toEqual({ days: 7, weeks: 1 });
    expect(calculateBirdAge(iso(35), NOW)).toEqual({ days: 35, weeks: 5 });
  });
});

describe('calculateLayerAgeWeeks', () => {
  it('adds elapsed weeks to the age at batch start', () => {
    expect(calculateLayerAgeWeeks(iso(0), 18, NOW)).toBe(18);
    expect(calculateLayerAgeWeeks(iso(13), 18, NOW)).toBe(19);
    expect(calculateLayerAgeWeeks(iso(14), 18, NOW)).toBe(20);
  });
  it('never goes below the starting age', () => {
    expect(calculateLayerAgeWeeks(iso(-30), 18, NOW)).toBe(18);
  });
});
