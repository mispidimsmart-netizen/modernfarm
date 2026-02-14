/**
 * Relay & Hardware Protection Hook
 * 
 * Prevents relay damage and detects hardware faults:
 * 
 * 1. MIN TOGGLE INTERVAL: 5 seconds per relay
 *    - If toggling faster → lock relay 30s and log error
 * 
 * 2. STUCK RELAY DETECTION:
 *    - If command OFF but temp rising → assume stuck heater → force ventilation
 * 
 * 3. MOTOR PROTECTION:
 *    - Max runtime 2 min continuous
 *    - Cooldown 1 min after max runtime
 * 
 * 4. HEATER PROTECTION:
 *    - Max runtime 5 min continuous
 *    - Cooldown 2 min after max runtime
 */

import { useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// === PROTECTION CONSTANTS ===
const MIN_TOGGLE_INTERVAL_MS = 5 * 1000;       // 5 seconds min between toggles
const TOGGLE_VIOLATION_LOCK_MS = 30 * 1000;     // 30s lockout on violation
const MOTOR_MAX_RUNTIME_MS = 2 * 60 * 1000;     // 2 min max continuous motor
const MOTOR_COOLDOWN_MS = 1 * 60 * 1000;        // 1 min cooldown after max runtime
const HEATER_MAX_RUNTIME_MS = 5 * 60 * 1000;    // 5 min max continuous heater
const HEATER_COOLDOWN_MS = 2 * 60 * 1000;       // 2 min heater cooldown
const STUCK_HEATER_TEMP_RISE = 2;               // °C rise after OFF = stuck
const STUCK_HEATER_CHECK_WINDOW_MS = 60 * 1000; // check 60s after OFF command

type RelayId = 'fan' | 'heater' | 'light' | 'alarm' | 'fogger' | 'circulation_fan';

interface RelayState {
  lastToggleAt: number;
  lockedUntil: number;
  isOn: boolean;
  onSince: number | null;       // timestamp when turned ON
  cooldownUntil: number;
}

interface StuckRelayCheck {
  relayId: RelayId;
  offCommandAt: number;
  tempAtOff: number;
}

export interface RelayProtectionStatus {
  lockedRelays: RelayId[];
  violations: number;
  stuckRelayDetected: RelayId | null;
  heaterRuntimeMs: number;
  motorRuntimeMs: number;
}

export function useRelayProtection() {
  const { user } = useAuth();
  const relayStates = useRef<Map<RelayId, RelayState>>(new Map());
  const stuckChecks = useRef<StuckRelayCheck[]>([]);
  const violationCount = useRef(0);
  const [status, setStatus] = useState<RelayProtectionStatus>({
    lockedRelays: [],
    violations: 0,
    stuckRelayDetected: null,
    heaterRuntimeMs: 0,
    motorRuntimeMs: 0,
  });

  const getRelayState = useCallback((relayId: RelayId): RelayState => {
    if (!relayStates.current.has(relayId)) {
      relayStates.current.set(relayId, {
        lastToggleAt: 0,
        lockedUntil: 0,
        isOn: false,
        onSince: null,
        cooldownUntil: 0,
      });
    }
    return relayStates.current.get(relayId)!;
  }, []);

  const logViolation = useCallback(async (relayId: RelayId, reason: string) => {
    if (!user) return;
    try {
      await (supabase.from('farm_audit_logs') as any).insert({
        user_id: user.id,
        user_email: user.email || '',
        action_type: 'relay_protection_triggered',
        action_category: 'safety',
        severity: 'warning',
        source: 'relay_protection',
        target_entity: relayId,
        metadata: { reason, violations: violationCount.current },
      });
    } catch (e) {
      console.error('[RelayProtection] Log failed:', e);
    }
  }, [user]);

  /**
   * Check if a relay toggle is allowed. Returns true if safe to proceed.
   * If not safe, returns false and the relay is locked.
   */
  const canToggle = useCallback((relayId: RelayId, newState: boolean): boolean => {
    const now = Date.now();
    const state = getRelayState(relayId);

    // Check lockout
    if (now < state.lockedUntil) {
      console.warn(`[RelayProtection] ${relayId} LOCKED until ${new Date(state.lockedUntil).toISOString()}`);
      return false;
    }

    // Check cooldown (motor/heater)
    if (newState && now < state.cooldownUntil) {
      console.warn(`[RelayProtection] ${relayId} in COOLDOWN until ${new Date(state.cooldownUntil).toISOString()}`);
      return false;
    }

    // Check min toggle interval
    if (state.lastToggleAt > 0 && now - state.lastToggleAt < MIN_TOGGLE_INTERVAL_MS) {
      violationCount.current++;
      state.lockedUntil = now + TOGGLE_VIOLATION_LOCK_MS;
      console.error(`[RelayProtection] ${relayId} toggled too fast! Locked for 30s. Violations: ${violationCount.current}`);
      logViolation(relayId, `Toggle interval violation (${(now - state.lastToggleAt)}ms < ${MIN_TOGGLE_INTERVAL_MS}ms)`);
      updateStatus();
      return false;
    }

    // Record toggle
    state.lastToggleAt = now;
    state.isOn = newState;
    if (newState) {
      state.onSince = now;
    } else {
      state.onSince = null;
    }

    updateStatus();
    return true;
  }, [getRelayState, logViolation]);

  /**
   * Check runtime limits for motor-type relays.
   * Call this periodically (e.g., every 5s) to enforce max runtime.
   * Returns relays that should be forced OFF.
   */
  const checkRuntimeLimits = useCallback((): RelayId[] => {
    const now = Date.now();
    const forceOff: RelayId[] = [];

    // Motor relays (fan, circulation_fan, fogger)
    const motorRelays: RelayId[] = ['fan', 'circulation_fan', 'fogger'];
    for (const relayId of motorRelays) {
      const state = getRelayState(relayId);
      if (state.isOn && state.onSince) {
        const runtime = now - state.onSince;
        if (runtime >= MOTOR_MAX_RUNTIME_MS) {
          console.warn(`[RelayProtection] ${relayId} max runtime (${MOTOR_MAX_RUNTIME_MS / 1000}s) exceeded — forcing OFF`);
          state.isOn = false;
          state.onSince = null;
          state.cooldownUntil = now + MOTOR_COOLDOWN_MS;
          forceOff.push(relayId);
          logViolation(relayId, `Motor max runtime exceeded (${runtime}ms)`);
        }
      }
    }

    // Heater
    const heaterState = getRelayState('heater');
    if (heaterState.isOn && heaterState.onSince) {
      const runtime = now - heaterState.onSince;
      if (runtime >= HEATER_MAX_RUNTIME_MS) {
        console.warn(`[RelayProtection] heater max runtime (${HEATER_MAX_RUNTIME_MS / 1000}s) exceeded — forcing OFF`);
        heaterState.isOn = false;
        heaterState.onSince = null;
        heaterState.cooldownUntil = now + HEATER_COOLDOWN_MS;
        forceOff.push('heater');
        logViolation('heater', `Heater max runtime exceeded (${runtime}ms)`);
      }
    }

    if (forceOff.length > 0) updateStatus();
    return forceOff;
  }, [getRelayState, logViolation]);

  /**
   * Register a heater OFF command to later check for stuck relay.
   */
  const registerHeaterOff = useCallback((currentTemp: number) => {
    stuckChecks.current.push({
      relayId: 'heater',
      offCommandAt: Date.now(),
      tempAtOff: currentTemp,
    });
    // Keep only last 5 checks
    if (stuckChecks.current.length > 5) {
      stuckChecks.current = stuckChecks.current.slice(-5);
    }
  }, []);

  /**
   * Check if heater appears stuck ON (temp rising after OFF command).
   * Call with current temperature periodically.
   */
  const checkStuckRelay = useCallback((currentTemp: number): boolean => {
    const now = Date.now();
    for (const check of stuckChecks.current) {
      const elapsed = now - check.offCommandAt;
      if (elapsed >= STUCK_HEATER_CHECK_WINDOW_MS && elapsed < STUCK_HEATER_CHECK_WINDOW_MS * 2) {
        const tempRise = currentTemp - check.tempAtOff;
        if (tempRise >= STUCK_HEATER_TEMP_RISE) {
          console.error(`[RelayProtection] STUCK RELAY DETECTED: heater OFF but temp rose ${tempRise.toFixed(1)}°C`);
          logViolation('heater', `Stuck relay: temp rose ${tempRise.toFixed(1)}°C after OFF command`);
          // Remove this check
          stuckChecks.current = stuckChecks.current.filter(c => c !== check);
          setStatus(prev => ({ ...prev, stuckRelayDetected: 'heater' }));
          return true;
        }
        // Check passed — remove
        stuckChecks.current = stuckChecks.current.filter(c => c !== check);
      }
    }
    return false;
  }, [logViolation]);

  const updateStatus = useCallback(() => {
    const now = Date.now();
    const locked: RelayId[] = [];
    const allRelays: RelayId[] = ['fan', 'heater', 'light', 'alarm', 'fogger', 'circulation_fan'];
    
    for (const relayId of allRelays) {
      const state = getRelayState(relayId);
      if (now < state.lockedUntil || (state.isOn === false && now < state.cooldownUntil)) {
        locked.push(relayId);
      }
    }

    const heaterState = getRelayState('heater');
    const fanState = getRelayState('fan');

    setStatus(prev => ({
      ...prev,
      lockedRelays: locked,
      violations: violationCount.current,
      heaterRuntimeMs: heaterState.isOn && heaterState.onSince ? now - heaterState.onSince : 0,
      motorRuntimeMs: fanState.isOn && fanState.onSince ? now - fanState.onSince : 0,
    }));
  }, [getRelayState]);

  return {
    canToggle,
    checkRuntimeLimits,
    registerHeaterOff,
    checkStuckRelay,
    status,
  };
}
