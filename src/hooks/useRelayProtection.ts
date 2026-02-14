/**
 * Relay Protection — DISPLAY ONLY
 * 
 * All relay protection logic (toggle limits, runtime guards, stuck detection)
 * runs on ESP32 firmware and backend safety-engine.
 * This hook reads safety_status for display purposes only.
 */

import { useSafetyStatus } from './useSafetyStatus';

type RelayId = 'fan' | 'heater' | 'light' | 'alarm' | 'fogger' | 'circulation_fan';

export interface RelayProtectionStatus {
  lockedRelays: RelayId[];
  violations: number;
  stuckRelayDetected: RelayId | null;
  heaterRuntimeMs: number;
  motorRuntimeMs: number;
}

export function useRelayProtection() {
  const safety = useSafetyStatus();

  const status: RelayProtectionStatus = {
    lockedRelays: (safety.status.locked_relays || []) as RelayId[],
    violations: safety.status.relay_violations || 0,
    stuckRelayDetected: (safety.stuckRelayDetected as RelayId) || null,
    heaterRuntimeMs: safety.status.heater_runtime_ms || 0,
    motorRuntimeMs: safety.status.motor_runtime_ms || 0,
  };

  // Display-only stubs — actual protection runs on firmware
  const canToggle = (_relayId: RelayId, _newState: boolean): boolean => {
    // Relay toggle permission is enforced by firmware, not browser
    // This always returns true; firmware will reject unsafe toggles
    return true;
  };

  const checkRuntimeLimits = (): RelayId[] => {
    // Runtime limits enforced by firmware — nothing to return from browser
    return [];
  };

  const registerHeaterOff = (_currentTemp: number) => {
    // Heater off tracking is firmware-side
  };

  const checkStuckRelay = (_currentTemp: number): 'welded' | 'ok' | 'checking' => {
    // Stuck relay detection runs on firmware/backend
    if (safety.stuckRelayDetected) return 'welded';
    return 'ok';
  };

  return {
    canToggle,
    checkRuntimeLimits,
    registerHeaterOff,
    checkStuckRelay,
    status,
  };
}
