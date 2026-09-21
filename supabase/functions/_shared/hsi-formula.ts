/**
 * Single source of truth for the Heat Stress Index (HSI) formula.
 *
 * Hardware is source of truth: this MUST stay numerically identical to
 * `calculateHSI()` in the v8 firmware (public/esp32-industrial.ino) and to
 * `calculateHSI()` in the app (src/lib/heatStressIndex.ts).
 *
 * v8 firmware / UI use the poultry Temperature-Humidity Index (THI):
 *   THI = 0.8*T + (RH/100) * (T - 14.4) + 46.4
 *
 * (An earlier cloud revision used the Steadman variant here; it agreed with the
 * THI to ~0.1 in the operating band but was still a second formula, so a reading
 * sitting exactly on a threshold could decide differently in the cloud than on
 * the board. Every cloud path now uses the firmware formula.)
 *
 * Golden vectors (THI, 1 decimal) — keep in sync with firmware tests:
 *   25°C/60% -> 72.8 | 30°C/70% -> 81.3 | 35°C/80% -> 90.9 | 40°C/80% -> 98.9
 */
export const HSI_FORMULA_VERSION = 'v8-thi-1';

export function calculateHSI(temperature: number, humidity: number): number {
  const t = typeof temperature === 'number' ? temperature : NaN;
  const rh = typeof humidity === 'number' ? humidity : NaN;
  if (!Number.isFinite(t) || !Number.isFinite(rh)) return NaN;
  const rhClamped = Math.max(0, Math.min(100, rh));
  return 0.8 * t + (rhClamped / 100) * (t - 14.4) + 46.4;
}
