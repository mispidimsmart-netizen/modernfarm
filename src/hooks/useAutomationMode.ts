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
      
      let query = supabase
        .from('farm_settings')
        .select('automation_mode')
        .eq('user_id', user.id);
      
      if (selectedFarmId) {
        query = query.eq('farm_id', selectedFarmId);
      }
      
      const { data, error } = await query.single();
      if (error) return 'AUTO';
      return (data?.automation_mode as AutomationMode) ?? 'AUTO';
    },
    enabled: !!user,
    staleTime: 5000,
  });
}

export function useSetAutomationMode() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (mode: AutomationMode) => {
      if (!user) throw new Error('Not authenticated');

      const isManual = mode === 'MANUAL';

      // ═══════════════════════════════════════════════════════════
      // STEP 1: Update farm_settings.automation_mode
      // ═══════════════════════════════════════════════════════════
      const updatePayload: Record<string, unknown> = {
        automation_mode: mode,
        manual_mode_since: isManual ? new Date().toISOString() : null,
      };

      let settingsQuery = supabase
        .from('farm_settings')
        .update(updatePayload as any)
        .eq('user_id', user.id);
      
      if (selectedFarmId) {
        settingsQuery = settingsQuery.eq('farm_id', selectedFarmId);
      }

      const { error: settingsError } = await settingsQuery;
      if (settingsError) {
        console.error('Failed to update farm_settings:', settingsError);
        throw settingsError;
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 2: Update device_status — MUST include farm_id for RLS.
      // On BOTH transitions we null out desired_* so:
      //  • Switch to MANUAL → no stale desired_* from a previous session
      //    forces relays the moment mode flips. User's next toggle is the
      //    first real desired state.
      //  • Switch to AUTO → clean slate for the automation engine.
      // ═══════════════════════════════════════════════════════════
      const deviceUpdate: Record<string, any> = {
        desired_manual_override: isManual,
        mode: mode,
        updated_at: new Date().toISOString(),
        desired_fan_on: null,
        desired_light_on: null,
        desired_alarm_on: null,
        desired_heater_on: null,
        desired_circulation_fan_on: null,
        desired_fogger_on: null,
        desired_ceiling_fan_on: null,
        desired_sprinkler_on: null,
        desired_fan_speed: null,
      };

      let deviceQuery = supabase
        .from('device_status')
        .update(deviceUpdate)
        .eq('user_id', user.id);
      
      if (selectedFarmId) {
        deviceQuery = deviceQuery.eq('farm_id', selectedFarmId);
      }

      const { error: deviceError } = await deviceQuery;
      if (deviceError) {
        console.error('Failed to update device_status:', deviceError);
        // Non-fatal: continue even if device_status update fails
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 3: Send stop_automation command to ESP32.
      // ESP32 polls device_commands every 1-5 seconds. Look up the
      // farm-specific device_name from device_status so we don't
      // hardcode 'ESP32_LAYER_001' for every farm.
      // ═══════════════════════════════════════════════════════════
      let deviceName = 'Shed A';
      try {
        let nameQ: any = supabase
          .from('device_status')
          .select('device_name')
          .eq('user_id', user.id);
        if (selectedFarmId) nameQ = nameQ.eq('farm_id', selectedFarmId);
        const { data: ds } = await nameQ.limit(1).maybeSingle();
        if (ds?.device_name) deviceName = ds.device_name as string;
      } catch {
        // fall back to default
      }

      const commandPayload: Record<string, any> = {
        user_id: user.id,
        command_type: 'stop_automation',
        command_value: isManual,
        device_name: deviceName,
        executed: false,
      };

      if (selectedFarmId) {
        commandPayload.farm_id = selectedFarmId;
      }

      const { error: cmdError } = await supabase
        .from('device_commands')
        .insert(commandPayload as any);

      if (cmdError) {
        console.error('Failed to insert stop_automation command:', cmdError);
        // Non-fatal: ESP32 will still read desired_manual_override from config-poll
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 4: Update device_health mode for dashboard display
      // ═══════════════════════════════════════════════════════════
      let healthQuery = supabase
        .from('device_health')
        .update({ mode: mode } as any)
        .eq('user_id', user.id);
      
      if (selectedFarmId) {
        healthQuery = healthQuery.eq('farm_id', selectedFarmId);
      }

      await healthQuery;

      // ═══════════════════════════════════════════════════════════
      // STEP 5: Audit log
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
