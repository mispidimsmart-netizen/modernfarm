/**
 * Pure safety-lock evaluation for the Control page.
 *
 * Mirrors the ESP32 hardcoded invariants on the client so the UI never offers
 * a "stop" action the hardware would immediately override (relay oscillation).
 * Hardware remains the source of truth — this only gates the UI affordance.
 */

export const COOLING_DEVICES = ['fan', 'circulation_fan', 'ceiling_fan', 'fogger', 'sprinkler'] as const;

export interface SafetyLockInput {
  deviceKey: string;
  temperature: number;
  ammonia: number;
  tempMax: number;
  ammoniaMax: number;
  /** farm_settings.safety_engine_enabled — undefined/null treated as enabled. */
  engineEnabled?: boolean | null;
}

export interface SafetyLockResult {
  isSafetyLocked: boolean;
  reason?: { bn: string; en: string };
}

export function evaluateSafetyLock({
  deviceKey,
  temperature,
  ammonia,
  tempMax,
  ammoniaMax,
  engineEnabled,
}: SafetyLockInput): SafetyLockResult {
  const enabled = engineEnabled !== false;
  const heatActive = enabled && temperature > tempMax;
  const gasActive = enabled && ammonia > ammoniaMax;

  const heatLock = heatActive && (COOLING_DEVICES as readonly string[]).includes(deviceKey);
  const gasLock = gasActive && (deviceKey === 'fan' || deviceKey === 'circulation_fan');

  if (!heatLock && !gasLock) return { isSafetyLocked: false };

  return {
    isSafetyLocked: true,
    reason: heatActive
      ? { bn: '🔥 হিট স্ট্রেস সুরক্ষা সক্রিয় — ঠান্ডা রাখতে চালু থাকবে', en: '🔥 Heat stress protection active — must stay ON to cool' }
      : { bn: '💨 গ্যাস পার্জ সক্রিয় — অ্যামোনিয়া দূর করতে চালু থাকবে', en: '💨 Gas purge active — must stay ON to clear ammonia' },
  };
}
