import { describe, it, expect } from 'vitest';
import {
  weightedAvgFeedPrice,
  sumExpensesByCategory,
  sumExpensesExcluding,
  calculateWaterUsage,
  calculateFanRuntime,
  calculateCostPerEgg,
  calculateDailyTrends,
  buildCostAnalytics,
  DEFAULT_FEED_PRICE_PER_KG,
} from '@/lib/costAnalytics';
import {
  getTargetFCR,
  ageDaysAt,
  getEmptyBroilerAnalytics,
  calculateBroilerAnalytics,
  calculateBroilerDailyTrends,
  CHICK_START_WEIGHT_G,
  BROILER_DEFAULT_RATES,
} from '@/lib/broilerCostAnalytics';

describe('expense categorisation', () => {
  const expenses = [
    { category: 'electricity', amount: 100 },
    { category: 'utilities', amount: 50 },
    { category: 'water', amount: 20 },
    { category: 'feed', amount: 500 },
    { category: 'medicine', amount: 70 },
  ];
  it('sums electricity + utilities together', () => {
    expect(sumExpensesByCategory(expenses, ['electricity', 'utilities'])).toBe(150);
  });
  it('excludes utility and feed categories from "other"', () => {
    expect(sumExpensesExcluding(expenses, ['electricity', 'utilities', 'water', 'feed'])).toBe(70);
  });
  it('handles undefined input', () => {
    expect(sumExpensesByCategory(undefined, ['water'])).toBe(0);
  });
});

describe('weighted feed price', () => {
  it('falls back to default with no inventory', () => {
    expect(weightedAvgFeedPrice(undefined)).toBe(DEFAULT_FEED_PRICE_PER_KG);
    expect(weightedAvgFeedPrice([])).toBe(DEFAULT_FEED_PRICE_PER_KG);
  });
  it('falls back to default when total kg is zero', () => {
    expect(weightedAvgFeedPrice([{ quantity_kg: 0, unit_price: 60 }])).toBe(DEFAULT_FEED_PRICE_PER_KG);
  });
  it('weights by quantity, not by lot count', () => {
    const price = weightedAvgFeedPrice([
      { quantity_kg: 900, unit_price: 40 },
      { quantity_kg: 100, unit_price: 50 },
    ]);
    expect(price).toBeCloseTo(41, 5);
  });
});

describe('water and fan estimates', () => {
  it('returns zeros with no sensor logs', () => {
    expect(calculateWaterUsage([], 30)).toEqual({ totalLiters: 0, dailyAverage: 0, estimatedCost: 0 });
  });
  it('converts flow readings to litres at 5-minute sampling', () => {
    const out = calculateWaterUsage([{ water_usage: 2 }, { water_usage: 2 }], 2);
    expect(out.totalLiters).toBe(20);
    expect(out.dailyAverage).toBe(10);
  });
  it('reports zero fan hours when the fan is off', () => {
    const out = calculateFanRuntime([{}, {}, {}], { fan_on: false, fan_speed: 'HIGH' }, 1);
    expect(out.totalHours).toBe(0);
    expect(out.estimatedCost).toBe(0);
  });
  it('attributes hours to the current speed bucket', () => {
    const out = calculateFanRuntime([{}, {}], { fan_on: true, fan_speed: 'HIGH' }, 1);
    expect(out.highSpeedHours).toBeGreaterThan(0);
    expect(out.lowSpeedHours).toBe(0);
  });
});

describe('cost per egg', () => {
  it('is zero when no eggs were produced', () => {
    const out = calculateCostPerEgg([], [{ quantity_kg: 100 }], [], [{ category: 'water', amount: 50 }]);
    expect(out.totalCostPerEgg).toBe(0);
    expect(out.totalEggs).toBe(0);
  });
  it('splits feed, electricity and water per egg', () => {
    const out = calculateCostPerEgg(
      [{ total_eggs: 100 }],
      [{ quantity_kg: 10 }],
      [{ quantity_kg: 100, unit_price: 50 }],
      [
        { category: 'electricity', amount: 100 },
        { category: 'water', amount: 50 },
      ],
    );
    expect(out.totalFeedCost).toBe(500);
    expect(out.feedCostPerEgg).toBe(5);
    expect(out.electricityCostPerEgg).toBe(1);
    expect(out.waterCostPerEgg).toBe(0.5);
    expect(out.totalCostPerEgg).toBe(6.5);
  });
});

describe('daily trends', () => {
  it('always returns 7 buckets, oldest first', () => {
    const now = new Date('2026-01-10T00:00:00Z');
    const out = calculateDailyTrends([], [], [], now);
    expect(out).toHaveLength(7);
    expect(out[0].date < out[6].date).toBe(true);
  });
  it('assembles the full analytics object', () => {
    const out = buildCostAnalytics({ days: 30, now: new Date('2026-01-10T00:00:00Z') });
    expect(out.dailyTrends).toHaveLength(7);
    expect(out.costPerEgg.totalEggs).toBe(0);
  });
});

describe('broiler FCR targets', () => {
  it('rises with age', () => {
    expect(getTargetFCR(7)).toBe(0.85);
    expect(getTargetFCR(8)).toBe(1.1);
    expect(getTargetFCR(42)).toBe(1.85);
    expect(getTargetFCR(50)).toBe(2.0);
  });
  it('computes inclusive age from batch start', () => {
    expect(ageDaysAt('2026-01-01', '2026-01-01')).toBe(1);
    expect(ageDaysAt('2026-01-01', '2026-01-08')).toBe(8);
  });
});

describe('broiler analytics', () => {
  it('returns empty analytics with no active batch', () => {
    expect(calculateBroilerAnalytics(null, []).activeBatch).toBeNull();
    expect(getEmptyBroilerAnalytics().costPerKg.estimatedSalePrice).toBe(
      BROILER_DEFAULT_RATES.salePerKg,
    );
  });

  const batchData = {
    batch: {
      id: 'b1',
      batch_name: 'Batch 1',
      batch_name_bn: null,
      start_date: '2026-01-01',
      ageDays: 28,
      initial_bird_count: 1000,
      chick_cost_per_bird: 40,
    },
    feed: [{ feed_date: '2026-01-10', quantity_kg: 2000, cost_per_kg: 50 }],
    mortality: [{ record_date: '2026-01-05', count: 50 }],
    weights: [{ record_date: '2026-01-25', average_weight_grams: 1500 }],
    sales: [],
  };

  const out = calculateBroilerAnalytics(batchData, [
    { category: 'electricity', amount: 1000 },
    { category: 'medicine', amount: 500 },
  ]);

  it('subtracts mortality from the live bird count', () => {
    expect(out.activeBatch?.currentBirds).toBe(950);
    expect(out.activeBatch?.mortalityPercent).toBe(5);
  });
  it('computes feed totals and per-bird cost', () => {
    expect(out.feedAnalytics.totalFeedCost).toBe(100000);
    expect(out.feedAnalytics.feedPerBird).toBeCloseTo(2.11, 2);
  });
  it('produces a positive FCR using the chick baseline', () => {
    expect(CHICK_START_WEIGHT_G).toBe(42);
    expect(out.weightAnalytics.fcr).toBeGreaterThan(0);
    expect(out.weightAnalytics.fcrRating).not.toBe('none');
  });
  it('rolls chick, feed and other expenses into total investment', () => {
    expect(out.batchTotals.totalChickCost).toBe(40000);
    expect(out.batchTotals.totalOtherExpenses).toBe(1500);
    expect(out.batchTotals.totalInvestment).toBe(141500);
  });
  it('derives revenue and margin from live weight', () => {
    expect(out.weightAnalytics.totalWeightKg).toBe(1425);
    expect(out.batchTotals.estimatedRevenue).toBe(1425 * 180);
  });
  it('emits weight and FCR trend points per sample', () => {
    expect(out.weightHistory).toHaveLength(1);
    expect(out.fcrTrend).toHaveLength(1);
    expect(out.fcrTrend[0].target).toBe(getTargetFCR(out.fcrTrend[0].ageDays));
  });
  it('builds 7 daily trend buckets', () => {
    expect(calculateBroilerDailyTrends([], [], [], new Date('2026-01-10T00:00:00Z'))).toHaveLength(7);
  });
});
