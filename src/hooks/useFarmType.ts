import { useProfile } from '@/hooks/useFarmData';
import { useSheds, useSelectedShed } from '@/hooks/useSheds';

export type FarmType = 'layer' | 'broiler';

export interface FarmTypeConfig {
  type: FarmType;
  isLayer: boolean;
  isBroiler: boolean;
}

/**
 * Hook to get the current farm type based on the selected shed.
 * Falls back to profile-level farm_type if no shed is selected.
 */
export function useFarmType(): FarmTypeConfig {
  const { data: profile } = useProfile();
  const { data: sheds } = useSheds();
  
  let selectedShedId: string | null = null;
  try {
    const ctx = useSelectedShed();
    selectedShedId = ctx.selectedShedId;
  } catch {
    // ShedProvider not available, use profile fallback
  }
  
  const selectedShed = sheds?.find(s => s.id === selectedShedId);
  const type: FarmType = (selectedShed?.farm_type as FarmType) || (profile?.farm_type as FarmType) || 'layer';
  
  return {
    type,
    isLayer: type === 'layer',
    isBroiler: type === 'broiler',
  };
}

/**
 * Broiler age-based temperature thresholds (DAY-BASED)
 * Source: Standard broiler management guides
 */
export const BROILER_TEMP_CURVE_DAYS: { 
  minDays: number; 
  maxDays: number; 
  minTemp: number; 
  maxTemp: number;
  label: string;
  labelBn: string;
}[] = [
  { minDays: 1, maxDays: 3, minTemp: 33, maxTemp: 34, label: 'Day 1-3', labelBn: '১-৩ দিন' },
  { minDays: 4, maxDays: 7, minTemp: 32, maxTemp: 32, label: 'Day 4-7', labelBn: '৪-৭ দিন' },
  { minDays: 8, maxDays: 14, minTemp: 30, maxTemp: 30, label: 'Day 8-14', labelBn: '৮-১৪ দিন' },
  { minDays: 15, maxDays: 21, minTemp: 28, maxTemp: 28, label: 'Day 15-21', labelBn: '১৫-২১ দিন' },
  { minDays: 22, maxDays: 28, minTemp: 26, maxTemp: 26, label: 'Day 22-28', labelBn: '২২-২৮ দিন' },
  { minDays: 29, maxDays: 35, minTemp: 24, maxTemp: 24, label: 'Day 29-35', labelBn: '২৯-৩৫ দিন' },
  { minDays: 36, maxDays: 999, minTemp: 22, maxTemp: 23, label: 'Day 36+', labelBn: '৩৬+ দিন' },
];

/**
 * 8-Channel Relay GPIO Mapping (v2.0)
 * Each device has its own dedicated relay channel — no pin sharing needed.
 */
export const RELAY_8CH_GPIO_MAP = {
  IN1: { gpio: 25, device: 'exhaust_fan', label: 'Exhaust Fan', labelBn: 'এক্সহস্ট ফ্যান', mode: 'both' },
  IN2: { gpio: 26, device: 'ceiling_fan', label: 'Ceiling Fan', labelBn: 'সিলিং ফ্যান', mode: 'both' },
  IN3: { gpio: 27, device: 'light', label: 'Light', labelBn: 'লাইট', mode: 'both' },
  IN4: { gpio: 14, device: 'heater', label: 'Heater', labelBn: 'হিটার', mode: 'broiler' },
  IN5: { gpio: 12, device: 'fogger', label: 'Fogger', labelBn: 'ফগার', mode: 'both' },
  IN6: { gpio: 13, device: 'alarm', label: 'Alarm', labelBn: 'অ্যালার্ম', mode: 'both' },
  IN7: { gpio: 15, device: 'sprinkler', label: 'Roof Sprinkler', labelBn: 'ছাদ স্প্রিংকলার', mode: 'both' },
  IN8: { gpio: 33, device: 'circulation_fan', label: 'Circulation Fan', labelBn: 'সার্কুলেশন ফ্যান', mode: 'broiler' },
} as const;

/**
 * Sensor GPIO Mapping (v2.0 — adjusted for 8-channel relay)
 */
export const SENSOR_GPIO_MAP = {
  DHT22_1: { gpio: 4, label: 'DHT22 Primary', labelBn: 'DHT22 প্রধান' },
  DHT22_2: { gpio: 16, label: 'DHT22 Secondary', labelBn: 'DHT22 দ্বিতীয়' },
  WATER_FLOW: { gpio: 18, label: 'Water Flow (YF-S201)', labelBn: 'পানির ফ্লো' },
  MQ137: { gpio: 34, label: 'Ammonia (MQ-137)', labelBn: 'অ্যামোনিয়া' },
  ZMPT101B: { gpio: 35, label: 'Voltage (ZMPT101B)', labelBn: 'ভোল্টেজ' },
} as const;

/**
 * Sprinkler automation thresholds
 */
export const SPRINKLER_THRESHOLDS = {
  HSI_ON: 80,          // HSI ≥80 → sprinkler ON
  HSI_OFF: 75,         // HSI ≤75 → sprinkler OFF
  CYCLE_ON_SEC: 300,   // 5 min ON
  CYCLE_OFF_SEC: 600,  // 10 min OFF
  MAX_DAILY_MIN: 120,  // Max 2 hours/day
};

/**
 * Ceiling fan automation thresholds (Layer mode)
 */
export const CEILING_FAN_THRESHOLDS = {
  TEMP_ON: 25,         // ≥25°C → ON
  TEMP_OFF: 22,        // ≤22°C → OFF
};

// Legacy weekly format for backward compatibility
export const BROILER_TEMP_CURVE: { ageWeeks: number; minTemp: number; maxTemp: number }[] = [
  { ageWeeks: 0, minTemp: 33, maxTemp: 34 },
  { ageWeeks: 1, minTemp: 30, maxTemp: 32 },
  { ageWeeks: 2, minTemp: 28, maxTemp: 30 },
  { ageWeeks: 3, minTemp: 26, maxTemp: 28 },
  { ageWeeks: 4, minTemp: 24, maxTemp: 26 },
  { ageWeeks: 5, minTemp: 22, maxTemp: 24 },
];

/**
 * Broiler automation thresholds
 */
export const BROILER_THRESHOLDS = {
  // Temperature control
  TEMP_FAN_HIGH_DEVIATION: 2,    // +2°C → fan HIGH
  TEMP_HEATER_ON_DEVIATION: 2,   // -2°C → heater ON
  TEMP_ALARM_DEVIATION: 4,       // +4°C → alarm
  
  // Humidity
  HUMIDITY_LOW_WARNING: 40,      // <40% → warning
  HUMIDITY_HIGH_VENTILATION: 75, // >75% → ventilation increase
  
  // Ammonia
  AMMONIA_FAN_ON: 20,            // >20ppm → fan ON
  AMMONIA_ALARM: 30,             // >30ppm → alarm
  
  // Water
  WATER_DROP_THRESHOLD: 20,      // 20% drop
  WATER_WINDOW_HOURS: 6,         // within 6 hours
  
  // Heat Stress Index (👉 Cloud এর অপেক্ষা করবে না - ESP32 locally handles)
  HSI_FAN_HIGH: 38,              // >38 → fan HIGH
  HSI_FAN_MAX_ALARM: 42,         // >42 → fan MAX + alarm
  HSI_EMERGENCY: 45,             // >45 → emergency mode (continuous alarm)
};

/**
 * Get recommended temperature range for broilers based on age in DAYS
 */
export function getBroilerTempRangeByDays(ageDays: number): { 
  minTemp: number; 
  maxTemp: number;
  targetTemp: number;
  label: string;
  labelBn: string;
} {
  const range = BROILER_TEMP_CURVE_DAYS.find(r => 
    ageDays >= r.minDays && ageDays <= r.maxDays
  );
  
  const result = range || BROILER_TEMP_CURVE_DAYS[BROILER_TEMP_CURVE_DAYS.length - 1];
  return {
    ...result,
    targetTemp: (result.minTemp + result.maxTemp) / 2,
  };
}

/**
 * Get recommended temperature range for broilers based on age in WEEKS (legacy)
 */
export function getBroilerTempRange(ageWeeks: number): { minTemp: number; maxTemp: number } {
  const ageDays = ageWeeks * 7 + 1; // Convert to days (start of week)
  const range = getBroilerTempRangeByDays(ageDays);
  return { minTemp: range.minTemp, maxTemp: range.maxTemp };
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
 * Initial chick weight (in grams) by breed.
 * Standard hatchery values; falls back to 42g for unknown breeds.
 */
export function getInitialChickWeight(breed?: string | null): number {
  if (!breed) return 42;
  const b = breed.toLowerCase();
  if (b.includes('ross')) return 44;       // Ross 308
  if (b.includes('cobb')) return 42;       // Cobb 500
  if (b.includes('hubbard')) return 43;
  if (b.includes('arbor')) return 42;      // Arbor Acres
  if (b.includes('indian river')) return 42;
  if (b.includes('sonali') || b.includes('সোনালী')) return 35; // local desi cross
  return 42;
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
