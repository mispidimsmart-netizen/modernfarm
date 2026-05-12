/**
 * Emergency Protection — DISPLAY ONLY
 * 
 * All emergency detection, escalation, force-ventilation, and survival mode
 * logic runs on ESP32 firmware and backend safety-engine.
 * 
 * This hook reads emergency_events from DB and safety_status for display.
 * Acknowledge/resolve actions still write to DB (user intent).
 */

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafetyStatus, type EmergencyPriority } from './useSafetyStatus';
import { ShedContext, useSheds } from './useSheds';

export type { EmergencyPriority };

export type EmergencyTrigger =
  | 'heatstroke_risk'
  | 'sensor_offline'
  | 'ammonia_high'
  | 'power_unstable'
  | 'multi_device_offline';

export type EmergencyAction =
  | 'force_ventilation'
  | 'disable_heater'
  | 'notify_owner'
  | 'call_webhook';

export interface EmergencyEvent {
  id: string;
  trigger_type: EmergencyTrigger;
  priority: EmergencyPriority;
  title: string;
  title_bn: string;
  description: string | null;
  description_bn: string | null;
  actions_taken: EmergencyAction[];
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  sensor_snapshot: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
  webhook_called: boolean;
  source: string;
}

const PRIORITY_ORDER: Record<EmergencyPriority, number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
  LIFE_THREATENING: 3,
};

export function useEmergencyProtection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const safety = useSafetyStatus();

  // Multi-shed scoping: when an account has >1 shed AND a specific shed is selected,
  // only show events that belong to that shed (or are farm-wide / shed_id NULL).
  // Single-shed accounts behave exactly as before.
  const shedCtx = useContext(ShedContext);
  const selectedShedId = shedCtx?.selectedShedId ?? null;
  const { data: sheds = [] } = useSheds();
  const scopeShedId = sheds.length > 1 && selectedShedId ? selectedShedId : null;

  // Fetch active emergency events (display only)
  const { data: activeEvents = [] } = useQuery({
    queryKey: ['emergency-events', user?.id, scopeShedId],
    queryFn: async () => {
      if (!user) return [];
      let q = (supabase.from('emergency_events') as any)
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'escalated']);
      if (scopeShedId) {
        // Include events for this shed + farm-wide events with no shed_id
        q = q.or(`shed_id.eq.${scopeShedId},shed_id.is.null`);
      }
      const { data, error } = await q
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as EmergencyEvent[];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Fetch all events (history display)
  const { data: allEvents = [] } = useQuery({
    queryKey: ['emergency-events-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase.from('emergency_events') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as EmergencyEvent[];
    },
    enabled: !!user,
  });

  // Realtime subscription for emergency events
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`emergency_events_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emergency_events',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['emergency-events'] });
        queryClient.invalidateQueries({ queryKey: ['emergency-events-all'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // User actions: acknowledge & resolve (writes to DB)
  const acknowledgeEvent = useCallback(async (eventId: string) => {
    if (!user) return;
    await (supabase.from('emergency_events') as any)
      .update({ status: 'acknowledged' })
      .eq('id', eventId)
      .eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['emergency-events'] });
  }, [user, queryClient]);

  const resolveEvent = useCallback(async (eventId: string, notes?: string) => {
    if (!user) return;
    await (supabase.from('emergency_events') as any)
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: notes || null,
      })
      .eq('id', eventId)
      .eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['emergency-events'] });
  }, [user, queryClient]);

  // Highest priority from safety_status (backend-determined)
  const highestPriority = useMemo((): EmergencyPriority | null => {
    if (safety.emergencyActive && safety.emergencyPriority) {
      return safety.emergencyPriority;
    }
    if (activeEvents.length === 0) return null;
    return activeEvents.reduce((max, e) => {
      const p = e.priority as EmergencyPriority;
      return PRIORITY_ORDER[p] > PRIORITY_ORDER[max] ? p : max;
    }, 'INFO' as EmergencyPriority);
  }, [activeEvents, safety.emergencyActive, safety.emergencyPriority]);

  return {
    activeEvents,
    allEvents,
    highestPriority,
    acknowledgeEvent,
    resolveEvent,
    isEmergency: safety.emergencyActive || activeEvents.some(e =>
      e.priority === 'CRITICAL' || e.priority === 'LIFE_THREATENING'
    ),
  };
}
