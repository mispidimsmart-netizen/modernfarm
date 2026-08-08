import { describe, it, expect } from 'vitest';
import {
  summarizeBatch,
  validateBatchEdit,
  buildBatchEditPayload,
  mergeTrendSeries,
  type BatchInputs,
} from '@/api/layer';

const batch = {
  initial_bird_count: 1000,
  current_bird_count: 900,
  age_at_start_weeks: 18,
  chick_cost_per_bird: 50,
};

const emptyInputs: BatchInputs = {
  eggs: [],
  mortalityRows: [],
  feed: [],
  inventory: [],
  expenses: [],
};

describe('summarizeBatch', () => {
  it('computes duration as at least one day', () => {
    const s = summarizeBatch(batch, emptyInputs, '2026-01-01', '2026-01-01');
    expect(s.duration_days).toBe(1);
  });

  it('sums eggs and derives layer FCR at 60g per egg', () => {
    const s = summarizeBatch(
      batch,
      { ...emptyInputs, eggs: [
        { production_date: '2026-01-02', total_eggs: 500 },
        { production_date: '2026-01-03', total_eggs: 500 },
      ], feed: [{ quantity_kg: 120 }] },
      '2026-01-01',
      '2026-01-10',
    );
    expect(s.total_eggs).toBe(1000);
    // egg mass = 1000 * 60g = 60kg → FCR = 120/60 = 2
    expect(s.fcr).toBe(2);
  });

  it('uses recorded mortality when it exceeds the initial−current difference', () => {
    const s = summarizeBatch(
      batch,
      { ...emptyInputs, mortalityRows: [
        { summary_date: '2026-01-02', mortality_count: 80 },
        { summary_date: '2026-01-03', mortality_count: 70 },
      ] },
      '2026-01-01',
      '2026-01-10',
    );
    expect(s.total_mortality).toBe(150); // recorded 150 > derived 100
    expect(s.mortality_percent).toBe(15);
  });

  it('falls back to the initial−current difference when day logs are missing', () => {
    const s = summarizeBatch(batch, emptyInputs, '2026-01-01', '2026-01-10');
    expect(s.total_mortality).toBe(100);
  });

  it('computes peak lay % against live birds on that date, capped at 100', () => {
    const s = summarizeBatch(
      batch,
      {
        ...emptyInputs,
        mortalityRows: [{ summary_date: '2026-01-02', mortality_count: 200 }],
        eggs: [{ production_date: '2026-01-03', total_eggs: 800 }],
      },
      '2026-01-01',
      '2026-01-10',
    );
    // live birds on 01-03 = 1000 - 200 = 800 → 100%
    expect(s.peak_production_percent).toBe(100);
  });

  it('reports peak age in weeks offset from the start age', () => {
    const s = summarizeBatch(
      batch,
      { ...emptyInputs, eggs: [{ production_date: '2026-01-15', total_eggs: 500 }] },
      '2026-01-01',
      '2026-02-01',
    );
    expect(s.peak_age_weeks).toBe(20); // 18 + floor(14/7)
  });

  it('prices feed with the quantity-weighted inventory average', () => {
    const s = summarizeBatch(
      batch,
      {
        ...emptyInputs,
        feed: [{ quantity_kg: 100 }],
        inventory: [
          { unit_price: 40, quantity_kg: 100 },
          { unit_price: 60, quantity_kg: 300 },
        ],
      },
      '2026-01-01',
      '2026-01-10',
    );
    // weighted avg = (40*100 + 60*300)/400 = 55 → 100kg * 55 = 5500
    expect(s.total_feed_cost).toBe(5500);
  });

  it('subtracts expenses, feed cost and chick cost from profit', () => {
    const s = summarizeBatch(
      batch,
      { ...emptyInputs, expenses: [{ amount: 2000 }] },
      '2026-01-01',
      '2026-01-10',
    );
    // 0 revenue - 2000 expenses - 0 feed - (1000 * 50) chicks
    expect(s.net_profit).toBe(-52000);
  });

  it('never divides by zero on an empty flock', () => {
    const s = summarizeBatch(
      { ...batch, initial_bird_count: 0, current_bird_count: 0 },
      emptyInputs,
      '2026-01-01',
      '2026-01-10',
    );
    expect(s.mortality_percent).toBe(0);
    expect(s.fcr).toBe(0);
  });
});

describe('validateBatchEdit', () => {
  const base = {
    start_date: '2026-01-01',
    actual_end_date: '2026-06-01',
    initial_bird_count: 1000,
    current_bird_count: 900,
  };

  it('accepts a valid edit', () => {
    expect(validateBatchEdit(base)).toBeNull();
  });

  it('rejects an end date before the start date', () => {
    expect(validateBatchEdit({ ...base, actual_end_date: '2025-12-31' })).toBeTruthy();
  });

  it('rejects a final bird count above the initial count', () => {
    expect(validateBatchEdit({ ...base, current_bird_count: 1200 })).toBeTruthy();
  });

  it('rejects a start age outside 0–80 weeks', () => {
    expect(validateBatchEdit({ ...base, age_at_start_weeks: -1 })).toBeTruthy();
    expect(validateBatchEdit({ ...base, age_at_start_weeks: 81 })).toBeTruthy();
    expect(validateBatchEdit({ ...base, age_at_start_weeks: 80 })).toBeNull();
  });

  it('returns English messages when asked', () => {
    expect(validateBatchEdit({ ...base, current_bird_count: 1200 }, 'en')).toMatch(/exceed/);
  });
});

describe('buildBatchEditPayload', () => {
  const base = {
    batchId: 'b1',
    start_date: '2026-01-01',
    actual_end_date: '2026-06-01',
    initial_bird_count: 1000,
    current_bird_count: 900,
  };

  it('omits fields that were not touched', () => {
    const p = buildBatchEditPayload(base);
    expect(p).not.toHaveProperty('breed');
    expect(p).not.toHaveProperty('chick_cost_per_bird');
    expect(p).not.toHaveProperty('batch_name_bn');
  });

  it('mirrors the Bengali name into batch_name', () => {
    const p = buildBatchEditPayload({ ...base, batch_name_bn: 'ব্যাচ ২' });
    expect(p.batch_name).toBe('ব্যাচ ২');
    expect(p.batch_name_bn).toBe('ব্যাচ ২');
  });

  it('ignores an empty name instead of blanking the row', () => {
    const p = buildBatchEditPayload({ ...base, batch_name_bn: '' });
    expect(p).not.toHaveProperty('batch_name');
  });
});

describe('mergeTrendSeries', () => {
  it('merges eggs and mortality onto one sorted timeline', () => {
    const out = mergeTrendSeries(
      [{ production_date: '2026-01-02', total_eggs: 400 }],
      [
        { summary_date: '2026-01-02', mortality_count: 3 },
        { summary_date: '2026-01-01', mortality_count: 1 },
      ],
    );
    expect(out).toEqual([
      { date: '2026-01-01', eggs: 0, mortality: 1 },
      { date: '2026-01-02', eggs: 400, mortality: 3 },
    ]);
  });
});
