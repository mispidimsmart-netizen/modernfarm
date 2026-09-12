/**
 * Layer-farm cost analytics — pure SSOT (no React, no network).
 *
 * All money/energy maths for the layer cost dashboard live here so they can be
 * unit-tested and reused without mounting a hook.
 */

export interface CostAnalytics {
  fanRuntime: {
    totalHours: number;
    lowSpeedHours: number;
    mediumSpeedHours: number;
    highSpeedHours: number;
    estimatedKwh: number;
    estimatedCost: number;
  };
  waterUsage: {
    totalLiters: number;
    dailyAverage: number;
    estimatedCost: number;
  };
  costPerEgg: {
    feedCostPerEgg: number;
    electricityCostPerEgg: number;
    waterCostPerEgg: number;
    totalCostPerEgg: number;
    totalEggs: number;
    totalFeedCost: number;
  };
  dailyTrends: {
    date: string;
    fanKwh: number;
    waterLiters: number;
    eggs: number;
    feedKg: number;
  }[];
}

/** Fan power draw per speed step (Watts). */
export const FAN_POWER = { LOW: 50, MEDIUM: 100, HIGH: 200, OFF: 0 } as const;

/** Default utility rates (BDT). */
export const DEFAULT_RATES = {
  electricityPerKwh: 8.0,
  waterPerLiter: 0.5,
};

/** Sensor sampling interval assumed when converting readings to minutes. */
export const SAMPLING_INTERVAL_MINUTES = 5;

/** Default feed price (BDT/kg) when inventory has no priced stock. */
export const DEFAULT_FEED_PRICE_PER_KG = 45;

export const ELECTRICITY_CATEGORIES = ['electricity', 'utilities'];
export const WATER_CATEGORIES = ['water'];

/** Sum expense amounts whose category is in `categories`. */
export function sumExpensesByCategory(
  expenses: { category?: string | null; amount?: number | string | null }[] | undefined,
  categories: string[],
): number {
  return (expenses ?? [])
    .filter((e) => categories.includes(String(e.category)))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

/** Sum expense amounts whose category is NOT in `categories`. */
export function sumExpensesExcluding(
  expenses: { category?: string | null; amount?: number | string | null }[] | undefined,
  categories: string[],
): number {
  return (expenses ?? [])
    .filter((e) => !categories.includes(String(e.category)))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

/**
 * Quantity-weighted average feed price from inventory lots.
 * Falls back to DEFAULT_FEED_PRICE_PER_KG when there is no priced stock.
 */
export function weightedAvgFeedPrice(
  inventory: { quantity_kg?: number | string | null; unit_price?: number | string | null }[] | undefined,
): number {
  if (!inventory || inventory.length === 0) return DEFAULT_FEED_PRICE_PER_KG;
  const totalKg = inventory.reduce((s, f) => s + Number(f.quantity_kg || 0), 0);
  if (totalKg <= 0) return DEFAULT_FEED_PRICE_PER_KG;
  const totalCost = inventory.reduce(
    (s, f) => s + Number(f.unit_price || 0) * Number(f.quantity_kg || 0),
    0,
  );
  return totalCost / totalKg;
}

export function calculateFanRuntime(
  sensorLogs: any[] | undefined,
  deviceStatus: any | undefined,
  days: number,
): CostAnalytics['fanRuntime'] {
  const logsPerDay = sensorLogs && days > 0 ? sensorLogs.length / days : 0;
  const samplingIntervalMinutes = logsPerDay > 0 ? (24 * 60) / logsPerDay : SAMPLING_INTERVAL_MINUTES;

  const totalReadings = sensorLogs?.length ?? 0;
  const fanSpeed = deviceStatus?.fan_speed ?? 'MEDIUM';
  const fanOn = deviceStatus?.fan_on ?? false;

  const estimatedFanHours = fanOn ? (totalReadings * samplingIntervalMinutes) / 60 : 0;

  let lowHours = 0;
  let mediumHours = 0;
  let highHours = 0;
  if (fanSpeed === 'LOW') lowHours = estimatedFanHours;
  else if (fanSpeed === 'HIGH') highHours = estimatedFanHours;
  else mediumHours = estimatedFanHours;

  const totalKwh =
    (lowHours * FAN_POWER.LOW + mediumHours * FAN_POWER.MEDIUM + highHours * FAN_POWER.HIGH) / 1000;

  return {
    totalHours: Math.round(estimatedFanHours),
    lowSpeedHours: Math.round(lowHours),
    mediumSpeedHours: Math.round(mediumHours),
    highSpeedHours: Math.round(highHours),
    estimatedKwh: Math.round(totalKwh * 10) / 10,
    estimatedCost: Math.round(totalKwh * DEFAULT_RATES.electricityPerKwh),
  };
}

export function calculateWaterUsage(
  sensorLogs: any[] | undefined,
  days: number,
): CostAnalytics['waterUsage'] {
  if (!sensorLogs || sensorLogs.length === 0) {
    return { totalLiters: 0, dailyAverage: 0, estimatedCost: 0 };
  }

  const totalWaterFlow = sensorLogs.reduce((sum, log) => sum + Number(log.water_usage || 0), 0);
  const totalLiters = Math.round(totalWaterFlow * SAMPLING_INTERVAL_MINUTES);

  return {
    totalLiters,
    dailyAverage: days > 0 ? Math.round(totalLiters / days) : 0,
    estimatedCost: Math.round(totalLiters * DEFAULT_RATES.waterPerLiter),
  };
}

export function calculateCostPerEgg(
  eggProduction: any[] | undefined,
  feedConsumption: any[] | undefined,
  feedInventory: any[] | undefined,
  expenses: any[] | undefined,
): CostAnalytics['costPerEgg'] {
  const totalEggs = eggProduction?.reduce((sum, e) => sum + Number(e.total_eggs || 0), 0) ?? 0;
  const totalFeedKg = feedConsumption?.reduce((sum, f) => sum + Number(f.quantity_kg || 0), 0) ?? 0;

  const avgFeedPrice = weightedAvgFeedPrice(feedInventory);
  const totalFeedCost = totalFeedKg * avgFeedPrice;

  const electricityExpenses = sumExpensesByCategory(expenses, ELECTRICITY_CATEGORIES);
  const waterExpenses = sumExpensesByCategory(expenses, WATER_CATEGORIES);

  const feedCostPerEgg = totalEggs > 0 ? totalFeedCost / totalEggs : 0;
  const electricityCostPerEgg = totalEggs > 0 ? electricityExpenses / totalEggs : 0;
  const waterCostPerEgg = totalEggs > 0 ? waterExpenses / totalEggs : 0;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    feedCostPerEgg: round2(feedCostPerEgg),
    electricityCostPerEgg: round2(electricityCostPerEgg),
    waterCostPerEgg: round2(waterCostPerEgg),
    totalCostPerEgg: round2(feedCostPerEgg + electricityCostPerEgg + waterCostPerEgg),
    totalEggs,
    totalFeedCost: Math.round(totalFeedCost),
  };
}

/** Last 7 days of fan/water/egg/feed trends, oldest first. */
export function calculateDailyTrends(
  sensorLogs: any[] | undefined,
  eggProduction: any[] | undefined,
  feedConsumption: any[] | undefined,
  now: Date = new Date(),
): CostAnalytics['dailyTrends'] {
  const trends: CostAnalytics['dailyTrends'] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayLogs = sensorLogs?.filter((log) => (log.recorded_at ?? '').startsWith(dateStr)) ?? [];
    const dailyWater = dayLogs.reduce(
      (sum, log) => sum + Number(log.water_usage || 0) * SAMPLING_INTERVAL_MINUTES,
      0,
    );
    const dayEggs = eggProduction?.find((e) => e.production_date === dateStr);
    const dayFeed =
      feedConsumption
        ?.filter((f) => f.consumption_date === dateStr)
        .reduce((sum, f) => sum + Number(f.quantity_kg || 0), 0) ?? 0;

    const fanKwh = (dayLogs.length * SAMPLING_INTERVAL_MINUTES * FAN_POWER.MEDIUM) / (60 * 1000);

    trends.push({
      date: dateStr,
      fanKwh: Math.round(fanKwh * 10) / 10,
      waterLiters: Math.round(dailyWater),
      eggs: Number(dayEggs?.total_eggs ?? 0),
      feedKg: dayFeed,
    });
  }

  return trends;
}

/** Assemble the full layer cost analytics object from already-fetched data. */
export function buildCostAnalytics(input: {
  sensorLogs?: any[];
  deviceStatus?: any;
  eggProduction?: any[];
  feedConsumption?: any[];
  feedInventory?: any[];
  expenses?: any[];
  days: number;
  now?: Date;
}): CostAnalytics {
  return {
    fanRuntime: calculateFanRuntime(input.sensorLogs, input.deviceStatus, input.days),
    waterUsage: calculateWaterUsage(input.sensorLogs, input.days),
    costPerEgg: calculateCostPerEgg(
      input.eggProduction,
      input.feedConsumption,
      input.feedInventory,
      input.expenses,
    ),
    dailyTrends: calculateDailyTrends(
      input.sensorLogs,
      input.eggProduction,
      input.feedConsumption,
      input.now,
    ),
  };
}
