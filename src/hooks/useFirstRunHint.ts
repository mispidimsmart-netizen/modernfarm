/**
 * useFirstRunHint — one-shot hint flag persisted in localStorage (S4.2).
 *
 * Thin adapter over `@/lib/localFlags` (SSOT for browser-persisted flags).
 *
 * Usage:
 *   const { show, dismiss } = useFirstRunHint('kpi-tile-tap');
 */

import { useCallback, useEffect, useState } from 'react';
import { HINT_PREFIX, hintKey, readFlag, setFlag, clearFlag, clearFlagsByPrefix } from '@/lib/localFlags';

export function useFirstRunHint(key: string) {
  const storageKey = hintKey(key);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!readFlag(storageKey)) setShow(true);
  }, [storageKey]);

  const dismiss = useCallback(() => {
    setShow(false);
    setFlag(storageKey);
  }, [storageKey]);

  /** Reset (for QA / settings -> "show hints again") */
  const reset = useCallback(() => {
    clearFlag(storageKey);
    setShow(true);
  }, [storageKey]);

  return { show, dismiss, reset };
}

/** Reset every first-run hint (settings -> "show hints again") */
export function resetAllFirstRunHints() {
  clearFlagsByPrefix(HINT_PREFIX);
}
