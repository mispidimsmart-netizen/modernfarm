/**
 * Pure helpers for Layer Batch UI (SSOT).
 * No React / no data-fetching here so the logic stays unit-testable.
 */

export interface BatchAgeInput {
  start_date: string;
  age_at_start_weeks: number;
}

/** Format an ISO date for Bengali locale display. Returns em-dash for null. */
export function formatDateBn(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Current flock age in weeks = age at batch start + full weeks elapsed since start.
 * Never returns less than the starting age (guards against future start dates).
 */
export function ageWeeksFromBatch(b: BatchAgeInput, todayIso?: string): number {
  const start = new Date(b.start_date);
  const today = todayIso ? new Date(todayIso) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(today.getTime())) {
    return b.age_at_start_weeks;
  }
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (days < 0) return b.age_at_start_weeks;
  return b.age_at_start_weeks + Math.floor(days / 7);
}

/** Duration of a batch in days (inclusive of partial day rounding down). */
export function batchDurationDays(startIso: string, endIso?: string | null): number {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}
