import { useProfile } from '@/hooks/useFarmData';

export type FarmType = 'layer' | 'broiler';

export interface FarmTypeConfig {
  type: FarmType;
  isLayer: boolean;
  isBroiler: boolean;
}

/**
 * Hook to get the current farm type and helper booleans
 */
export function useFarmType(): FarmTypeConfig {
  const { data: profile } = useProfile();
  
  const type: FarmType = (profile?.farm_type as FarmType) || 'layer';
  
  return {
    type,
    isLayer: type === 'layer',
    isBroiler: type === 'broiler',
  };
}

/**
 * Broiler age-based temperature thresholds
 * Source: Standard broiler management guides
 */
export const BROILER_TEMP_CURVE: { ageWeeks: number; minTemp: number; maxTemp: number }[] = [
  { ageWeeks: 0, minTemp: 33, maxTemp: 35 },   // Day 1-7
  { ageWeeks: 1, minTemp: 30, maxTemp: 32 },   // Week 1-2
  { ageWeeks: 2, minTemp: 27, maxTemp: 29 },   // Week 2-3
  { ageWeeks: 3, minTemp: 24, maxTemp: 26 },   // Week 3-4
  { ageWeeks: 4, minTemp: 21, maxTemp: 24 },   // Week 4+
];

/**
 * Get recommended temperature range for broilers based on age
 */
export function getBroilerTempRange(ageWeeks: number): { minTemp: number; maxTemp: number } {
  // Find the appropriate range based on age
  const range = BROILER_TEMP_CURVE.find((r, index) => {
    const nextRange = BROILER_TEMP_CURVE[index + 1];
    if (!nextRange) return true; // Last range applies to all older birds
    return ageWeeks < nextRange.ageWeeks;
  });
  
  return range || BROILER_TEMP_CURVE[BROILER_TEMP_CURVE.length - 1];
}

/**
 * Calculate target weight for broilers based on age (in grams)
 * Using typical Cobb 500 / Ross 308 growth curves
 */
export function getBroilerTargetWeight(ageDays: number): number {
  // Approximate daily weight gain curve
  if (ageDays <= 0) return 42; // Chick weight
  if (ageDays <= 7) return 42 + (ageDays * 25);
  if (ageDays <= 14) return 220 + ((ageDays - 7) * 45);
  if (ageDays <= 21) return 535 + ((ageDays - 14) * 65);
  if (ageDays <= 28) return 990 + ((ageDays - 21) * 80);
  if (ageDays <= 35) return 1550 + ((ageDays - 28) * 90);
  return 2180 + ((ageDays - 35) * 85); // After 5 weeks
}

/**
 * Calculate FCR (Feed Conversion Ratio)
 */
export function calculateFCR(totalFeedKg: number, totalWeightGainKg: number): number {
  if (totalWeightGainKg <= 0) return 0;
  return totalFeedKg / totalWeightGainKg;
}

/**
 * Evaluate FCR performance
 */
export function evaluateFCR(fcr: number, ageWeeks: number): 'excellent' | 'good' | 'average' | 'poor' {
  // FCR benchmarks vary by age
  const benchmarks: Record<number, { excellent: number; good: number; average: number }> = {
    1: { excellent: 0.9, good: 1.0, average: 1.2 },
    2: { excellent: 1.1, good: 1.2, average: 1.4 },
    3: { excellent: 1.3, good: 1.4, average: 1.6 },
    4: { excellent: 1.5, good: 1.6, average: 1.8 },
    5: { excellent: 1.7, good: 1.8, average: 2.0 },
    6: { excellent: 1.9, good: 2.0, average: 2.2 },
  };
  
  const week = Math.min(Math.max(ageWeeks, 1), 6);
  const benchmark = benchmarks[week];
  
  if (fcr <= benchmark.excellent) return 'excellent';
  if (fcr <= benchmark.good) return 'good';
  if (fcr <= benchmark.average) return 'average';
  return 'poor';
}
