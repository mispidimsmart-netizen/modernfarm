/**
 * Single source of truth for Heat Stress Index (HSI) *band classification*.
 *
 * The formula lives in `_shared/hsi-formula.ts`; this file owns the thresholds
 * and — importantly — the comparison semantics. The ESP32 firmware
 * (public/esp32-industrial.ino) classifies with STRICT greater-than:
 *
 *   if (hsi > hsiCritical)  -> EMERGENCY
 *   if (hsi > hsiEmergency) -> DANGER
 *   if (hsi > hsiFanHigh)   -> WARNING (fan HIGH)
 *   if (hsi > hsiFanLow)    -> WARNING (fan LOW)
 *
 * Cloud code used to mix `>` and `>=` (and hardcode 75/80/85 in one path while
 * reading farm_settings in another), so a reading exactly on a threshold could
 * act differently in the cloud than on the board. Every cloud path now calls
 * `classifyHSI()` so the semantics match the firmware exactly.
 */

export type HSIBandLevel = 'normal' | 'mild' | 'moderate' | 'severe' | 'emergency';

export interface HSIBands {
  /** Fan LOW threshold — firmware `hsiFanLow`, settings `hsi_mild_threshold`. */
  mild: number;
  /** Fan HIGH threshold — firmware `hsiFanHigh`, settings `hsi_moderate_threshold`. */
  moderate: number;
  /** Emergency ventilation — firmware `hsiEmergency`, settings `hsi_severe_threshold`. */
  severe: number;
  /** Critical — firmware `hsiCritical`, settings `hsi_emergency_threshold`. */
  emergency: number;
}

/** Firmware constants, kept byte-for-byte in sync with the .ino defines. */
export const FIRMWARE_HSI_BANDS: Record<'layer' | 'broiler', HSIBands> = {
  layer: { mild: 75, moderate: 80, severe: 85, emergency: 90 },
  broiler: { mild: 75, moderate: 78, severe: 82, emergency: 86 },
};

/** Fan intent per band — identical in every cloud path. */
export const HSI_FAN_SPEED: Record<HSIBandLevel, 'OFF' | 'LOW' | 'HIGH'> = {
  normal: 'OFF',
  mild: 'LOW',
  moderate: 'HIGH',
  severe: 'HIGH',
  emergency: 'HIGH',
};

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Resolve the bands to use: farmer-configured `farm_settings` values when
 * present, otherwise the firmware defaults for the flock type. Values are
 * forced into ascending order so a mis-typed setting cannot make a higher band
 * unreachable.
 */
export function resolveHSIBands(
  settings: Record<string, unknown> | null | undefined,
  flockType: 'layer' | 'broiler' = 'layer',
): HSIBands {
  const fallback = FIRMWARE_HSI_BANDS[flockType] ?? FIRMWARE_HSI_BANDS.layer;
  const mild = num(settings?.hsi_mild_threshold) ?? fallback.mild;
  let moderate = num(settings?.hsi_moderate_threshold) ?? fallback.moderate;
  let severe = num(settings?.hsi_severe_threshold) ?? fallback.severe;
  let emergency = num(settings?.hsi_emergency_threshold) ?? fallback.emergency;

  moderate = Math.max(moderate, mild);
  severe = Math.max(severe, moderate);
  emergency = Math.max(emergency, severe);

  return { mild, moderate, severe, emergency };
}

/** Firmware-identical classification (strict `>` at every boundary). */
export function classifyHSI(hsi: number, bands: HSIBands): HSIBandLevel {
  if (hsi > bands.emergency) return 'emergency';
  if (hsi > bands.severe) return 'severe';
  if (hsi > bands.moderate) return 'moderate';
  if (hsi > bands.mild) return 'mild';
  return 'normal';
}

/** Maps the fine-grained band to the coarse level used by `applyHSIAutomation`. */
export function toAutomationLevel(level: HSIBandLevel): 'NORMAL' | 'MILD' | 'HIGH' | 'DANGER' {
  switch (level) {
    case 'emergency':
    case 'severe':
      return 'DANGER';
    case 'moderate':
      return 'HIGH';
    case 'mild':
      return 'MILD';
    default:
      return 'NORMAL';
  }
}
