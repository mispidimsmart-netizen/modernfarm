/**
 * Phase 5d — Bird age SSOT (pure).
 *
 * Age math was duplicated inline in three hooks (`useAutomationStatus`,
 * `useBroilerEnvironment`, `useBroilerAutomation`) with "avoid circular import"
 * comments. This module owns the formula so all consumers stay identical to
 * `useBirdAge`: floor(elapsed / 24h), clamped to 0.
 */
export interface BirdAge {
  days: number;
  weeks: number;
}

export const DAY_MS = 86_400_000;

/** Days elapsed since `startDate`, never negative. */
export function ageDaysFrom(startDate: string | Date, nowMs: number = Date.now()): number {
  const startMs = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
  if (!Number.isFinite(startMs)) return 0;
  return Math.max(0, Math.floor((nowMs - startMs) / DAY_MS));
}

/** Broiler/flock age in days + weeks from a batch start date. */
export function calculateBirdAge(startDate: string | Date, nowMs: number = Date.now()): BirdAge {
  const days = ageDaysFrom(startDate, nowMs);
  return { days, weeks: Math.floor(days / 7) };
}

/** Layer age = age at batch start + whole weeks elapsed. */
export function calculateLayerAgeWeeks(
  startDate: string | Date,
  ageAtStartWeeks: number = 0,
  nowMs: number = Date.now(),
): number {
  const startMs = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
  if (!Number.isFinite(startMs)) return ageAtStartWeeks;
  const weeksElapsed = Math.max(0, Math.floor((nowMs - startMs) / (7 * DAY_MS)));
  return ageAtStartWeeks + weeksElapsed;
}
