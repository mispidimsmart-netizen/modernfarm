import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useAuditLog } from './useAuditLog';

export type AutomationMode = 'AUTO' | 'MANUAL';

export function useAutomationMode() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['automation_mode', user?.id, selectedFarmId],
    queryFn: async (): Promise<AutomationMode> => {
      if (!user) return 'AUTO';
      
      // Scope by farm_id only. farm_settings has ONE row per farm owned by the
      // farm owner, so a user_id filter made workers / org owners read nothing
      // and see 'AUTO' on a farm that is actually in MANUAL mode. RLS decides
      // which farms this user may read.
      let query = supabase
        .from('farm_settings')
        .select('automation_mode');

      if (selectedFarmId) {
        query = query.eq('farm_id', selectedFarmId);
      } else {
        query = query.eq('user_id', user.id);
      }
      
      
      // Use maybeSingle() — new farms may have 0 farm_settings rows, and
      // .single() would throw and silently fall back to 'AUTO' even when
      // MANUAL was set. maybeSingle returns null cleanly.
      const { data, error } = await query.maybeSingle();
      if (error) {
        // Never answer 'AUTO' on a transient read failure — that would claim a
        // MANUAL farm is automated. Throw so react-query retries and keeps the
        // last known mode on screen.
        console.warn('[useAutomationMode] read failed:', error);
        throw error;
      }
      return (data?.automation_mode as AutomationMode) ?? 'AUTO';
    },
    enabled: !!user,
    staleTime: 5000,
    retry: 3,
    placeholderData: (prev) => prev,
  });
}

// NOTE: automation_mode is stored in farm_settings and is FARM-WIDE
// (one row per farm). Accepting a shedId here would create a misleading
// per-shed illusion — the mode change would still apply to every shed
// of the farm. To keep behaviour honest, this mutation is farm-scoped
// end-to-end: it wipes desired_* on ALL sheds of the farm so no shed is
// left with a stale override after the mode flip.
type SetModeInput = AutomationMode | { mode: AutomationMode; shedId?: string | null };

export function useSetAutomationMode() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: SetModeInput) => {
      if (!user) throw new Error('Not authenticated');
      // Hard guard: never run an unscoped farm-wide update across every farm.
      if (!selectedFarmId) throw new Error('NO_FARM_SELECTED');
      const mode: AutomationMode = typeof input === 'string' ? input : input.mode;
      // shedId intentionally IGNORED — mode is farm-wide, see note above.

      const isManual = mode === 'MANUAL';

      // ═══════════════════════════════════════════════════════════
      // ATOMIC SWITCH (MODE-02)
      // farm_settings + every shed's device_status (desired_* cleared) +
      // device_health + the stop_automation command are written inside ONE
      // transaction by `set_farm_automation_mode`. Previously these were four
      // separate client writes: a failure in the middle left the UI, the cloud
      // and the board in different modes. The RPC also enforces the
      // hardware-change permission server-side (workers cannot flip the mode).
      // ═══════════════════════════════════════════════════════════
      const { error } = await supabase.rpc('set_farm_automation_mode' as any, {
        _farm_id: selectedFarmId,
        _mode: mode,
      });

      if (error) {
        console.error('Failed to switch automation mode atomically:', error);
        throw error;
      }

      // ═══════════════════════════════════════════════════════════
      // Audit log (outside the transaction: never blocks the mode switch)
      // ═══════════════════════════════════════════════════════════
      logAction({
        action_type: 'automation_mode_change',
        action_category: 'automation',
        target_entity: 'farm_settings',
        new_value: { automation_mode: mode },
        severity: isManual ? 'warning' : 'info',
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_mode'] });
      queryClient.invalidateQueries({ queryKey: ['farm_settings'] });
      queryClient.invalidateQueries({ queryKey: ['device-status'] });
      queryClient.invalidateQueries({ queryKey: ['device_status'] });
      queryClient.invalidateQueries({ queryKey: ['device-health'] });
    },
  });
}
