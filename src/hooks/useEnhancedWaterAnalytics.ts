/**
 * MODULE 7: Enhanced Water Behaviour Monitoring
 * 
 * Track hourly water consumption baseline
 * 
 * Alerts:
 * - Water drop ≥30% → possible illness alert
 * - Night water spike → heat stress alert
 * - Zero flow daytime → pipeline blockage alert
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAdvancedAutomationSettings } from './useAdvancedAutomation';
import { useSelectedShed } from './useSheds';
import { useToast } from './use-toast';
import { useQuery } from '@tanstack/react-query';
import { subHours, format } from 'date-fns';

export type WaterAlertType = 'drop' | 'night_spike' | 'zero_flow' | 'none';

export interface WaterAnalyticsStatus {
  currentFlow: number | null;
  hourlyBaseline: number;
  percentChange: number;
  alertType: WaterAlertType;
  isNight: boolean;
  zeroFlowMinutes: number;
  message: {
    bn: string;
    en: string;
  };
}

interface UseEnhancedWaterAnalyticsProps {
  currentWaterFlow: number | null;
  enabled?: boolean;
}

// Night hours: 10 PM - 5 AM
function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 5;
}

// Daytime active hours: 5 AM - 10 PM
function isDaytimeActive(): boolean {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 22;
}

export function useEnhancedWaterAnalytics({
  currentWaterFlow,
  enabled = true,
}: UseEnhancedWaterAnalyticsProps) {
  const { user, language } = useAuth();
  const { data: settings } = useAdvancedAutomationSettings();
  const { selectedShedId } = useSelectedShed();
  const { toast } = useToast();
  
  const lastAlertTimeRef = useRef<Record<WaterAlertType, number>>({
    drop: 0,
    night_spike: 0,
    zero_flow: 0,
    none: 0,
  });
  const zeroFlowStartRef = useRef<number | null>(null);
  
  const [status, setStatus] = useState<WaterAnalyticsStatus>({
    currentFlow: null,
    hourlyBaseline: 0,
    percentChange: 0,
    alertType: 'none',
    isNight: false,
    zeroFlowMinutes: 0,
    message: { bn: 'পানি প্রবাহ স্বাভাবিক', en: 'Water flow normal' },
  });

  // Fetch hourly baseline (average of last 24 hours at same hour)
  const { data: baselineData } = useQuery({
    queryKey: ['water_hourly_baseline', user?.id, selectedShedId],
    queryFn: async () => {
      if (!user) return null;
      
      const now = new Date();
      const currentHour = now.getHours();
      const baselineHours = settings?.water_baseline_hours || 24;
      
      // Get readings from same hour over the baseline period
      const readings: number[] = [];
      
      for (let i = 1; i <= Math.ceil(baselineHours / 24); i++) {
        const targetDate = subHours(now, i * 24);
        const startOfHour = new Date(targetDate);
        startOfHour.setMinutes(0, 0, 0);
        const endOfHour = new Date(targetDate);
        endOfHour.setMinutes(59, 59, 999);
        
        let query = supabase
          .from('sensor_readings')
          .select('water_usage')
          .eq('user_id', user.id)
          .gte('recorded_at', startOfHour.toISOString())
          .lte('recorded_at', endOfHour.toISOString());
        
        if (selectedShedId) {
          query = query.eq('shed_id', selectedShedId);
        }
        
        const { data } = await query;
        
        if (data && data.length > 0) {
          const avg = data.reduce((sum, r) => sum + Number(r.water_usage), 0) / data.length;
          readings.push(avg);
        }
      }
      
      if (readings.length === 0) return 0;
      return readings.reduce((a, b) => a + b, 0) / readings.length;
    },
    enabled: !!user && enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000,
  });

  const hourlyBaseline = baselineData || 0;

  // Create alert
  const createAlert = async (type: WaterAlertType, message: { bn: string; en: string }) => {
    if (!user) return;
    
    // Throttle: max once per hour per alert type
    const now = Date.now();
    if (now - lastAlertTimeRef.current[type] < 60 * 60 * 1000) {
      return;
    }
    
    try {
      await supabase.from('alerts').insert({
        user_id: user.id,
        alert_type: 'water',
        severity: type === 'zero_flow' ? 'danger' : 'warning',
        message: message.en,
        message_bn: message.bn,
        shed_id: selectedShedId || null,
      });
      
      toast({
        title: language === 'bn' ? '🚰 পানি সতর্কতা' : '🚰 Water Alert',
        description: message[language],
        variant: type === 'zero_flow' ? 'destructive' : 'default',
      });
      
      lastAlertTimeRef.current[type] = now;
      
      console.log(`[Water Analytics] Alert: ${type} - ${message.en}`);
    } catch (error) {
      console.error('[Water Analytics] Failed to create alert:', error);
    }
  };

  // Main analytics logic
  useEffect(() => {
    if (!user || !settings || !enabled || currentWaterFlow === null) return;

    const isNight = isNightTime();
    const isDayActive = isDaytimeActive();
    const dropThreshold = settings.water_drop_threshold_percent || 30;
    
    let alertType: WaterAlertType = 'none';
    let message = { bn: 'পানি প্রবাহ স্বাভাবিক', en: 'Water flow normal' };
    let percentChange = 0;
    
    if (hourlyBaseline > 0) {
      percentChange = ((currentWaterFlow - hourlyBaseline) / hourlyBaseline) * 100;
    }

    // Check 1: Water drop ≥30% (possible illness)
    if (settings.water_drop_threshold_percent && percentChange <= -dropThreshold && hourlyBaseline > 0) {
      alertType = 'drop';
      message = {
        bn: `⚠️ পানি ব্যবহার ${Math.abs(percentChange).toFixed(0)}% কমেছে - অসুস্থতার সম্ভাবনা`,
        en: `⚠️ Water usage dropped ${Math.abs(percentChange).toFixed(0)}% - Possible illness`
      };
      createAlert('drop', message);
    }
    
    // Check 2: Night water spike (heat stress)
    if (settings.water_night_spike_enabled && isNight && currentWaterFlow > hourlyBaseline * 1.5 && hourlyBaseline > 0) {
      alertType = 'night_spike';
      message = {
        bn: `🌙 রাতে অস্বাভাবিক পানি ব্যবহার - হিট স্ট্রেসের লক্ষণ`,
        en: `🌙 Unusual night water usage - Sign of heat stress`
      };
      createAlert('night_spike', message);
    }
    
    // Check 3: Zero flow during daytime (pipeline blockage)
    if (settings.water_zero_flow_alert && isDayActive) {
      if (currentWaterFlow === 0) {
        if (zeroFlowStartRef.current === null) {
          zeroFlowStartRef.current = Date.now();
        }
        
        const zeroMinutes = Math.floor((Date.now() - zeroFlowStartRef.current) / 60000);
        
        // Alert after 10 minutes of zero flow
        if (zeroMinutes >= 10) {
          alertType = 'zero_flow';
          message = {
            bn: `🚫 ${zeroMinutes} মিনিট ধরে পানি প্রবাহ নেই - পাইপলাইন ব্লক!`,
            en: `🚫 Zero water flow for ${zeroMinutes} min - Pipeline blocked!`
          };
          createAlert('zero_flow', message);
        }
        
        setStatus(prev => ({ ...prev, zeroFlowMinutes: zeroMinutes }));
      } else {
        zeroFlowStartRef.current = null;
        setStatus(prev => ({ ...prev, zeroFlowMinutes: 0 }));
      }
    }

    setStatus({
      currentFlow: currentWaterFlow,
      hourlyBaseline,
      percentChange,
      alertType,
      isNight,
      zeroFlowMinutes: zeroFlowStartRef.current 
        ? Math.floor((Date.now() - zeroFlowStartRef.current) / 60000) 
        : 0,
      message,
    });
  }, [user, settings, enabled, currentWaterFlow, hourlyBaseline, selectedShedId]);

  return status;
}
