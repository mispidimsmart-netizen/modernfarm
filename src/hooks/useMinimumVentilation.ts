/**
 * MODULE 1: Minimum Ventilation Timer
 * 
 * Purpose: Prevent gas accumulation during winter/night
 * 
 * Logic:
 * - If temperature < 26°C:
 *   - Every 5 minutes: Turn Exhaust Fan ON for 40 seconds
 * - If ammonia > threshold: Run exhaust continuously
 * - Ceiling/Circulation fan: Always ON in minimum ventilation mode
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAdvancedAutomationSettings } from './useAdvancedAutomation';
import { useFarmSettings } from './useFarmData';

export interface MinVentStatus {
  isActive: boolean;
  inCycle: boolean;
  cycleTimeRemaining: number;
  nextCycleIn: number;
  ammoniaOverride: boolean;
  ceilingFanOn: boolean;
  message: {
    bn: string;
    en: string;
  };
}

interface UseMinimumVentilationProps {
  temperature: number | null;
  ammonia: number | null;
  enabled?: boolean;
  onExhaustFanChange?: (on: boolean) => void;
  onCeilingFanChange?: (on: boolean) => void;
}

export function useMinimumVentilation({
  temperature,
  ammonia,
  enabled = true,
  onExhaustFanChange,
  onCeilingFanChange,
}: UseMinimumVentilationProps) {
  const { user } = useAuth();
  const { data: settings } = useAdvancedAutomationSettings();
  const { data: farmSettings } = useFarmSettings();
  
  const [status, setStatus] = useState<MinVentStatus>({
    isActive: false,
    inCycle: false,
    cycleTimeRemaining: 0,
    nextCycleIn: 0,
    ammoniaOverride: false,
    ceilingFanOn: false,
    message: { bn: 'বন্ধ', en: 'Off' },
  });
  
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCycleTimeRef = useRef<number>(0);

  const ammoniaThreshold = Number(farmSettings?.ammonia_max) || 25;

  // Check if minimum ventilation should be active
  const shouldActivate = useCallback(() => {
    if (!enabled || !settings?.min_vent_enabled) return false;
    if (temperature === null) return false;
    
    // Activate if temp below threshold
    return temperature < (settings?.min_vent_temp_threshold || 26);
  }, [enabled, settings, temperature]);

  // Check if ammonia requires continuous exhaust
  const needsAmmoniaOverride = useCallback(() => {
    if (ammonia === null) return false;
    return ammonia > ammoniaThreshold;
  }, [ammonia, ammoniaThreshold]);

  // Run a ventilation cycle
  const runCycle = useCallback(() => {
    if (!settings) return;
    
    const cycleDuration = (settings.min_vent_cycle_seconds || 40) * 1000;
    
    // Start exhaust fan
    onExhaustFanChange?.(true);
    lastCycleTimeRef.current = Date.now();
    
    setStatus(prev => ({
      ...prev,
      inCycle: true,
      cycleTimeRemaining: settings.min_vent_cycle_seconds || 40,
      message: { 
        bn: `এক্সহস্ট ফ্যান চলছে (${settings.min_vent_cycle_seconds || 40}সে)`,
        en: `Exhaust fan running (${settings.min_vent_cycle_seconds || 40}s)`
      },
    }));

    // Countdown timer
    cycleTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - lastCycleTimeRef.current) / 1000;
      const remaining = Math.max(0, (settings.min_vent_cycle_seconds || 40) - elapsed);
      
      if (remaining <= 0) {
        // End cycle
        if (cycleTimerRef.current) {
          clearInterval(cycleTimerRef.current);
          cycleTimerRef.current = null;
        }
        
        // Turn off exhaust (unless ammonia override)
        if (!needsAmmoniaOverride()) {
          onExhaustFanChange?.(false);
        }
        
        setStatus(prev => ({
          ...prev,
          inCycle: false,
          cycleTimeRemaining: 0,
          nextCycleIn: (settings.min_vent_interval_minutes || 5) * 60,
          message: { 
            bn: `পরবর্তী সাইকেল ${settings.min_vent_interval_minutes || 5} মিনিট পর`,
            en: `Next cycle in ${settings.min_vent_interval_minutes || 5} min`
          },
        }));
      } else {
        setStatus(prev => ({
          ...prev,
          cycleTimeRemaining: Math.ceil(remaining),
        }));
      }
    }, 1000);
  }, [settings, onExhaustFanChange, needsAmmoniaOverride]);

  // Main effect for minimum ventilation control
  useEffect(() => {
    if (!user || !settings) return;

    const isMinVentActive = shouldActivate();
    const ammoniaOverride = needsAmmoniaOverride();

    // Handle ammonia override - continuous exhaust
    if (ammoniaOverride) {
      onExhaustFanChange?.(true);
      setStatus(prev => ({
        ...prev,
        isActive: true,
        ammoniaOverride: true,
        message: {
          bn: `⚠️ অ্যামোনিয়া বেশি (${ammonia?.toFixed(0)}ppm) - এক্সহস্ট চলছে`,
          en: `⚠️ High ammonia (${ammonia?.toFixed(0)}ppm) - Exhaust running`
        },
      }));
      return;
    }

    // Update ceiling fan status
    if (isMinVentActive && settings.min_vent_ceiling_fan_always_on) {
      onCeilingFanChange?.(true);
      setStatus(prev => ({ ...prev, ceilingFanOn: true }));
    }

    // If not active, clean up
    if (!isMinVentActive) {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
        intervalTimerRef.current = null;
      }
      
      setStatus({
        isActive: false,
        inCycle: false,
        cycleTimeRemaining: 0,
        nextCycleIn: 0,
        ammoniaOverride: false,
        ceilingFanOn: false,
        message: { 
          bn: 'তাপমাত্রা স্বাভাবিক - মিনিমাম ভেন্টিলেশন বন্ধ',
          en: 'Temperature normal - Minimum ventilation off'
        },
      });
      return;
    }

    // Start interval timer for cycles
    if (!intervalTimerRef.current) {
      const intervalMs = (settings.min_vent_interval_minutes || 5) * 60 * 1000;
      
      setStatus(prev => ({
        ...prev,
        isActive: true,
        ammoniaOverride: false,
        message: { 
          bn: `মিনিমাম ভেন্টিলেশন সক্রিয় (প্রতি ${settings.min_vent_interval_minutes || 5} মিনিটে)`,
          en: `Minimum ventilation active (every ${settings.min_vent_interval_minutes || 5} min)`
        },
      }));
      
      // Run first cycle immediately
      runCycle();
      
      // Set up interval for subsequent cycles
      intervalTimerRef.current = setInterval(() => {
        if (!status.inCycle) {
          runCycle();
        }
      }, intervalMs);
    }

    return () => {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
      }
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [user, settings, shouldActivate, needsAmmoniaOverride, runCycle, onExhaustFanChange, onCeilingFanChange, ammonia, status.inCycle]);

  return status;
}
