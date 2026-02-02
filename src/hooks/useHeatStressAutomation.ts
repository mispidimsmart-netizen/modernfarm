import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { calculateHSI, HeatStressResult } from '@/lib/heatStressIndex';
import { useToast } from '@/hooks/use-toast';

interface UseHeatStressAutomationProps {
  temperature: number | null;
  humidity: number | null;
  shedId?: string | null;
  enabled?: boolean;
}

export function useHeatStressAutomation({
  temperature,
  humidity,
  shedId,
  enabled = true,
}: UseHeatStressAutomationProps) {
  const { user, language } = useAuth();
  const { toast } = useToast();
  const lastAlertLevel = useRef<string | null>(null);
  const lastFanAction = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled || !user || temperature === null || humidity === null) {
      return;
    }

    const hsiResult = calculateHSI(temperature, humidity);

    // Handle fan automation
    if (hsiResult.shouldActivateFan && lastFanAction.current !== true) {
      activateFan(hsiResult);
      lastFanAction.current = true;
    } else if (!hsiResult.shouldActivateFan && lastFanAction.current !== false) {
      lastFanAction.current = false;
    }

    // Handle alerts (only create if level changed and alert is needed)
    if (
      hsiResult.shouldAlert &&
      hsiResult.level !== lastAlertLevel.current
    ) {
      createAlert(hsiResult);
      lastAlertLevel.current = hsiResult.level;
    } else if (!hsiResult.shouldAlert) {
      lastAlertLevel.current = null;
    }
  }, [temperature, humidity, enabled, user]);

  const activateFan = async (hsiResult: HeatStressResult) => {
    if (!user) return;

    try {
      // Update device status to turn on fan
      const { error } = await supabase
        .from('device_status')
        .update({
          fan_on: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('shed_id', shedId || '');

      if (error && error.code !== 'PGRST116') {
        // If no row matched with shed_id, try without it
        await supabase
          .from('device_status')
          .update({
            fan_on: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }

      // Show toast notification
      toast({
        title: language === 'bn' ? 'অটো ফ্যান চালু' : 'Auto Fan ON',
        description: language === 'bn'
          ? `HSI ${hsiResult.index} - ${hsiResult.message.bn}`
          : `HSI ${hsiResult.index} - ${hsiResult.message.en}`,
      });

      console.log(`[HSI Automation] Fan activated - HSI: ${hsiResult.index}, Level: ${hsiResult.level}`);
    } catch (error) {
      console.error('[HSI Automation] Failed to activate fan:', error);
    }
  };

  const createAlert = async (hsiResult: HeatStressResult) => {
    if (!user || !hsiResult.alertSeverity) return;

    try {
      const alertData = {
        user_id: user.id,
        alert_type: 'temperature' as const,
        severity: hsiResult.alertSeverity,
        message: `Heat Stress Index: ${hsiResult.index} - ${hsiResult.message.en}`,
        message_bn: `হিট স্ট্রেস ইনডেক্স: ${hsiResult.index} - ${hsiResult.message.bn}`,
        shed_id: shedId || null,
      };

      const { error } = await supabase
        .from('alerts')
        .insert(alertData);

      if (error) {
        console.error('[HSI Automation] Failed to create alert:', error);
        return;
      }

      // Show toast for severe/emergency alerts
      if (hsiResult.level === 'severe' || hsiResult.level === 'emergency') {
        toast({
          title: language === 'bn' ? '⚠️ তাপ চাপ সতর্কতা!' : '⚠️ Heat Stress Alert!',
          description: hsiResult.message[language],
          variant: 'destructive',
        });
      }

      console.log(`[HSI Automation] Alert created - Level: ${hsiResult.level}`);
    } catch (error) {
      console.error('[HSI Automation] Failed to create alert:', error);
    }
  };

  // Return current HSI result for display
  if (temperature === null || humidity === null) {
    return null;
  }

  return calculateHSI(temperature, humidity);
}
