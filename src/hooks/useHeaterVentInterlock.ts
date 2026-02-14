/**
 * Heater-Ventilation Interlock
 * 
 * Prevents suffocation deaths by enforcing:
 * 1. Heater ON requires minimum ventilation duty cycle
 * 2. If fan unavailable → heater BLOCKED
 * 3. If temperature rising too fast while heater ON → ventilation FORCED
 * 4. If heater ON > 5 min → mandatory fan pulse (30s)
 * 
 * This is a LIFE SAFETY interlock — it cannot be overridden by the user.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// === INTERLOCK CONSTANTS ===
const HEATER_MAX_CONTINUOUS_MS = 5 * 60 * 1000;   // 5 min max heater without fan pulse
const MANDATORY_FAN_PULSE_MS = 30 * 1000;          // 30s mandatory fan pulse
const RAPID_RISE_THRESHOLD = 0.5;                   // °C/min — too fast = force vent
const RAPID_RISE_WINDOW_MS = 2 * 60 * 1000;        // 2 min window for rise detection
const MIN_VENT_DUTY_PERCENT = 10;                    // 10% minimum ventilation when heater ON

export interface InterlockStatus {
  heaterAllowed: boolean;
  heaterBlockedReason: string | null;
  mandatoryFanPulseActive: boolean;
  rapidRiseDetected: boolean;
  forceVentilation: boolean;
  minVentDutyRequired: boolean;
  currentTempRate: number; // °C/min
}

interface UseHeaterVentInterlockProps {
  heaterOn: boolean;
  fanOn: boolean;
  fanAvailable: boolean;       // false if fan relay stuck or sensor says fan not working
  temperature: number | null;
  sensorValid: boolean;        // false if temp sensor in FAILED/PHYSICALLY_IMPOSSIBLE state
}

export function useHeaterVentInterlock({
  heaterOn,
  fanOn,
  fanAvailable,
  temperature,
  sensorValid,
}: UseHeaterVentInterlockProps) {
  const { user } = useAuth();

  const [status, setStatus] = useState<InterlockStatus>({
    heaterAllowed: true,
    heaterBlockedReason: null,
    mandatoryFanPulseActive: false,
    rapidRiseDetected: false,
    forceVentilation: false,
    minVentDutyRequired: false,
    currentTempRate: 0,
  });

  const heaterOnSinceRef = useRef<number | null>(null);
  const fanPulseUntilRef = useRef<number>(0);
  const tempHistory = useRef<{ temp: number; time: number }[]>([]);
  const lastAuditLog = useRef<number>(0);

  // Log interlock events (throttled)
  const logInterlock = useCallback(async (reason: string, action: string) => {
    if (!user) return;
    const now = Date.now();
    if (now - lastAuditLog.current < 5 * 60 * 1000) return; // 5 min throttle
    lastAuditLog.current = now;

    try {
      await (supabase.from('farm_audit_logs') as any).insert({
        user_id: user.id,
        user_email: user.email || '',
        action_type: 'heater_vent_interlock',
        action_category: 'safety',
        severity: 'warning',
        source: 'heater_vent_interlock',
        metadata: { reason, action, heater_on: heaterOn, fan_on: fanOn, fan_available: fanAvailable, temperature },
      });
    } catch (err) {
      console.error('[HeaterVentInterlock] Audit log failed:', err);
    }
  }, [user, heaterOn, fanOn, fanAvailable, temperature]);

  useEffect(() => {
    const now = Date.now();
    let heaterAllowed = true;
    let heaterBlockedReason: string | null = null;
    let mandatoryFanPulseActive = false;
    let rapidRiseDetected = false;
    let forceVentilation = false;
    let minVentDutyRequired = false;
    let currentTempRate = 0;

    // === RULE 1: Sensor invalid → block heater ===
    if (!sensorValid) {
      heaterAllowed = false;
      heaterBlockedReason = 'Temperature sensor FAILED/IMPOSSIBLE — heater blocked for safety';
      forceVentilation = true;
    }

    // === RULE 2: Fan unavailable → block heater ===
    if (heaterAllowed && !fanAvailable) {
      heaterAllowed = false;
      heaterBlockedReason = 'Exhaust fan unavailable — heater blocked to prevent suffocation';
      logInterlock('Fan unavailable', 'heater_blocked');
    }

    // === RULE 3: Track heater ON duration → mandatory fan pulse ===
    if (heaterOn && heaterAllowed) {
      if (!heaterOnSinceRef.current) {
        heaterOnSinceRef.current = now;
      }

      const heaterRuntime = now - heaterOnSinceRef.current;

      // Heater ON requires minimum ventilation duty
      minVentDutyRequired = true;

      // After 5 min continuous → mandatory fan pulse
      if (heaterRuntime >= HEATER_MAX_CONTINUOUS_MS) {
        mandatoryFanPulseActive = true;
        forceVentilation = true;
        fanPulseUntilRef.current = now + MANDATORY_FAN_PULSE_MS;
        heaterOnSinceRef.current = null; // Reset timer
        logInterlock(`Heater ON ${(heaterRuntime / 60000).toFixed(1)}min`, 'mandatory_fan_pulse');
        console.warn(`[HeaterVentInterlock] Heater ON >${HEATER_MAX_CONTINUOUS_MS / 60000}min — mandatory ${MANDATORY_FAN_PULSE_MS / 1000}s fan pulse`);
      }
    } else {
      heaterOnSinceRef.current = null;
    }

    // Check if fan pulse still active
    if (now < fanPulseUntilRef.current) {
      mandatoryFanPulseActive = true;
      forceVentilation = true;
    }

    // === RULE 4: Rapid temperature rise → force ventilation ===
    if (temperature !== null && sensorValid) {
      tempHistory.current.push({ temp: temperature, time: now });
      // Keep only last 2 min
      tempHistory.current = tempHistory.current.filter(r => now - r.time <= RAPID_RISE_WINDOW_MS);

      if (tempHistory.current.length >= 2) {
        const oldest = tempHistory.current[0];
        const newest = tempHistory.current[tempHistory.current.length - 1];
        const timeDiffMin = (newest.time - oldest.time) / 60000;
        if (timeDiffMin > 0.5) {
          currentTempRate = (newest.temp - oldest.temp) / timeDiffMin;

          if (currentTempRate > RAPID_RISE_THRESHOLD && heaterOn) {
            rapidRiseDetected = true;
            forceVentilation = true;
            logInterlock(`Rapid rise ${currentTempRate.toFixed(2)}°C/min`, 'force_ventilation');
            console.warn(`[HeaterVentInterlock] Rapid temp rise: ${currentTempRate.toFixed(2)}°C/min while heater ON — forcing ventilation`);
          }
        }
      }
    }

    setStatus({
      heaterAllowed,
      heaterBlockedReason,
      mandatoryFanPulseActive,
      rapidRiseDetected,
      forceVentilation,
      minVentDutyRequired,
      currentTempRate,
    });
  }, [heaterOn, fanOn, fanAvailable, temperature, sensorValid, logInterlock]);

  return status;
}
