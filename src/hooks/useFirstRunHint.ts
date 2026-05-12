/**
 * useFirstRunHint — one-shot hint flag persisted in localStorage (S4.2).
 *
 * Show a hint/tooltip once per browser per `key`, then never again.
 *
 * Usage:
 *   const { show, dismiss } = useFirstRunHint('kpi-tile-tap');
 *   {show && <Tooltip>...</Tooltip>}
 *   <button onClick={dismiss}>বুঝেছি</button>
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'farmeye-hint-seen:';

export function useFirstRunHint(key: string) {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(storageKey);
      if (!seen) setShow(true);
    } catch {
      // Storage unavailable (private mode); silently skip the hint.
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // Ignore storage failures.
    }
  }, [storageKey]);

  /** Reset (for QA / settings → "show hints again") */
  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore.
    }
    setShow(true);
  }, [storageKey]);

  return { show, dismiss, reset };
}

/** Reset every first-run hint (settings → "show hints again") */
export function resetAllFirstRunHints() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach(k => window.localStorage.removeItem(k));
  } catch {
    // Ignore.
  }
}
