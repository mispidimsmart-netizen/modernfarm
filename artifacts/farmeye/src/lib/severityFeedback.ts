/**
 * severityFeedback — centralized haptics + sound for severity-driven UI (S3.2)
 *
 * Triggers vibration (where supported) and an optional short beep via WebAudio.
 * Respects:
 *   - User preference: localStorage 'severity_feedback_muted' = '1'
 *   - prefers-reduced-motion: skips vibration if the OS asked for less motion
 *   - Per-key dedupe within `cooldownMs` so the same alert doesn't buzz repeatedly
 *
 * Use for *transitions* into a danger/warning state, not on every render.
 *
 * Example:
 *   useEffect(() => {
 *     if (alert) severityFeedback('danger', { dedupeKey: alert.id });
 *   }, [alert?.id]);
 */

export type Severity = 'normal' | 'warning' | 'danger';

const MUTE_KEY = 'severity_feedback_muted';
const DEFAULT_COOLDOWN_MS = 30_000;

// Per-dedupe-key last-fired timestamps (in-memory, resets on reload — fine).
const lastFired = new Map<string, number>();

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (_audioCtx) return _audioCtx;
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    _audioCtx = new Ctor();
    return _audioCtx;
  } catch {
    return null;
  }
}

export function isSeverityFeedbackMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSeverityFeedbackMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch { /* noop */ }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined') return;
  if (prefersReducedMotion()) return;
  // @ts-ignore — vibrate not in all TS lib targets
  if (typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

/** Short beep — 1 or 2 quick tones depending on severity. */
function beep(severity: Severity) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  // Resume on iOS / Chrome autoplay policy (only works after a user gesture)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => { /* noop */ });
  }
  const tones = severity === 'danger' ? [880, 660] : [660];
  const now = ctx.currentTime;
  tones.forEach((freq, i) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startAt = now + i * 0.16;
      const endAt = startAt + 0.12;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(endAt + 0.02);
    } catch { /* noop */ }
  });
}

interface FeedbackOptions {
  /** Stable id (e.g. alert id) so we don't fire repeatedly. */
  dedupeKey?: string;
  /** Override default cooldown (ms). */
  cooldownMs?: number;
  /** Force-play even if muted (rare — only for explicit user-initiated tests). */
  force?: boolean;
  /** Skip beep, vibrate only. */
  silent?: boolean;
}

export function severityFeedback(severity: Severity, opts: FeedbackOptions = {}): void {
  if (severity === 'normal') return;
  const { dedupeKey, cooldownMs = DEFAULT_COOLDOWN_MS, force = false, silent = false } = opts;

  if (!force && isSeverityFeedbackMuted()) return;

  if (dedupeKey) {
    const last = lastFired.get(dedupeKey) ?? 0;
    if (Date.now() - last < cooldownMs) return;
    lastFired.set(dedupeKey, Date.now());
  }

  if (severity === 'danger') {
    vibrate([180, 80, 180, 80, 240]);
    if (!silent) beep('danger');
  } else {
    // warning
    vibrate([100, 60, 100]);
    if (!silent) beep('warning');
  }
}
