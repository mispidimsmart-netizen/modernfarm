/**
 * MODE-01 — Written mode-precedence contract (single source of truth).
 *
 * The audit found that each cloud path re-implemented its own ad-hoc order of
 * checks (one looked at `automation_mode`, another only at `manual_override`,
 * a third at neither), so the same reading could produce different desired
 * state depending on which endpoint processed it. This module fixes the ladder
 * in one place; every cloud writer MUST gate through `evaluateModeGate()`.
 *
 * Precedence — highest wins, first match stops evaluation:
 *
 *   1. FAIL_SAFE / OFFLINE device mode      → cloud writes nothing (board owns it)
 *   2. Emergency Survival Mode active       → cloud writes nothing
 *   3. safety_engine_enabled === false      → cloud writes nothing
 *   4. automation_mode === 'MANUAL'         → cloud writes nothing
 *   5. manual_override (device) or
 *      desired_manual_override (app)        → cloud writes nothing
 *   6. hsi_automation_enabled === false     → HSI writer only: nothing
 *   7. AUTO                                 → cloud writes desired_* columns,
 *      per-actuator timed overrides from the Control page still win
 *      (`skipFan` / `skipAlarm`).
 *
 * Hardware remains source of truth throughout: this gate only decides whether
 * the cloud may express an *intent* in `desired_*`; the ESP32 always makes the
 * final relay decision and reports actual state back.
 */

export type DeviceMode = 'AUTO' | 'MANUAL' | 'FAIL_SAFE' | 'OFFLINE' | string | null | undefined;

export interface ModeGateInput {
  /** `farm_settings.automation_mode`. */
  automationMode?: DeviceMode;
  /** `device_status.mode` reported by the board, when known. */
  deviceMode?: DeviceMode;
  /** `farm_settings.safety_engine_enabled` (null/undefined treated as enabled). */
  safetyEngineEnabled?: boolean | null;
  /** `farm_settings.hsi_automation_enabled` — only gates the HSI writer. */
  hsiAutomationEnabled?: boolean | null;
  /** True while Emergency Survival Mode runs on the board. */
  emergencyActive?: boolean | null;
  /** `device_status.manual_override` (set by the board). */
  manualOverride?: boolean | null;
  /** `device_status.desired_manual_override` (set from the app). */
  desiredManualOverride?: boolean | null;
  /** `device_status.desired_fan_expires_at` — timed Control-page override. */
  fanOverrideUntil?: string | null;
  /** `device_status.desired_alarm_expires_at` — timed Control-page override. */
  alarmOverrideUntil?: string | null;
  /** Set true for the HSI writer so rule 6 applies. */
  requiresHSIAutomation?: boolean;
}

export type ModeGateReason =
  | 'DEVICE_FAIL_SAFE'
  | 'DEVICE_OFFLINE'
  | 'EMERGENCY_ACTIVE'
  | 'SAFETY_ENGINE_DISABLED'
  | 'MANUAL_MODE'
  | 'MANUAL_OVERRIDE'
  | 'HSI_AUTOMATION_DISABLED'
  | 'TIMED_OVERRIDE_ALL';

export interface ModeGateResult {
  /** True when the cloud may write `desired_*` columns. */
  allow: boolean;
  /** Machine-readable skip reason, logged and returned to callers for audit. */
  reason?: ModeGateReason;
  /** Fan intent must not be written (timed override still counting down). */
  skipFan: boolean;
  /** Alarm intent must not be written (timed override still counting down). */
  skipAlarm: boolean;
}

const stillActive = (ts: unknown): boolean =>
  !!ts && new Date(ts as string).getTime() > Date.now();

const deny = (reason: ModeGateReason): ModeGateResult => ({
  allow: false, reason, skipFan: true, skipAlarm: true,
});

export function evaluateModeGate(input: ModeGateInput): ModeGateResult {
  const deviceMode = (input.deviceMode || '').toUpperCase();
  if (deviceMode === 'FAIL_SAFE') return deny('DEVICE_FAIL_SAFE');
  if (deviceMode === 'OFFLINE') return deny('DEVICE_OFFLINE');

  if (input.emergencyActive === true) return deny('EMERGENCY_ACTIVE');

  if (input.safetyEngineEnabled === false) return deny('SAFETY_ENGINE_DISABLED');

  const automationMode = (input.automationMode || '').toUpperCase();
  if (automationMode === 'MANUAL' || deviceMode === 'MANUAL') return deny('MANUAL_MODE');

  if (input.manualOverride === true || input.desiredManualOverride === true) {
    return deny('MANUAL_OVERRIDE');
  }

  if (input.requiresHSIAutomation && input.hsiAutomationEnabled === false) {
    return deny('HSI_AUTOMATION_DISABLED');
  }

  const skipFan = stillActive(input.fanOverrideUntil);
  const skipAlarm = stillActive(input.alarmOverrideUntil);
  if (skipFan && skipAlarm) {
    return { allow: false, reason: 'TIMED_OVERRIDE_ALL', skipFan, skipAlarm };
  }

  return { allow: true, skipFan, skipAlarm };
}
