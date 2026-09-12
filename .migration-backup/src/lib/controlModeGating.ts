/**
 * Pure gating helpers for ControlPage — Auto/Manual mode × Safety Engine toggle.
 *
 * These functions encode the invariants that combine:
 *   - automation_mode: 'AUTO' | 'MANUAL'
 *   - safety_engine_enabled: boolean (default TRUE when null/undefined)
 *   - current sensor readings vs. thresholds
 *
 * All device keys use the canonical UI keys (fan, heater, light, alarm, etc.).
 */

export type AutomationMode = 'AUTO' | 'MANUAL';

export interface SafetyContext {
  mode: AutomationMode;
  safetyEngineEnabled: boolean; // treat null/undefined as true at call site
  temperature: number;
  ammonia: number;
  temperatureMax: number;
  ammoniaMax: number;
}

export const COOLING_DEVICES = [
  'fan',
  'circulation_fan',
  'ceiling_fan',
  'fogger',
  'sprinkler',
] as const;

export type DeviceKey =
  | 'fan'
  | 'heater'
  | 'light'
  | 'alarm'
  | 'circulation_fan'
  | 'ceiling_fan'
  | 'fogger'
  | 'sprinkler';

/** Heat-stress protection currently forcing cooling devices ON. */
export function isHeatProtectionActive(ctx: SafetyContext): boolean {
  return ctx.safetyEngineEnabled && ctx.temperature > ctx.temperatureMax;
}

/** Ammonia/gas-purge protection forcing fans ON. */
export function isGasProtectionActive(ctx: SafetyContext): boolean {
  return ctx.safetyEngineEnabled && ctx.ammonia > ctx.ammoniaMax;
}

/**
 * Should the given device be treated as safety-locked (user cannot stop it)?
 * When Safety Engine is OFF, nothing is safety-locked (even in danger conditions).
 */
export function isDeviceSafetyLocked(
  deviceKey: DeviceKey,
  ctx: SafetyContext,
): boolean {
  const heat = isHeatProtectionActive(ctx);
  const gas = isGasProtectionActive(ctx);
  if (heat && (COOLING_DEVICES as readonly string[]).includes(deviceKey)) return true;
  if (gas && (deviceKey === 'fan' || deviceKey === 'circulation_fan')) return true;
  return false;
}

/**
 * Can the user issue a manual command right now for this device?
 *
 * Matrix:
 *   MANUAL + engine OFF → always yes (raw control)
 *   MANUAL + engine ON  → yes, but safety-locked devices cannot be turned OFF
 *   AUTO   + engine OFF → yes (temporary override only)
 *   AUTO   + engine ON  → yes, except safety-locked devices cannot be turned OFF
 */
export function canUserCommand(
  deviceKey: DeviceKey,
  ctx: SafetyContext,
  intent: 'on' | 'off',
): boolean {
  if (intent === 'on') return true;
  return !isDeviceSafetyLocked(deviceKey, ctx);
}

/**
 * When a temporary-override timer expires, should we clear desired_* to null
 * and hand control back to automation?
 *
 * If a safety protection is still active AND engine is ON, keep the device
 * running to avoid relay oscillation.
 */
export function shouldClearOnTimerExpiry(
  deviceKey: DeviceKey,
  ctx: SafetyContext,
): boolean {
  return !isDeviceSafetyLocked(deviceKey, ctx);
}

/**
 * Should the cloud (edge functions) push safety-driven desired_* overrides?
 * Mirrors the gate applied in supabase/functions/esp32-api & automation-engine.
 */
export function shouldCloudApplySafetyAutomation(ctx: {
  mode: AutomationMode;
  safetyEngineEnabled: boolean;
}): boolean {
  if (ctx.mode === 'MANUAL') return false;
  if (!ctx.safetyEngineEnabled) return false;
  return true;
}

/** Should the "Safety Locked Devices" panel be visible on the Control page? */
export function shouldShowSafetyLockedPanel(safetyEngineEnabled: boolean): boolean {
  return safetyEngineEnabled;
}
