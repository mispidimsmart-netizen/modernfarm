/**
 * MANUAL mode — pure client-side contract helpers.
 *
 * MANUAL is absolute everywhere: the board never drives a relay on its own
 * (siren only), the cloud never writes `desired_*`, and the app never blocks
 * the operator. These helpers keep every screen agreeing on one derivation so
 * the Control page, Dashboard tiles and banners cannot drift apart.
 */

export type UiAutomationMode = 'AUTO' | 'MANUAL';

export interface ManualModeSources {
  /** `farm_settings.automation_mode` (cloud intent). */
  automationMode?: string | null;
  /** `device_status.desired_manual_override` (set from the app). */
  desiredManualOverride?: boolean | null;
  /** `device_status.manual_override` (mirrored back by the board = truth). */
  manualOverride?: boolean | null;
}

/**
 * Effective UI mode. Any single manual signal wins — a half-applied switch to
 * MANUAL must be treated as MANUAL so the UI never promises automation that is
 * already standing down.
 */
export function deriveManualMode(src: ManualModeSources): boolean {
  return (
    String(src.automationMode ?? '').toUpperCase() === 'MANUAL' ||
    src.desiredManualOverride === true ||
    src.manualOverride === true
  );
}

/** Hardware truth: only the board's own flag counts. */
export function isHardwareManualMode(src: ManualModeSources): boolean {
  return src.manualOverride === true;
}

/** True while cloud intent and board state disagree ("waiting for hardware"). */
export function isModeSyncPending(src: ManualModeSources): boolean {
  return deriveManualMode(src) !== isHardwareManualMode(src);
}

/**
 * Timed ("temporary") overrides are an AUTO-mode concept: they hand a device
 * back to automation when the timer ends. In MANUAL nothing takes over, so the
 * app must never write a `desired_*` / `expires_at` pair there.
 */
export function canUseTimedOverride(isManual: boolean): boolean {
  return !isManual;
}

/** Safety Engine / automation status tiles are hidden in MANUAL. */
export function shouldShowSafetyTiles(isManual: boolean): boolean {
  return !isManual;
}

/** Override label shown for a device: MANUAL is a permanent operator hold. */
export function manualOverrideKind(isManual: boolean): 'permanent' | 'temporary' {
  return isManual ? 'permanent' : 'temporary';
}
