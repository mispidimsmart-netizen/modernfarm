import { describe, it, expect } from 'vitest';
import { computeBatchStats, EMPTY_BATCH_STATS } from '@/api/broiler';

const batch = {
  start_date: '2026-01-01',
  breed: 'Cobb 500',
  initial_bird_count: 1000,
  current_bird_count: 950,
};
const now = new Date('2026-01-29T00:00:00Z'); // day 28

describe('computeBatchStats', () => {
  it('returns zeroed stats without a batch', () => {
    expect(computeBatchStats(null, [], [], now)).toEqual(EMPTY_BATCH_STATS);
  });

  it('derives age in days and weeks from the start date', () => {
    const s = computeBatchStats(batch, [], [], now);
    expect(s.ageDays).toBe(28);
    expect(s.ageWeeks).toBe(4);
  });

  it('uses the latest weight sample as current weight', () => {
    const s = computeBatchStats(
      batch,
      [{ average_weight_grams: 800 }, { average_weight_grams: 1500 }],
      [],
      now,
    );
    expect(s.currentWeight).toBe(1500);
  });

  it('sums feed quantities across records', () => {
    const s = computeBatchStats(batch, [], [{ quantity_kg: 120 }, { quantity_kg: 80.5 }], now);
    expect(s.totalFeedKg).toBeCloseTo(200.5);
  });

  it('computes FCR from survivor weight gain, not initial bird count', () => {
    const s = computeBatchStats(
      batch,
      [{ average_weight_grams: 1500 }],
      [{ quantity_kg: 2000 }],
      now,
    );
    // gain per survivor ≈ (1500 - chickWeight)/1000 kg, × 950 birds
    expect(s.fcr).toBeGreaterThan(0);
    expect(s.fcr).toBeLessThan(3);
  });

  it('reports mortality count and percentage', () => {
    const s = computeBatchStats(batch, [], [], now);
    expect(s.mortality).toBe(50);
    expect(s.mortalityPercent).toBeCloseTo(5);
  });

  it('caps weight progress at 150%', () => {
    const s = computeBatchStats(batch, [{ average_weight_grams: 99999 }], [], now);
    expect(s.weightProgress).toBe(150);
  });

  it('handles a zero-bird batch without dividing by zero', () => {
    const s = computeBatchStats(
      { ...batch, initial_bird_count: 0, current_bird_count: 0 },
      [],
      [],
      now,
    );
    expect(s.mortalityPercent).toBe(0);
    expect(Number.isFinite(s.fcr)).toBe(true);
  });
});
