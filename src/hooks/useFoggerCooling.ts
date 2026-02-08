/**
 * MODULE 3: Intelligent Fogger Cooling
 * 
 * Condition to start cooling:
 * - temp ≥ 32°C AND humidity < 85%
 * 
 * Operation cycle:
 * - Fogger ON 40 sec
 * - Pause 120 sec
 * - Repeat
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

export interface FoggerStatus {
  isActive: boolean;
  isSpraying: boolean;
  sprayTimeRemaining: number;
  pauseTimeRemaining: number;
  cycleCount: number;
  stopReason: 'temp_reached' | 'humidity_reached' | 'manual' | null;
  message: {
    bn: string;
    en: string;
  };
}

interface UseFoggerCoolingProps {
  temperature: number | null;
  humidity: number | null;
  enabled?: boolean;
  onFoggerChange?: (on: boolean) => void;
  onExhaustFanChange?: (on: boolean) => void;
}

export function useFoggerCooling({
  temperature,
  humidity,
  enabled = true,
  onFoggerChange,
  onExhaustFanChange,
}: UseFoggerCoolingProps) {
  const { user } = useAuth();
  const { data: settings } = useAdvancedAutomationSettings();
  
  const [status, setStatus] = useState<FoggerStatus>({
    isActive: false,
    isSpraying: false,
    sprayTimeRemaining: 0,
    pauseTimeRemaining: 0,
    cycleCount: 0,
    stopReason: null,
    message: { bn: 'ফগার বন্ধ', en: 'Fogger off' },
  });
  
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseStartRef = useRef<number>(0);
  const cycleCountRef = useRef<number>(0);
  const currentPhaseRef = useRef<'spray' | 'pause' | 'idle'>('idle');

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

  // Run spray phase
  const startSpray = useCallback(() => {
    if (!settings) return;
    
    onFoggerChange?.(true);
    onExhaustFanChange?.(true); // Exhaust must run during fogger
    
    currentPhaseRef.current = 'spray';
    phaseStartRef.current = Date.now();
    
    const sprayDuration = (settings.fogger_on_seconds || 40) * 1000;
    
    setStatus(prev => ({
      ...prev,
      isSpraying: true,
      sprayTimeRemaining: settings.fogger_on_seconds || 40,
      pauseTimeRemaining: 0,
      message: {
        bn: `💨 ফগার স্প্রে চলছে (${settings.fogger_on_seconds || 40}সে)`,
        en: `💨 Fogger spraying (${settings.fogger_on_seconds || 40}s)`
      },
    }));
  }, [settings, onFoggerChange, onExhaustFanChange]);

  // Run pause phase
  const startPause = useCallback(() => {
    if (!settings) return;
    
    onFoggerChange?.(false);
    // Keep exhaust running during pause
    
    currentPhaseRef.current = 'pause';
    phaseStartRef.current = Date.now();
    cycleCountRef.current += 1;
    
    setStatus(prev => ({
      ...prev,
      isSpraying: false,
      sprayTimeRemaining: 0,
      pauseTimeRemaining: settings.fogger_pause_seconds || 120,
      cycleCount: cycleCountRef.current,
      message: {
        bn: `⏸️ ফগার বিরতি (${settings.fogger_pause_seconds || 120}সে)`,
        en: `⏸️ Fogger pause (${settings.fogger_pause_seconds || 120}s)`
      },
    }));
  }, [settings, onFoggerChange]);

  // Stop fogger completely
  const stopFogger = useCallback((reason: 'temp_reached' | 'humidity_reached' | 'manual') => {
    onFoggerChange?.(false);
    currentPhaseRef.current = 'idle';
    
    const reasonMessages = {
      temp_reached: {
        bn: '✅ তাপমাত্রা পৌঁছেছে - ফগার বন্ধ',
        en: '✅ Temperature reached - Fogger stopped'
      },
      humidity_reached: {
        bn: '✅ আর্দ্রতা পৌঁছেছে - ফগার বন্ধ',
        en: '✅ Humidity reached - Fogger stopped'
      },
      manual: {
        bn: 'ফগার ম্যানুয়ালি বন্ধ',
        en: 'Fogger manually stopped'
      },
    };
    
    setStatus(prev => ({
      ...prev,
      isActive: false,
      isSpraying: false,
      sprayTimeRemaining: 0,
      pauseTimeRemaining: 0,
      stopReason: reason,
      message: reasonMessages[reason],
    }));
  }, [onFoggerChange]);

  // Main fogger control loop
  useEffect(() => {
    if (!user || !settings) return;

    // Check stop conditions first
    const { stop, reason } = shouldStop();
    if (stop && status.isActive) {
      stopFogger(reason || 'manual');
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      return;
    }

    // Check if we should activate
    if (!shouldActivate()) {
      if (status.isActive) {
        stopFogger('manual');
      }
      return;
    }

    // Start fogger cycle if not already running
    if (!status.isActive) {
      cycleCountRef.current = 0;
      setStatus(prev => ({
        ...prev,
        isActive: true,
        cycleCount: 0,
        stopReason: null,
      }));
      startSpray();
    }

    // Set up cycle timer
    if (!cycleTimerRef.current) {
      cycleTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - phaseStartRef.current) / 1000;
        
        if (currentPhaseRef.current === 'spray') {
          const sprayDuration = settings.fogger_on_seconds || 40;
          const remaining = Math.max(0, sprayDuration - elapsed);
          
          if (remaining <= 0) {
            startPause();
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
              startSpray();
            } else if (shouldStopNow) {
              stopFogger(shouldStop().reason || 'temp_reached');
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
  }, [user, settings, shouldActivate, shouldStop, status.isActive, startSpray, startPause, stopFogger]);

  return status;
}
