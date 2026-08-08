/**
 * Pure domain helpers for the ESP32 API.
 *
 * Everything here is deterministic and side-effect free, which makes the
 * behaviour unit-testable without a database or network.
 */

/** Brooding temperature curve (°C) by broiler age in days. */
const BROILER_TEMP_CURVE = [
  { minDays: 1,  maxDays: 3,   minTemp: 33, maxTemp: 34 },
  { minDays: 4,  maxDays: 7,   minTemp: 32, maxTemp: 32 },
  { minDays: 8,  maxDays: 14,  minTemp: 30, maxTemp: 30 },
  { minDays: 15, maxDays: 21,  minTemp: 28, maxTemp: 28 },
  { minDays: 22, maxDays: 28,  minTemp: 26, maxTemp: 26 },
  { minDays: 29, maxDays: 35,  minTemp: 24, maxTemp: 24 },
  { minDays: 36, maxDays: 999, minTemp: 22, maxTemp: 23 },
] as const;

/** Target temperature band for a broiler flock of the given age. */
export function getBroilerTargetTemp(ageDays: number): { min: number; max: number } {
  for (const range of BROILER_TEMP_CURVE) {
    if (ageDays >= range.minDays && ageDays <= range.maxDays) {
      return { min: range.minTemp, max: range.maxTemp };
    }
  }
  return { min: 22, max: 23 }; // Default for 36+ days
}

/** Parse an automation action such as `fan_on` into a device/state pair. */
export function parseAction(action: string): { device: string; state: boolean } | null {
  const match = action.match(/^(fan|light|alarm)_(on|off)$/i);
  if (!match) return null;
  return {
    device: match[1].toLowerCase(),
    state: match[2].toLowerCase() === 'on',
  };
}

/**
 * Connection quality score (0–100) derived from signal strength, the gap since
 * the last successful sync, and the current failed-sync streak.
 */
export function computeQualityScore(rssi: number | null, gapSec: number, failedSyncs: number): number {
  let score = 100;
  // RSSI penalty (best ~ -50 dBm, weak ~ -85 dBm)
  if (rssi != null) {
    if (rssi <= -85) score -= 40;
    else if (rssi <= -75) score -= 25;
    else if (rssi <= -65) score -= 10;
  }
  // Sync gap penalty (>60 s starts hurting)
  if (gapSec > 300) score -= 30;
  else if (gapSec > 120) score -= 15;
  else if (gapSec > 60) score -= 5;
  // Failure streak
  if (failedSyncs >= 5) score -= 30;
  else if (failedSyncs >= 2) score -= 15;
  return Math.max(0, Math.min(100, score));
}
