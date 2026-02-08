/**
 * MODULE 6: Curtain Advisory AI
 * 
 * If insideTemp > target AND outsideTemp lower:
 *   notify("Open curtain partially")
 * 
 * If cold + high airflow detected:
 *   notify("Close curtain")
 * 
 * No motor control — advisory only
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAdvancedAutomationSettings } from './useAdvancedAutomation';
import { useWeatherCache } from './useWeather';
import { useSelectedShed } from './useSheds';
import { useToast } from './use-toast';

export type CurtainAction = 'open' | 'close' | 'none';

export interface CurtainAdvisoryStatus {
  recommendedAction: CurtainAction;
  insideTemp: number | null;
  outsideTemp: number | null;
  tempDiff: number;
  isCold: boolean;
  highAirflow: boolean;
  lastAdvisorySent: Date | null;
  message: {
    bn: string;
    en: string;
  };
}

interface UseCurtainAdvisoryProps {
  insideTemp: number | null;
  fanSpeed: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
  enabled?: boolean;
}

// Minimum interval between advisories (30 minutes)
const ADVISORY_COOLDOWN_MS = 30 * 60 * 1000;

export function useCurtainAdvisory({
  insideTemp,
  fanSpeed,
  enabled = true,
}: UseCurtainAdvisoryProps) {
  const { user, language } = useAuth();
  const { data: settings } = useAdvancedAutomationSettings();
  const { data: weather } = useWeatherCache();
  const { selectedShedId } = useSelectedShed();
  const { toast } = useToast();
  
  const lastAdvisoryRef = useRef<{ action: CurtainAction; time: number }>({ action: 'none', time: 0 });
  
  const [status, setStatus] = useState<CurtainAdvisoryStatus>({
    recommendedAction: 'none',
    insideTemp: null,
    outsideTemp: null,
    tempDiff: 0,
    isCold: false,
    highAirflow: false,
    lastAdvisorySent: null,
    message: { bn: 'পর্দা পরামর্শ নেই', en: 'No curtain advisory' },
  });

  // Get outside temperature from weather data
  const outsideTemp = weather?.temperature ?? null;

  // Check if it's cold (inside temp < 22°C)
  const isCold = (insideTemp !== null && insideTemp < 22);

  // Check if high airflow (fan at HIGH)
  const highAirflow = fanSpeed === 'HIGH';

  // Determine recommended action
  const getRecommendedAction = useCallback((): { action: CurtainAction; message: { bn: string; en: string } } => {
    if (!settings?.curtain_advisory_enabled || !enabled) {
      return { action: 'none', message: { bn: 'পর্দা পরামর্শ বন্ধ', en: 'Curtain advisory disabled' } };
    }

    if (insideTemp === null || outsideTemp === null) {
      return { action: 'none', message: { bn: 'তাপমাত্রা ডেটা নেই', en: 'No temperature data' } };
    }

    const tempDiff = insideTemp - outsideTemp;
    const threshold = settings.curtain_open_temp_diff || 3;

    // Case 1: Inside hot, outside cooler - suggest opening
    if (tempDiff > threshold && outsideTemp < insideTemp) {
      return {
        action: 'open',
        message: {
          bn: `🪟 পর্দা খুলুন - ভিতরে ${insideTemp.toFixed(1)}°C, বাইরে ${outsideTemp.toFixed(1)}°C`,
          en: `🪟 Open curtain - Inside ${insideTemp.toFixed(1)}°C, Outside ${outsideTemp.toFixed(1)}°C`
        }
      };
    }

    // Case 2: Cold + high airflow - suggest closing
    if (settings.curtain_close_on_cold && isCold && highAirflow) {
      return {
        action: 'close',
        message: {
          bn: `🔒 পর্দা বন্ধ করুন - ঠান্ডা (${insideTemp.toFixed(1)}°C) + উচ্চ বায়ুপ্রবাহ`,
          en: `🔒 Close curtain - Cold (${insideTemp.toFixed(1)}°C) + High airflow`
        }
      };
    }

    return {
      action: 'none',
      message: {
        bn: 'পর্দা অবস্থা ঠিক আছে',
        en: 'Curtain position is fine'
      }
    };
  }, [settings, enabled, insideTemp, outsideTemp, isCold, highAirflow]);

  // Send advisory notification
  const sendAdvisory = useCallback(async (action: CurtainAction, message: { bn: string; en: string }) => {
    if (!user) return;

    // Check cooldown
    const now = Date.now();
    if (
      lastAdvisoryRef.current.action === action &&
      now - lastAdvisoryRef.current.time < ADVISORY_COOLDOWN_MS
    ) {
      return; // Skip - same advisory sent recently
    }

    try {
      // Insert notification
      await supabase.from('schedule_notifications').insert({
        user_id: user.id,
        schedule_id: null,
        notification_type: 'curtain_advisory',
        advisory_type: action,
        message: message.en,
        message_bn: message.bn,
      });

      // Show toast
      toast({
        title: language === 'bn' ? '🪟 পর্দা পরামর্শ' : '🪟 Curtain Advisory',
        description: message[language],
      });

      lastAdvisoryRef.current = { action, time: now };
      
      setStatus(prev => ({
        ...prev,
        lastAdvisorySent: new Date(),
      }));

      console.log(`[Curtain Advisory] Sent: ${action} - ${message.en}`);
    } catch (error) {
      console.error('[Curtain Advisory] Failed to send:', error);
    }
  }, [user, language, toast]);

  // Main advisory logic
  useEffect(() => {
    if (!user || !settings) return;

    const { action, message } = getRecommendedAction();
    const tempDiff = (insideTemp ?? 0) - (outsideTemp ?? 0);

    setStatus({
      recommendedAction: action,
      insideTemp,
      outsideTemp,
      tempDiff,
      isCold,
      highAirflow,
      lastAdvisorySent: lastAdvisoryRef.current.time 
        ? new Date(lastAdvisoryRef.current.time) 
        : null,
      message,
    });

    // Send advisory if action needed
    if (action !== 'none') {
      sendAdvisory(action, message);
    }
  }, [user, settings, getRecommendedAction, insideTemp, outsideTemp, isCold, highAirflow, sendAdvisory]);

  return status;
}
