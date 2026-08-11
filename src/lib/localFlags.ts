/**
 * localFlags — SSOT for browser-persisted boolean flags (Phase 5j).
 *
 * Every read/write is storage-failure safe (private mode, disabled storage,
 * quota errors) so callers never need their own try/catch. Pure key helpers
 * are exported separately so they can be unit-tested without a DOM.
 */

export const HINT_PREFIX = 'farmeye-hint-seen:';
export const WORKER_UNLOCK_PREFIX = 'worker_mode_unlocked:';

/** localStorage key for a one-shot first-run hint. */
export function hintKey(key: string): string {
  return `${HINT_PREFIX}${key}`;
}

/** localStorage key marking this device as worker-unlocked for a farm. */
export function workerUnlockKey(farmId: string): string {
  return `${WORKER_UNLOCK_PREFIX}${farmId}`;
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readFlag(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setFlag(key: string, value = '1'): void {
  try {
    storage()?.setItem(key, value);
  } catch {
    /* storage unavailable — flag is best-effort */
  }
}

export function clearFlag(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* noop */
  }
}

export function isFlagSet(key: string): boolean {
  return readFlag(key) === '1';
}

/** Remove every key that starts with `prefix`. Returns removed key count. */
export function clearFlagsByPrefix(prefix: string): number {
  const s = storage();
  if (!s) return 0;
  const keys: string[] = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch {
    /* noop */
  }
  return keys.length;
}
