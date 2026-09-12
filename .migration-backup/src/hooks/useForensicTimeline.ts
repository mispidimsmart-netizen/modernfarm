/**
 * Forensic Safety Timeline Hook
 * 
 * Fetches last 24h of safety timeline entries for dispute analysis.
 * Subscribes to realtime updates for live forensic monitoring.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useSelectedShed } from './useSheds';

export interface ForensicEntry {
  id: string;
  recorded_at: string;
  system_state: string;
  uptime_ms: number;
  
  // Requested vs Actual relay state
  requested_fan: boolean;
  requested_fan_speed: string;
  requested_heater: boolean;
  requested_fogger: boolean;
  requested_alarm: boolean;
  requested_circulation_fan: boolean;
  actual_fan: boolean;
  actual_fan_speed: string;
  actual_heater: boolean;
  actual_fogger: boolean;
  actual_alarm: boolean;
  actual_circulation_fan: boolean;
  
  // Mismatch
  relay_mismatch: boolean;
  mismatch_details: string | null;
  
  // Environment
  temperature: number | null;
  temperature2: number | null;
  worst_case_max_temp: number | null;
  worst_case_min_temp: number | null;
  humidity: number | null;
  ammonia: number | null;
  hsi_value: number | null;
  
  // Deltas
  temp_delta_1min: number | null;
  temp_delta_5min: number | null;
  humidity_delta_1min: number | null;
  
  // Safety
  safety_override_active: boolean;
  heater_allowed: boolean;
  force_ventilation: boolean;
  fan_effect_verified: boolean | null;
  heater_effect_verified: boolean | null;
  thermal_model_plausible: boolean;
  
  // Reboot
  reboot_heater_locked: boolean;
  reboot_vent_purge: boolean;
  reboot_nh3_muted: boolean;
  
  // Source
  source: string;
  event_type: string;
  event_detail: string | null;
}

export function useForensicTimeline(filterMismatchOnly = false) {
  const { user } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    queryKey: ['forensic-timeline', user?.id, selectedShedId, filterMismatchOnly],
    queryFn: async () => {
      if (!user) return [];
      
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      let query = (supabase.from('safety_timeline') as any)
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false })
        .limit(500);

      if (selectedShedId) {
        query = query.eq('shed_id', selectedShedId);
      }
      if (filterMismatchOnly) {
        query = query.eq('relay_mismatch', true);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[ForensicTimeline] Fetch error:', error);
        return [];
      }
      return (data || []) as ForensicEntry[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`forensic_timeline_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'safety_timeline',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['forensic-timeline'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // Derived stats
  const mismatchCount = entries?.filter(e => e.relay_mismatch).length || 0;
  const criticalEvents = entries?.filter(e => 
    e.system_state === 'EMERGENCY' || e.system_state === 'SURVIVAL' || e.system_state === 'SENSOR_FAIL'
  ).length || 0;
  const safetyOverrideCount = entries?.filter(e => e.safety_override_active).length || 0;

  return {
    entries: entries || [],
    isLoading,
    mismatchCount,
    criticalEvents,
    safetyOverrideCount,
    totalEntries: entries?.length || 0,
  };
}
