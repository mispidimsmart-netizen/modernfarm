/**
 * HoldToConfirmButton — Press and hold to trigger destructive actions.
 *
 * Standard for industrial safety: heater toggle, emergency stop, manual
 * override, mass commands. Prevents accidental taps.
 *
 * Behavior:
 *  - User presses (mouse/touch) → progress ring fills over `holdMs` (default 800ms)
 *  - Release before complete → cancelled (no action)
 *  - Hold to completion → onConfirm fires + haptic vibration (if supported)
 *  - Disabled state respected
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface HoldToConfirmButtonProps {
  onConfirm: () => void | Promise<void>;
  /** Total hold time in ms. Default: 800 */
  holdMs?: number;
  /** Idle/initial label */
  label: string;
  /** Label shown while holding */
  holdingLabel?: string;
  /** Optional icon element */
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Visual variant. Default: 'destructive' */
  variant?: 'destructive' | 'warning' | 'primary';
  /** Additional className for outer button */
  className?: string;
  /** ARIA label override */
  'aria-label'?: string;
}

const VARIANTS = {
  destructive: {
    base: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    fill: 'bg-white/30',
  },
  warning: {
    base: 'bg-amber-600 text-white hover:bg-amber-700',
    fill: 'bg-white/30',
  },
  primary: {
    base: 'bg-primary text-primary-foreground hover:bg-primary/90',
    fill: 'bg-white/30',
  },
} as const;

export function HoldToConfirmButton({
  onConfirm,
  holdMs = 800,
  label,
  holdingLabel,
  icon,
  disabled,
  variant = 'destructive',
  className,
  ...rest
}: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0); // 0..1
  const [holding, setHolding] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const v = VARIANTS[variant];

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setHolding(false);
    setProgress(0);
  }, []);

  const tick = useCallback(() => {
    if (startRef.current == null) return;
    const elapsed = performance.now() - startRef.current;
    const ratio = Math.min(1, elapsed / holdMs);
    setProgress(ratio);
    if (ratio >= 1) {
      if (!firedRef.current) {
        firedRef.current = true;
        // Haptic feedback (mobile only)
        try { navigator.vibrate?.(40); } catch { /* unsupported */ }
        Promise.resolve(onConfirm()).catch(() => { /* caller handles */ });
      }
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [holdMs, onConfirm, stop]);

  const begin = useCallback(() => {
    if (disabled) return;
    if (rafRef.current != null) return;
    firedRef.current = false;
    startRef.current = performance.now();
    setHolding(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, tick]);

  // Cleanup on unmount
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={begin}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={(e) => { e.preventDefault(); begin(); }}
      onTouchEnd={stop}
      onTouchCancel={stop}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !holding) { e.preventDefault(); begin(); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') stop(); }}
      aria-label={rest['aria-label'] ?? label}
      aria-pressed={holding}
      className={cn(
        'relative overflow-hidden select-none touch-none',
        'h-12 px-5 rounded-lg font-semibold text-sm',
        'flex items-center justify-center gap-2',
        'shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        v.base,
        holding && 'ring-2 ring-offset-2 ring-offset-background ring-current',
        className,
      )}
    >
      {/* Progress fill */}
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 transition-none', v.fill)}
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        <span>{holding && holdingLabel ? holdingLabel : label}</span>
        {holding && (
          <span className="text-xs opacity-80 tabular-nums">
            {Math.round(progress * 100)}%
          </span>
        )}
      </span>
    </button>
  );
}

export default HoldToConfirmButton;
