/**
 * Cooling Efficiency Detection
 * 
 * Detects when cooling is active but not effective:
 * - Fogger running for 10+ minutes but temperature not dropping
 * - Indicates potential issues: water supply, clogged filter, nozzle blockage
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedShed } from '@/hooks/useSheds';

export interface CoolingEfficiencyResult {
  isInefficient: boolean;
  coolingActiveMinutes: number;
  tempChangePercent: number;
  startTemp: number | null;
  currentTemp: number | null;
  message: {
    bn: string;
    en: string;
  };
  advisory: {
    bn: string;
    en: string;
  } | null;
}

interface UseCoolingEfficiencyProps {
  temperature: number | null;
  foggerActive: boolean;
  enabled?: boolean;
}

const INEFFICIENCY_THRESHOLD_MINUTES = 10; // Alert after 10 minutes
const MIN_EXPECTED_TEMP_DROP = 0.5; // Expect at least 0.5°C drop in 10 minutes

export function useCoolingEfficiency({
  temperature,
  foggerActive,
  enabled = true,
}: UseCoolingEfficiencyProps): CoolingEfficiencyResult {
  const { user, language } = useAuth();
  const { selectedShedId } = useSelectedShed();
  
  const [result, setResult] = useState<CoolingEfficiencyResult>({
    isInefficient: false,
    coolingActiveMinutes: 0,
    tempChangePercent: 0,
    startTemp: null,
    currentTemp: null,
    message: { bn: 'কুলিং বন্ধ', en: 'Cooling off' },
    advisory: null,
  });
  
  const foggerStartTimeRef = useRef<number | null>(null);
  const startTempRef = useRef<number | null>(null);
  const alertSentRef = useRef<boolean>(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create alert when inefficiency detected
  const createInefficiencyAlert = useCallback(async (
    minutes: number,
    startTemp: number,
    currentTemp: number
  ) => {
    if (!user || alertSentRef.current) return;
    
    alertSentRef.current = true;

    try {
      const alertData = {
        user_id: user.id,
        alert_type: 'water' as const,
        severity: 'info' as const,
        message: `Cooling inefficiency: Fogger active ${minutes} min but temp stable (${startTemp.toFixed(1)}→${currentTemp.toFixed(1)}°C). Check water supply, filter, or nozzles.`,
        message_bn: `কুলিং অকার্যকর: ফগার ${minutes} মিনিট চলছে কিন্তু তাপমাত্রা কমছে না (${startTemp.toFixed(1)}→${currentTemp.toFixed(1)}°সে)। পানি সাপ্লাই, ফিল্টার বা নজল চেক করুন।`,
        shed_id: selectedShedId || null,
      };

      await supabase.from('alerts').insert(alertData);
      console.log(`[Cooling Efficiency] Alert created - ${minutes} min without temp drop`);
    } catch (error) {
      console.error('[Cooling Efficiency] Failed to create alert:', error);
    }
  }, [user, selectedShedId]);

  // Monitor cooling efficiency
  useEffect(() => {
    if (!enabled || temperature === null) {
      return;
    }

    // Fogger just started
    if (foggerActive && foggerStartTimeRef.current === null) {
      foggerStartTimeRef.current = Date.now();
      startTempRef.current = temperature;
      alertSentRef.current = false;
      
      setResult(prev => ({
        ...prev,
        isInefficient: false,
        coolingActiveMinutes: 0,
        startTemp: temperature,
        currentTemp: temperature,
        tempChangePercent: 0,
        message: { bn: '💨 কুলিং শুরু হয়েছে', en: '💨 Cooling started' },
        advisory: null,
      }));
    }
    
    // Fogger stopped
    if (!foggerActive && foggerStartTimeRef.current !== null) {
      foggerStartTimeRef.current = null;
      startTempRef.current = null;
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      setResult(prev => ({
        ...prev,
        isInefficient: false,
        coolingActiveMinutes: 0,
        message: { bn: 'কুলিং বন্ধ', en: 'Cooling off' },
        advisory: null,
      }));
      return;
    }

    // Check efficiency while fogger is running
    if (foggerActive && foggerStartTimeRef.current !== null && startTempRef.current !== null) {
      const activeMinutes = Math.floor((Date.now() - foggerStartTimeRef.current) / (1000 * 60));
      const tempDrop = startTempRef.current - temperature;
      const tempChangePercent = startTempRef.current > 0 
        ? (tempDrop / startTempRef.current) * 100 
        : 0;

      // Check if cooling is inefficient after threshold
      const isInefficient = activeMinutes >= INEFFICIENCY_THRESHOLD_MINUTES && tempDrop < MIN_EXPECTED_TEMP_DROP;

      let message: { bn: string; en: string };
      let advisory: { bn: string; en: string } | null = null;

      if (isInefficient) {
        message = {
          bn: `⚠️ কুলিং অকার্যকর (${activeMinutes} মিনিট)`,
          en: `⚠️ Cooling ineffective (${activeMinutes} min)`,
        };
        advisory = {
          bn: '🔧 চেক করুন: পানি সাপ্লাই, ফিল্টার, নজল ব্লকেজ',
          en: '🔧 Check: water supply, filter, nozzle blockage',
        };

        // Create alert once
        if (!alertSentRef.current) {
          createInefficiencyAlert(activeMinutes, startTempRef.current, temperature);
        }
      } else if (tempDrop >= MIN_EXPECTED_TEMP_DROP) {
        message = {
          bn: `✅ কুলিং কাজ করছে (-${tempDrop.toFixed(1)}°সে)`,
          en: `✅ Cooling working (-${tempDrop.toFixed(1)}°C)`,
        };
      } else {
        message = {
          bn: `💨 কুলিং চলছে (${activeMinutes} মিনিট)`,
          en: `💨 Cooling active (${activeMinutes} min)`,
        };
      }

      setResult({
        isInefficient,
        coolingActiveMinutes: activeMinutes,
        tempChangePercent,
        startTemp: startTempRef.current,
        currentTemp: temperature,
        message,
        advisory,
      });
    }
  }, [temperature, foggerActive, enabled, createInefficiencyAlert]);

  // Set up periodic check interval
  useEffect(() => {
    if (foggerActive && !checkIntervalRef.current) {
      checkIntervalRef.current = setInterval(() => {
        // Force re-render to update active minutes
        setResult(prev => ({ ...prev }));
      }, 30 * 1000); // Check every 30 seconds
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [foggerActive]);

  return result;
}
