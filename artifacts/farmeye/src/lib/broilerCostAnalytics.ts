/**
 * Broiler batch cost analytics — pure SSOT (no React, no network).
 *
 * FCR, weight, cost-per-kg and profit maths for the broiler dashboard.
 */

import { calculateFCR, evaluateFCR, getBroilerTargetWeight } from '@/hooks/useFarmType';
import { sumExpensesByCategory, sumExpensesExcluding } from './costAnalytics';

export interface BroilerCostAnalytics {
  activeBatch: {
    id: string;
    name: string;
    nameBn: string;
    startDate: string;
    ageDays: number;
    initialBirds: number;
    currentBirds: number;
    mortalityCount: number;
    mortalityPercent: number;
  } | null;
  feedAnalytics: {
    totalFeedKg: number;
    totalFeedCost: number;
    feedPerBird: number;
    feedCostPerBird: number;
    dailyFeedAvg: number;
  };
  weightAnalytics: {
    currentWeight: number;
    targetWeight: number;
    weightGap: number;
    fcr: number;
    fcrRating: 'excellent' | 'good' | 'average' | 'poor' | 'none';
    totalWeightKg: number;
  };
  costPerKg: {
    chickCost: number;
    feedCost: number;
    electricityCost: number;
    waterCost: number;
    otherCost: number;
    totalCostPerKg: number;
    estimatedSalePrice: number;
    profitPerKg: number;
  };
  batchTotals: {
    totalChickCost: number;
    totalFeedCost: number;
    totalOtherExpenses: number;
    totalInvestment: number;
    estimatedRevenue: number;
    estimatedProfit: number;
    profitMargin: number;
  };
  dailyTrends: { date: string; feedKg: number; mortality: number; weight: number }[];
  weightHistory: { date: string; ageDays: number; weight: number; targetWeight: number }[];
  fcrTrend: { date: string; ageDays: number; fcr: number; target: number }[];
}

/** Default market rates (BDT). */
export const BROILER_DEFAULT_RATES = {
  salePerKg: 180,
  electricityPerKwh: 8.0,
  waterPerLiter: 0.5,
};

/** Day-old chick weight in grams, used as the FCR baseline. */
export const CHICK_START_WEIGHT_G = 42;

/** Default feed price when a feed row has no cost_per_kg (BDT/kg). */
export const DEFAULT_BROILER_FEED_PRICE = 45;

const EXCLUDED_OTHER_CATEGORIES = ['electricity', 'utilities', 'water', 'feed'];

/** Industry target cumulative FCR for Cobb 500 broilers by age. */
export function getTargetFCR(ageDays: number): number {
  if (ageDays <= 7) return 0.85;
  if (ageDays <= 14) return 1.1;
  if (ageDays <= 21) return 1.35;
  if (ageDays <= 28) return 1.55;
  if (ageDays <= 35) return 1.7;
  if (ageDays <= 42) return 1.85;
  return 2.0;
}

/** Inclusive age in days from batch start to the given date (min 1). */
export function ageDaysAt(startDate: string, dateIso: string): number {
  const diff =
    (new Date(dateIso).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.floor(diff) + 1);
}

export function getEmptyBroilerAnalytics(): BroilerCostAnalytics {
  return {
    activeBatch: null,
    feedAnalytics: {
      totalFeedKg: 0,
      totalFeedCost: 0,
      feedPerBird: 0,
      feedCostPerBird: 0,
      dailyFeedAvg: 0,
    },
    weightAnalytics: {
      currentWeight: 0,
      targetWeight: 0,
      weightGap: 0,
      fcr: 0,
      fcrRating: 'none',
      totalWeightKg: 0,
    },
    costPerKg: {
      chickCost: 0,
      feedCost: 0,
      electricityCost: 0,
      waterCost: 0,
      otherCost: 0,
      totalCostPerKg: 0,
      estimatedSalePrice: BROILER_DEFAULT_RATES.salePerKg,
      profitPerKg: 0,
    },
    batchTotals: {
      totalChickCost: 0,
      totalFeedCost: 0,
      totalOtherExpenses: 0,
      totalInvestment: 0,
      estimatedRevenue: 0,
      estimatedProfit: 0,
      profitMargin: 0,
    },
    dailyTrends: [],
    weightHistory: [],
    fcrTrend: [],
  };
}

/** Last 7 days of feed / mortality / weight, oldest first. */
export function calculateBroilerDailyTrends(
  feed: any[],
  mortality: any[],
  weights: any[],
  now: Date = new Date(),
): BroilerCostAnalytics['dailyTrends'] {
  const trends: BroilerCostAnalytics['dailyTrends'] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayFeed = feed
      .filter((f) => f.feed_date === dateStr)
      .reduce((sum, f) => sum + Number(f.quantity_kg || 0), 0);
    const dayMortality = mortality
      .filter((m) => m.record_date === dateStr)
      .reduce((sum, m) => sum + Number(m.count || 0), 0);
    const dayWeight = weights.find((w) => w.record_date <= dateStr);

    trends.push({
      date: dateStr,
      feedKg: Math.round(dayFeed * 10) / 10,
      mortality: dayMortality,
      weight: dayWeight?.average_weight_grams || 0,
    });
  }

  return trends;
}

/**
 * Full broiler analytics from already-fetched batch data.
 * `batchData` is null/undefined when there is no active batch.
 */
export function calculateBroilerAnalytics(
  batchData: any | null | undefined,
  expenses: any[] | undefined,
  now: Date = new Date(),
): BroilerCostAnalytics {
  if (!batchData?.batch) return getEmptyBroilerAnalytics();

  const { batch, feed, mortality, weights } = batchData;

  // --- Batch info ---
  const totalMortality = mortality.reduce((sum: number, m: any) => sum + Number(m.count || 0), 0);
  const currentBirds = batch.initial_bird_count - totalMortality;
  const mortalityPercent =
    batch.initial_bird_count > 0 ? (totalMortality / batch.initial_bird_count) * 100 : 0;

  const activeBatch = {
    id: batch.id,
    name: batch.batch_name,
    nameBn: batch.batch_name_bn || batch.batch_name,
    startDate: batch.start_date,
    ageDays: batch.ageDays,
    initialBirds: batch.initial_bird_count,
    currentBirds,
    mortalityCount: totalMortality,
    mortalityPercent: Math.round(mortalityPercent * 10) / 10,
  };

  // --- Feed ---
  const totalFeedKg = feed.reduce((sum: number, f: any) => sum + Number(f.quantity_kg || 0), 0);
  const totalFeedCost = feed.reduce((sum: number, f: any) => {
    const qty = Number(f.quantity_kg || 0);
    const price = Number(f.cost_per_kg || DEFAULT_BROILER_FEED_PRICE);
    return sum + qty * price;
  }, 0);

  const feedAnalytics = {
    totalFeedKg: Math.round(totalFeedKg * 10) / 10,
    totalFeedCost: Math.round(totalFeedCost),
    feedPerBird: currentBirds > 0 ? Math.round((totalFeedKg / currentBirds) * 100) / 100 : 0,
    feedCostPerBird: currentBirds > 0 ? Math.round((totalFeedCost / currentBirds) * 10) / 10 : 0,
    dailyFeedAvg: batch.ageDays > 0 ? Math.round((totalFeedKg / batch.ageDays) * 10) / 10 : 0,
  };

  // --- Weight & FCR ---
  const latestWeight = weights.length > 0 ? weights[0].average_weight_grams : 0;
  const targetWeight = getBroilerTargetWeight(batch.ageDays);
  const weightGap = latestWeight - targetWeight;

  const sortedWeightsAsc = [...weights].sort((a: any, b: any) =>
    a.record_date.localeCompare(b.record_date),
  );

  // Dead birds consumed feed too — estimate their weight at time of death.
  const weightAtDate = (dateIso: string): number => {
    let chosen = 0;
    for (const w of sortedWeightsAsc as any[]) {
      if (w.record_date <= dateIso) chosen = w.average_weight_grams || 0;
      else break;
    }
    if (chosen > 0) return chosen;
    return latestWeight > 0 ? latestWeight / 2 : CHICK_START_WEIGHT_G;
  };

  const deadBirdsWeightKg =
    mortality.reduce(
      (s: number, m: any) => s + (Number(m.count || 0) * weightAtDate(m.record_date)) / 1000,
      0,
    ) || 0;

  const liveWeightKg = (currentBirds * latestWeight) / 1000;
  const totalWeightKg = liveWeightKg; // saleable meat = live birds only
  const initialWeightKg = (batch.initial_bird_count * CHICK_START_WEIGHT_G) / 1000;
  const weightGainKg = Math.max(0, liveWeightKg + deadBirdsWeightKg - initialWeightKg);
  const fcr = calculateFCR(totalFeedKg, weightGainKg);
  const ageWeeks = Math.ceil(batch.ageDays / 7);

  const weightAnalytics = {
    currentWeight: latestWeight as number,
    targetWeight: Math.round(targetWeight),
    weightGap: Math.round(weightGap),
    fcr: Math.round(fcr * 100) / 100,
    fcrRating: (fcr > 0 ? evaluateFCR(fcr, ageWeeks) : 'none') as BroilerCostAnalytics['weightAnalytics']['fcrRating'],
    totalWeightKg: Math.round(totalWeightKg),
  };

  // --- Cost per kg ---
  const chickCostTotal = batch.initial_bird_count * (batch.chick_cost_per_bird || 0);
  const electricityExpenses = sumExpensesByCategory(expenses, ['electricity', 'utilities']);
  const waterExpenses = sumExpensesByCategory(expenses, ['water']);
  const otherExpenses = sumExpensesExcluding(expenses, EXCLUDED_OTHER_CATEGORIES);

  const totalInvestment =
    chickCostTotal + totalFeedCost + electricityExpenses + waterExpenses + otherExpenses;

  const perKg = (value: number) => (totalWeightKg > 0 ? value / totalWeightKg : 0);
  const costPerKgMeat = perKg(totalInvestment);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const costPerKg = {
    chickCost: round1(perKg(chickCostTotal)),
    feedCost: round1(perKg(totalFeedCost)),
    electricityCost: round1(perKg(electricityExpenses)),
    waterCost: round1(perKg(waterExpenses)),
    otherCost: round1(perKg(otherExpenses)),
    totalCostPerKg: round1(costPerKgMeat),
    estimatedSalePrice: BROILER_DEFAULT_RATES.salePerKg,
    profitPerKg: round1(BROILER_DEFAULT_RATES.salePerKg - costPerKgMeat),
  };

  // --- Batch totals ---
  const estimatedRevenue = totalWeightKg * BROILER_DEFAULT_RATES.salePerKg;
  const estimatedProfit = estimatedRevenue - totalInvestment;
  const profitMargin = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0;

  const batchTotals = {
    totalChickCost: Math.round(chickCostTotal),
    totalFeedCost: Math.round(totalFeedCost),
    totalOtherExpenses: Math.round(electricityExpenses + waterExpenses + otherExpenses),
    totalInvestment: Math.round(totalInvestment),
    estimatedRevenue: Math.round(estimatedRevenue),
    estimatedProfit: Math.round(estimatedProfit),
    profitMargin: Math.round(profitMargin * 10) / 10,
  };

  // --- Trends ---
  const dailyTrends = calculateBroilerDailyTrends(feed, mortality, weights, now);

  const weightHistory = sortedWeightsAsc.map((w: any) => {
    const sampleAgeDays = ageDaysAt(batch.start_date, w.record_date);
    return {
      date: w.record_date,
      ageDays: sampleAgeDays,
      weight: w.average_weight_grams || 0,
      targetWeight: Math.round(getBroilerTargetWeight(sampleAgeDays)),
    };
  });

  const fcrTrend = sortedWeightsAsc.map((w: any) => {
    const sampleDate = w.record_date;
    const sampleAgeDays = ageDaysAt(batch.start_date, sampleDate);
    const cumulativeFeedKg = feed
      .filter((f: any) => f.feed_date <= sampleDate)
      .reduce((s: number, f: any) => s + Number(f.quantity_kg || 0), 0);
    const cumulativeMortality = mortality
      .filter((m: any) => m.record_date <= sampleDate)
      .reduce((s: number, m: any) => s + Number(m.count || 0), 0);
    const aliveBirds = batch.initial_bird_count - cumulativeMortality;
    const sampleWeightKg = ((w.average_weight_grams || 0) * aliveBirds) / 1000;
    const initialKg = (batch.initial_bird_count * CHICK_START_WEIGHT_G) / 1000;
    const gainKg = Math.max(0.001, sampleWeightKg - initialKg);
    return {
      date: sampleDate,
      ageDays: sampleAgeDays,
      fcr: Math.round(calculateFCR(cumulativeFeedKg, gainKg) * 100) / 100,
      target: getTargetFCR(sampleAgeDays),
    };
  });

  return {
    activeBatch,
    feedAnalytics,
    weightAnalytics,
    costPerKg,
    batchTotals,
    dailyTrends,
    weightHistory,
    fcrTrend,
  };
}
