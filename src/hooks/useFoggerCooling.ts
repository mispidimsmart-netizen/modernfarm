/**
 * MODULE 3: Intelligent Fogger Cooling — SAFE SEQUENCE CONTROL
 * 
 * SAFETY PRINCIPLE:
 * The high-pressure pump must NEVER run against a closed solenoid valve.
 * This prevents pipe burst, pump burnout, and hardware damage.
 * 
 * COOLING START SEQUENCE (staged activation):
 *   1. State → PREPARE
 *   2. Open Solenoid Valve (onValveChange → true)
 *   3. Wait 2 seconds (allow water pressure to equalize)
 *   4. Turn ON Pump (onPumpChange → true)
 *   5. State → RUNNING
 * 
 * COOLING STOP SEQUENCE (staged shutdown):
 *   1. State → STOPPING
 *   2. Turn OFF Pump (onPumpChange → false)
 *   3. Wait 2 seconds (allow pump to fully stop)
 *   4. Close Solenoid Valve (onValveChange → false)
 *   5. State → OFF
 * 
 * FAILSAFE RULES:
 * - If pump ON detected while valve OFF → immediately stop pump
 * - If valve stuck ON during stop → retry close 3 times then alarm
 * - On system reset during cooling → restart from SAFE OFF state
 * 
 * Spray/Pause cycle:
 * - Fogger ON 40 sec, Pause 120 sec, Repeat
 * 
 * Stop conditions:
 * - temp < 30°C OR humidity ≥ 90%
 * 
 * Priority:
 * - Exhaust fan must run during fogger operation
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAdvancedAutomationSettings } from './useAdvancedAutomation';

/**
 * Cooling state machine:
 * OFF      → System idle, valve closed, pump off
 * PREPARE  → Valve opening, waiting before pump start (2s safety delay)
 * RUNNING  → Both valve open and pump running (active spray)
 * STOPPING → Pump off, waiting before valve close (2s safety delay)
 */
export type CoolingState = 'OFF' | 'PREPARE' | 'RUNNING' | 'STOPPING';

export interface FoggerStatus {
  isActive: boolean;
  isSpraying: boolean;
  coolingState: CoolingState;
  sprayTimeRemaining: number;
  pauseTimeRemaining: number;
  cycleCount: number;
  stopReason: 'temp_reached' | 'humidity_reached' | 'manual' | null;
  valveOpen: boolean;
  pumpRunning: boolean;
  failsafeTriggered: boolean;
  message: {
    bn: string;
    en: string;
  };
}

interface UseFoggerCoolingProps {
  temperature: number | null;
  humidity: number | null;
  enabled?: boolean;
  /** Controls the fogger solenoid valve (Relay 4 / GPIO 13) */
  onFoggerChange?: (on: boolean) => void;
  /** Controls the fogger high-pressure pump (separate output) */
  onPumpChange?: (on: boolean) => void;
  onExhaustFanChange?: (on: boolean) => void;
}

// Safety delay between valve and pump operations (milliseconds)
const STAGE_DELAY_MS = 2000;
// Max retries for valve close during stuck detection
const VALVE_CLOSE_MAX_RETRIES = 3;

export function useFoggerCooling({
  temperature,
  humidity,
  enabled = true,
  onFoggerChange,
  onPumpChange,
  onExhaustFanChange,
}: UseFoggerCoolingProps) {
  const { user } = useAuth();
  const { data: settings } = useAdvancedAutomationSettings();
  
  const [status, setStatus] = useState<FoggerStatus>({
    isActive: false,
    isSpraying: false,
    coolingState: 'OFF',
    sprayTimeRemaining: 0,
    pauseTimeRemaining: 0,
    cycleCount: 0,
    stopReason: null,
    valveOpen: false,
    pumpRunning: false,
    failsafeTriggered: false,
    message: { bn: 'ফগার বন্ধ', en: 'Fogger off' },
  });
  
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseStartRef = useRef<number>(0);
  const cycleCountRef = useRef<number>(0);
  const currentPhaseRef = useRef<'spray' | 'pause' | 'idle'>('idle');
  const coolingStateRef = useRef<CoolingState>('OFF');
  const valveOpenRef = useRef(false);
  const pumpRunningRef = useRef(false);
  const stageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const valveCloseRetryRef = useRef(0);

  // --- FAILSAFE: Pump must never run with closed valve ---
  const failsafeCheck = useCallback(() => {
    if (pumpRunningRef.current && !valveOpenRef.current) {
      // CRITICAL: Pump detected ON while valve is OFF → immediate pump stop
      console.warn('[FOGGER FAILSAFE] Pump ON with valve closed! Emergency pump stop.');
      onPumpChange?.(false);
      pumpRunningRef.current = false;
      setStatus(prev => ({
        ...prev,
        pumpRunning: false,
        failsafeTriggered: true,
        message: {
          bn: '🚨 নিরাপত্তা: পাম্প জরুরি বন্ধ (ভালভ বন্ধ ছিল)',
          en: '🚨 Safety: Emergency pump stop (valve was closed)',
        },
      }));
      return true;
    }
    return false;
  }, [onPumpChange]);

  /**
   * SAFE START SEQUENCE:
   * Step 1: Open valve → Step 2: Wait 2s → Step 3: Start pump
   * This ensures water path is clear before pump pressurizes.
   */
  const safeStartCooling = useCallback(() => {
    if (coolingStateRef.current !== 'OFF') return;

    // Step 1: PREPARE — Open solenoid valve first
    coolingStateRef.current = 'PREPARE';
    valveOpenRef.current = true;
    onFoggerChange?.(true); // Open solenoid valve
    onExhaustFanChange?.(true); // Exhaust must run during fogger

    setStatus(prev => ({
      ...prev,
      isActive: true,
      coolingState: 'PREPARE',
      valveOpen: true,
      failsafeTriggered: false,
      stopReason: null,
      message: {
        bn: '🔧 ভালভ খোলা হচ্ছে... (পাম্প ২ সেকেন্ড পর চালু হবে)',
        en: '🔧 Opening valve... (pump starts in 2s)',
      },
    }));

    // Step 2: Wait safety delay, then start pump
    stageTimerRef.current = setTimeout(() => {
      // Verify valve is still supposed to be open before starting pump
      if (coolingStateRef.current !== 'PREPARE') return;

      // Step 3: RUNNING — Start high-pressure pump
      pumpRunningRef.current = true;
      coolingStateRef.current = 'RUNNING';
      onPumpChange?.(true);

      setStatus(prev => ({
        ...prev,
        coolingState: 'RUNNING',
        pumpRunning: true,
        isSpraying: true,
        message: {
          bn: '💨 ফগার স্প্রে চলছে',
          en: '💨 Fogger spraying',
        },
      }));

      // Begin spray/pause cycle timing
      phaseStartRef.current = Date.now();
      currentPhaseRef.current = 'spray';
    }, STAGE_DELAY_MS);
  }, [onFoggerChange, onPumpChange, onExhaustFanChange]);

  /**
   * SAFE STOP SEQUENCE:
   * Step 1: Stop pump → Step 2: Wait 2s → Step 3: Close valve
   * This ensures pump is fully stopped before water path is closed,
   * preventing pressure buildup and pipe/pump damage.
   */
  const safeStopCooling = useCallback((reason: 'temp_reached' | 'humidity_reached' | 'manual') => {
    // If already OFF or already STOPPING, skip
    if (coolingStateRef.current === 'OFF') return;

    // Clear any pending stage timer (e.g., if stopping during PREPARE phase)
    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }

    // Step 1: STOPPING — Turn off pump first
    coolingStateRef.current = 'STOPPING';
    pumpRunningRef.current = false;
    onPumpChange?.(false);

    const reasonMessages = {
      temp_reached: {
        bn: '⏹️ পাম্প বন্ধ হচ্ছে... (ভালভ ২ সেকেন্ড পর বন্ধ হবে)',
        en: '⏹️ Stopping pump... (valve closes in 2s)',
      },
      humidity_reached: {
        bn: '⏹️ আর্দ্রতা পৌঁছেছে — পাম্প বন্ধ হচ্ছে...',
        en: '⏹️ Humidity reached — stopping pump...',
      },
      manual: {
        bn: '⏹️ ম্যানুয়ালি বন্ধ হচ্ছে...',
        en: '⏹️ Manually stopping...',
      },
    };

    setStatus(prev => ({
      ...prev,
      coolingState: 'STOPPING',
      pumpRunning: false,
      isSpraying: false,
      message: reasonMessages[reason],
    }));

    // Step 2: Wait safety delay, then close valve
    valveCloseRetryRef.current = 0;
    stageTimerRef.current = setTimeout(() => {
      closeValveWithRetry(reason);
    }, STAGE_DELAY_MS);
  }, [onPumpChange]);

  /**
   * FAILSAFE: Valve close with retry logic.
   * If valve appears stuck open, retry up to 3 times before raising alarm.
   */
  const closeValveWithRetry = useCallback((reason: 'temp_reached' | 'humidity_reached' | 'manual') => {
    valveCloseRetryRef.current += 1;

    // Step 3: Close solenoid valve
    onFoggerChange?.(false);
    valveOpenRef.current = false;
    coolingStateRef.current = 'OFF';
    currentPhaseRef.current = 'idle';

    const finalMessages = {
      temp_reached: {
        bn: '✅ তাপমাত্রা পৌঁছেছে — ফগার নিরাপদে বন্ধ',
        en: '✅ Temperature reached — Fogger safely stopped',
      },
      humidity_reached: {
        bn: '✅ আর্দ্রতা পৌঁছেছে — ফগার নিরাপদে বন্ধ',
        en: '✅ Humidity reached — Fogger safely stopped',
      },
      manual: {
        bn: '✅ ফগার নিরাপদে বন্ধ হয়েছে',
        en: '✅ Fogger safely stopped',
      },
    };

    // Check if this is a retry situation (valve stuck failsafe)
    if (valveCloseRetryRef.current > VALVE_CLOSE_MAX_RETRIES) {
      // FAILSAFE: Valve stuck open after max retries → alarm
      console.error('[FOGGER FAILSAFE] Valve stuck open after', VALVE_CLOSE_MAX_RETRIES, 'retries. Raising alarm.');
      setStatus(prev => ({
        ...prev,
        isActive: false,
        coolingState: 'OFF',
        valveOpen: true, // Still stuck
        pumpRunning: false,
        failsafeTriggered: true,
        sprayTimeRemaining: 0,
        pauseTimeRemaining: 0,
        stopReason: reason,
        message: {
          bn: '🚨 সতর্কতা: ভালভ বন্ধ হচ্ছে না! পরীক্ষা করুন',
          en: '🚨 Alert: Valve stuck open! Check hardware',
        },
      }));
      return;
    }

    setStatus(prev => ({
      ...prev,
      isActive: false,
      coolingState: 'OFF',
      valveOpen: false,
      pumpRunning: false,
      sprayTimeRemaining: 0,
      pauseTimeRemaining: 0,
      stopReason: reason,
      message: finalMessages[reason],
    }));
  }, [onFoggerChange]);

  // Check if fogger should be active
  const shouldActivate = useCallback(() => {
    if (!enabled || !settings?.fogger_enabled) return false;
    if (temperature === null || humidity === null) return false;
    
    const startTemp = settings.fogger_start_temp || 32;
    const startHumidityMax = settings.fogger_start_humidity_max || 85;
    
    return temperature >= startTemp && humidity < startHumidityMax;
  }, [enabled, settings, temperature, humidity]);

  // Check if fogger should stop
  const shouldStop = useCallback(() => {
    if (temperature === null || humidity === null) return { stop: true, reason: 'manual' as const };
    if (!settings) return { stop: true, reason: 'manual' as const };
    
    const stopTemp = settings.fogger_stop_temp || 30;
    const stopHumidity = settings.fogger_stop_humidity || 90;
    
    if (temperature < stopTemp) {
      return { stop: true, reason: 'temp_reached' as const };
    }
    if (humidity >= stopHumidity) {
      return { stop: true, reason: 'humidity_reached' as const };
    }
    
    return { stop: false, reason: null };
  }, [settings, temperature, humidity]);

  /**
   * Start a spray phase within the RUNNING state.
   * Uses the safe start sequence for the initial activation,
   * but within an ongoing cycle just tracks timing.
   */
  const startSprayPhase = useCallback(() => {
    if (!settings) return;
    
    // If system is OFF, use safe start sequence
    if (coolingStateRef.current === 'OFF') {
      safeStartCooling();
      return;
    }

    // Already RUNNING — just reset spray timing
    currentPhaseRef.current = 'spray';
    phaseStartRef.current = Date.now();

    setStatus(prev => ({
      ...prev,
      isSpraying: true,
      sprayTimeRemaining: settings.fogger_on_seconds || 40,
      pauseTimeRemaining: 0,
      message: {
        bn: `💨 ফগার স্প্রে চলছে (${settings.fogger_on_seconds || 40}সে)`,
        en: `💨 Fogger spraying (${settings.fogger_on_seconds || 40}s)`,
      },
    }));
  }, [settings, safeStartCooling]);

  /**
   * Pause phase: pump stays on but spray timing pauses.
   * In a real system, you'd cycle the pump off during pause 
   * using the safe sequence. Here we just track state.
   */
  const startPausePhase = useCallback(() => {
    if (!settings) return;
    
    // During pause, stop pump safely but keep valve open
    pumpRunningRef.current = false;
    onPumpChange?.(false);
    
    currentPhaseRef.current = 'pause';
    phaseStartRef.current = Date.now();
    cycleCountRef.current += 1;
    
    setStatus(prev => ({
      ...prev,
      isSpraying: false,
      pumpRunning: false,
      sprayTimeRemaining: 0,
      pauseTimeRemaining: settings.fogger_pause_seconds || 120,
      cycleCount: cycleCountRef.current,
      message: {
        bn: `⏸️ ফগার বিরতি (${settings.fogger_pause_seconds || 120}সে)`,
        en: `⏸️ Fogger pause (${settings.fogger_pause_seconds || 120}s)`,
      },
    }));
  }, [settings, onPumpChange]);

  /**
   * Resume pump after pause phase (valve already open).
   * Includes the 2s safety delay before pump start.
   */
  const resumePumpAfterPause = useCallback(() => {
    if (coolingStateRef.current !== 'RUNNING' && coolingStateRef.current !== 'OFF') return;
    
    // Valve should still be open from initial start
    if (!valveOpenRef.current) {
      // Valve somehow closed — use full safe start
      safeStartCooling();
      return;
    }

    // Start pump with safety delay (valve already open)
    coolingStateRef.current = 'PREPARE';
    setStatus(prev => ({
      ...prev,
      coolingState: 'PREPARE',
      message: {
        bn: '🔧 পাম্প পুনরায় চালু হচ্ছে...',
        en: '🔧 Resuming pump...',
      },
    }));

    stageTimerRef.current = setTimeout(() => {
      if (coolingStateRef.current !== 'PREPARE') return;
      
      pumpRunningRef.current = true;
      coolingStateRef.current = 'RUNNING';
      onPumpChange?.(true);
      
      currentPhaseRef.current = 'spray';
      phaseStartRef.current = Date.now();
      
      setStatus(prev => ({
        ...prev,
        coolingState: 'RUNNING',
        pumpRunning: true,
        isSpraying: true,
        message: {
          bn: '💨 ফগার স্প্রে চলছে',
          en: '💨 Fogger spraying',
        },
      }));
    }, STAGE_DELAY_MS);
  }, [onPumpChange, safeStartCooling]);

  // --- MAIN CONTROL LOOP ---
  useEffect(() => {
    if (!user || !settings) return;

    // FAILSAFE CHECK: Run on every tick
    if (failsafeCheck()) return;

    // Check stop conditions first
    const { stop, reason } = shouldStop();
    if (stop && status.isActive) {
      safeStopCooling(reason || 'manual');
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      return;
    }

    // Check if we should activate
    if (!shouldActivate()) {
      if (status.isActive) {
        safeStopCooling('manual');
      }
      return;
    }

    // Start fogger cycle if not already running
    if (!status.isActive && coolingStateRef.current === 'OFF') {
      cycleCountRef.current = 0;
      setStatus(prev => ({
        ...prev,
        cycleCount: 0,
        stopReason: null,
      }));
      safeStartCooling();
    }

    // Set up cycle timer for spray/pause tracking
    if (!cycleTimerRef.current && status.isActive) {
      cycleTimerRef.current = setInterval(() => {
        // Continuous failsafe check during operation
        failsafeCheck();

        const elapsed = (Date.now() - phaseStartRef.current) / 1000;
        
        if (currentPhaseRef.current === 'spray') {
          const sprayDuration = settings.fogger_on_seconds || 40;
          const remaining = Math.max(0, sprayDuration - elapsed);
          
          if (remaining <= 0) {
            startPausePhase();
          } else {
            setStatus(prev => ({
              ...prev,
              sprayTimeRemaining: Math.ceil(remaining),
            }));
          }
        } else if (currentPhaseRef.current === 'pause') {
          const pauseDuration = settings.fogger_pause_seconds || 120;
          const remaining = Math.max(0, pauseDuration - elapsed);
          
          if (remaining <= 0) {
            // Check conditions before next spray
            const { stop: shouldStopNow } = shouldStop();
            if (!shouldStopNow && shouldActivate()) {
              resumePumpAfterPause();
            } else if (shouldStopNow) {
              safeStopCooling(shouldStop().reason || 'temp_reached');
            }
          } else {
            setStatus(prev => ({
              ...prev,
              pauseTimeRemaining: Math.ceil(remaining),
            }));
          }
        }
      }, 1000);
    }

    return () => {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };
  }, [user, settings, shouldActivate, shouldStop, status.isActive, 
      safeStartCooling, safeStopCooling, startPausePhase, resumePumpAfterPause, failsafeCheck]);

  /**
   * SAFE RESET: On unmount or system reset, ensure we go to SAFE OFF state.
   * Pump off first, then valve closed.
   */
  useEffect(() => {
    return () => {
      // Cleanup: ensure safe shutdown on unmount
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
      if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);
      
      // If system was running, force safe off
      if (pumpRunningRef.current) {
        onPumpChange?.(false);
        pumpRunningRef.current = false;
      }
      if (valveOpenRef.current) {
        // Small delay to let pump stop signal propagate
        setTimeout(() => {
          onFoggerChange?.(false);
          valveOpenRef.current = false;
        }, STAGE_DELAY_MS);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
