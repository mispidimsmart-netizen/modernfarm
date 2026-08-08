/**
 * Lighting schedule evaluation.
 *
 * Converts a stored `lighting_schedule` row into the brightness the shed
 * should be at right now, including eased fade-in / fade-out ramps. Pure and
 * time-dependent only through `new Date()`.
 */

export type LightingPhase = 'off' | 'on' | 'manual' | 'fade-in' | 'fade-out';

/** Ease-in-out quadratic — smooth ramp with no abrupt steps at the edges. */
const easeInOutQuad = (t: number): number =>
  (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Calculate current brightness (%) and phase from a lighting schedule row.
 * Returns `{ brightness: 0, phase: 'off' }` when no schedule is configured.
 */
// deno-lint-ignore no-explicit-any
export function calculateCurrentBrightness(schedule: any): { brightness: number; phase: LightingPhase } {
  if (!schedule) {
    return { brightness: 0, phase: 'off' };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Times are stored as "HH:MM:SS" or "HH:MM".
  const startTime = schedule.start_time?.toString() || '05:00:00';
  const endTime = schedule.end_time?.toString() || '21:00:00';

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  const fadeInMinutes = schedule.fade_in_minutes || 30;
  const fadeOutMinutes = schedule.fade_out_minutes || 30;
  const minBrightness = schedule.min_brightness || 0;
  const maxBrightness = schedule.max_brightness || 100;
  const gradualEnabled = schedule.gradual_enabled !== false;

  // Manual override wins over the schedule.
  if (schedule.manual_override) {
    return { brightness: maxBrightness, phase: 'manual' };
  }

  // Gradual disabled → simple ON/OFF.
  if (!gradualEnabled) {
    const isActive = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    return {
      brightness: isActive ? maxBrightness : minBrightness,
      phase: isActive ? 'on' : 'off',
    };
  }

  const fadeInEnd = startMinutes + fadeInMinutes;
  const fadeOutStart = endMinutes - fadeOutMinutes;

  // Before schedule starts (OFF)
  if (currentMinutes < startMinutes) {
    return { brightness: minBrightness, phase: 'off' };
  }

  // Fade-in (morning ramp up)
  if (currentMinutes >= startMinutes && currentMinutes < fadeInEnd) {
    const progress = (currentMinutes - startMinutes) / fadeInMinutes;
    const brightness = Math.round(minBrightness + (maxBrightness - minBrightness) * easeInOutQuad(progress));
    return { brightness, phase: 'fade-in' };
  }

  // Full ON
  if (currentMinutes >= fadeInEnd && currentMinutes < fadeOutStart) {
    return { brightness: maxBrightness, phase: 'on' };
  }

  // Fade-out (evening ramp down)
  if (currentMinutes >= fadeOutStart && currentMinutes < endMinutes) {
    const progress = (currentMinutes - fadeOutStart) / fadeOutMinutes;
    const brightness = Math.round(maxBrightness - (maxBrightness - minBrightness) * easeInOutQuad(progress));
    return { brightness, phase: 'fade-out' };
  }

  // After schedule ends (OFF)
  return { brightness: minBrightness, phase: 'off' };
}
