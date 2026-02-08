/**
 * MODULE 4: Broiler Airflow Growth Mode
 * 
 * Age-based airflow control for broilers:
 * - age < 10 days → circulation OFF
 * - 10–20 days → ON 30 sec every 3 min
 * - 21+ days daytime → continuous ON
 * - 21+ days night → ON 1 min every 5 min
 * 
 * Layer mode: Circulation fan optional manual only
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAdvancedAutomationSettings } from './useAdvancedAutomation';
import { useFarmType } from './useFarmType';
import { useActiveBatch } from './useBroilerData';
import { calculateBroilerAge } from './useBroilerAutomation';

export type AirflowPhase = 'off' | 'early' | 'mid_on' | 'mid_off' | 'adult_day' | 'adult_night_on' | 'adult_night_off';

export interface AirflowStatus {
  isOn: boolean;
  phase: AirflowPhase;
  ageDays: number | null;
  isDaytime: boolean;
  cycleTimeRemaining: number;
  nextChangeIn: number;
  message: {
    bn: string;
    en: string;
  };
}

interface UseBroilerAirflowProps {
  enabled?: boolean;
  onCirculationFanChange?: (on: boolean) => void;
}

// Check if current time is daytime (6AM - 6PM)
function isDaytime(): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
}

export function useBroilerAirflow({
  enabled = true,
  onCirculationFanChange,
}: UseBroilerAirflowProps) {
  const { user } = useAuth();
  const { data: settings } = useAdvancedAutomationSettings();
  const { isBroiler, isLayer } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  
  const [status, setStatus] = useState<AirflowStatus>({
    isOn: false,
    phase: 'off',
    ageDays: null,
    isDaytime: true,
    cycleTimeRemaining: 0,
    nextChangeIn: 0,
    message: { bn: 'সার্কুলেশন ফ্যান বন্ধ', en: 'Circulation fan off' },
  });
  
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseStartRef = useRef<number>(0);
  const lastOnStateRef = useRef<boolean | null>(null);

  // Calculate broiler age
  const ageDays = useMemo(() => {
    if (!isBroiler || !activeBatch) return null;
    const age = calculateBroilerAge(activeBatch.start_date);
    return age.days;
  }, [isBroiler, activeBatch]);

  // Determine current phase
  const getCurrentPhase = useCallback((): AirflowPhase => {
    if (!enabled || !settings?.airflow_enabled) return 'off';
    if (isLayer) return 'off'; // Layer mode - manual only
    if (ageDays === null) return 'off';
    
    const earlyAge = settings.airflow_early_age_days || 10;
    const midAge = settings.airflow_mid_age_days || 20;
    
    if (ageDays < earlyAge) {
      return 'early'; // OFF
    } else if (ageDays <= midAge) {
      return 'mid_on'; // Will cycle between mid_on and mid_off
    } else {
      // 21+ days
      if (isDaytime()) {
        return 'adult_day'; // Continuous ON
      } else {
        return 'adult_night_on'; // Will cycle between adult_night_on and adult_night_off
      }
    }
  }, [enabled, settings, isLayer, ageDays]);

  // Start an ON cycle
  const startOnCycle = useCallback((phase: AirflowPhase) => {
    if (!settings) return;
    
    onCirculationFanChange?.(true);
    lastOnStateRef.current = true;
    phaseStartRef.current = Date.now();
    
    let duration: number;
    let message: { bn: string; en: string };
    
    if (phase === 'mid_on') {
      duration = settings.airflow_mid_on_seconds || 30;
      message = {
        bn: `🌀 সার্কুলেশন চলছে (Day ${ageDays}, ${duration}সে)`,
        en: `🌀 Circulation ON (Day ${ageDays}, ${duration}s)`
      };
    } else {
      // adult_night_on
      duration = settings.airflow_night_on_seconds || 60;
      message = {
        bn: `🌀 রাতের সার্কুলেশন চলছে (${duration}সে)`,
        en: `🌀 Night circulation ON (${duration}s)`
      };
    }
    
    setStatus(prev => ({
      ...prev,
      isOn: true,
      phase,
      cycleTimeRemaining: duration,
      message,
    }));
  }, [settings, ageDays, onCirculationFanChange]);

  // Start an OFF cycle (pause)
  const startOffCycle = useCallback((phase: AirflowPhase) => {
    if (!settings) return;
    
    onCirculationFanChange?.(false);
    lastOnStateRef.current = false;
    phaseStartRef.current = Date.now();
    
    let duration: number;
    let message: { bn: string; en: string };
    
    if (phase === 'mid_off') {
      duration = (settings.airflow_mid_interval_minutes || 3) * 60;
      message = {
        bn: `⏸️ সার্কুলেশন বিরতি (${settings.airflow_mid_interval_minutes || 3} মিনিট)`,
        en: `⏸️ Circulation pause (${settings.airflow_mid_interval_minutes || 3} min)`
      };
    } else {
      // adult_night_off
      duration = (settings.airflow_night_interval_minutes || 5) * 60;
      message = {
        bn: `⏸️ রাতের বিরতি (${settings.airflow_night_interval_minutes || 5} মিনিট)`,
        en: `⏸️ Night pause (${settings.airflow_night_interval_minutes || 5} min)`
      };
    }
    
    setStatus(prev => ({
      ...prev,
      isOn: false,
      phase,
      nextChangeIn: duration,
      cycleTimeRemaining: 0,
      message,
    }));
  }, [settings, onCirculationFanChange]);

  // Main airflow control loop
  useEffect(() => {
    if (!user || !settings) return;

    const phase = getCurrentPhase();
    const daytime = isDaytime();

    // Update status with current daytime state
    setStatus(prev => ({
      ...prev,
      ageDays,
      isDaytime: daytime,
    }));

    // Handle different phases
    switch (phase) {
      case 'off':
      case 'early':
        // Keep fan OFF
        if (lastOnStateRef.current !== false) {
          onCirculationFanChange?.(false);
          lastOnStateRef.current = false;
        }
        setStatus(prev => ({
          ...prev,
          isOn: false,
          phase,
          message: phase === 'early'
            ? { bn: `বয়স কম (Day ${ageDays}) - সার্কুলেশন বন্ধ`, en: `Early age (Day ${ageDays}) - Circulation off` }
            : { bn: 'সার্কুলেশন ফ্যান বন্ধ', en: 'Circulation fan off' },
        }));
        break;

      case 'adult_day':
        // Continuous ON during daytime for 21+ days
        if (lastOnStateRef.current !== true) {
          onCirculationFanChange?.(true);
          lastOnStateRef.current = true;
        }
        setStatus(prev => ({
          ...prev,
          isOn: true,
          phase,
          message: { 
            bn: `🌀 দিনের সার্কুলেশন (Day ${ageDays})`,
            en: `🌀 Daytime circulation (Day ${ageDays})`
          },
        }));
        break;

      case 'mid_on':
      case 'adult_night_on':
        // Start cycling mode
        if (status.phase !== phase && status.phase !== 'mid_off' && status.phase !== 'adult_night_off') {
          startOnCycle(phase);
        }
        break;
    }

    // Set up cycle timer for intermittent phases
    if ((phase === 'mid_on' || phase === 'adult_night_on') && !cycleTimerRef.current) {
      cycleTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - phaseStartRef.current) / 1000;
        const currentStatus = status;
        
        if (currentStatus.isOn) {
          // Check if ON time is complete
          let onDuration = phase === 'mid_on' 
            ? (settings.airflow_mid_on_seconds || 30)
            : (settings.airflow_night_on_seconds || 60);
          
          const remaining = Math.max(0, onDuration - elapsed);
          
          if (remaining <= 0) {
            startOffCycle(phase === 'mid_on' ? 'mid_off' : 'adult_night_off');
          } else {
            setStatus(prev => ({ ...prev, cycleTimeRemaining: Math.ceil(remaining) }));
          }
        } else {
          // Check if OFF time is complete
          let offDuration = phase === 'mid_on'
            ? (settings.airflow_mid_interval_minutes || 3) * 60
            : (settings.airflow_night_interval_minutes || 5) * 60;
          
          const remaining = Math.max(0, offDuration - elapsed);
          
          if (remaining <= 0) {
            // Check if conditions still apply
            const newPhase = getCurrentPhase();
            if (newPhase === 'mid_on' || newPhase === 'adult_night_on') {
              startOnCycle(newPhase);
            }
          } else {
            setStatus(prev => ({ ...prev, nextChangeIn: Math.ceil(remaining) }));
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
  }, [user, settings, getCurrentPhase, ageDays, status.phase, status.isOn, startOnCycle, startOffCycle, onCirculationFanChange]);

  return status;
}
