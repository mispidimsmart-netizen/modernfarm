/**
 * Farm setup detection — PURE logic (SSOT).
 *
 * Season detection from weather and profile detection from bird age.
 * No React / no network here so it can be unit tested.
 */

export type FarmType = 'layer' | 'broiler';
export type Season = 'summer' | 'winter' | 'rainy';
export type FarmSize = 'small' | 'medium' | 'large';
export type ProfileType =
  | 'chick_care'
  | 'grower'
  | 'production'
  | 'heat_protection'
  | 'cold_protection';

/** Auto-detect season based on temperature, humidity and rain probability. */
export function detectSeason(
  temperature: number | null,
  humidity: number | null,
  rainProbability: number | null,
): Season {
  if (!temperature) return 'summer';

  // High rain probability = rainy season
  if (rainProbability && rainProbability > 50) return 'rainy';
  if (humidity && humidity > 85 && rainProbability && rainProbability > 30) return 'rainy';

  // Temperature based detection
  if (temperature < 20) return 'winter';
  if (temperature >= 30) return 'summer';

  // Moderate temperature with high humidity = likely rainy
  if (temperature >= 20 && temperature < 30 && humidity && humidity > 80) return 'rainy';

  return 'summer';
}

/** Auto-detect care profile based on bird age (days) and farm type. */
export function detectProfile(ageDays: number, farmType: FarmType): ProfileType {
  if (farmType === 'broiler') {
    if (ageDays <= 10) return 'chick_care';
    if (ageDays <= 21) return 'grower';
    return 'production';
  }
  // Layer profiles are week based
  const ageWeeks = Math.floor(ageDays / 7);
  if (ageWeeks <= 4) return 'chick_care';
  if (ageWeeks <= 18) return 'grower';
  return 'production';
}
