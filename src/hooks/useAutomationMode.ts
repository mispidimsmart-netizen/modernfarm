import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAuditLog } from './useAuditLog';

export type AutomationMode = 'AUTO' | 'MANUAL';

export function useAutomationMode() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['automation_mode', user?.id],
    queryFn: async (): Promise<AutomationMode> => {
      if (!user) return 'AUTO';
      const { data, error } = await supabase
        .from('farm_settings')
        .select('automation_mode')
        .eq('user_id', user.id)
        .single();
      if (error) return 'AUTO';
      return (data?.automation_mode as AutomationMode) ?? 'AUTO';
    },
    enabled: !!user,
    staleTime: 5000,
  });
}

export function useSetAutomationMode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (mode: AutomationMode) => {
      if (!user) throw new Error('Not authenticated');

      const updatePayload: Record<string, unknown> = {
        automation_mode: mode,
      };

      // Track when manual mode was activated (for reminder banners)
      if (mode === 'MANUAL') {
        updatePayload.manual_mode_since = new Date().toISOString();
      } else {
        updatePayload.manual_mode_since = null;
      }

      const { error } = await supabase
        .from('farm_settings')
        .update(updatePayload as any)
        .eq('user_id', user.id);
      if (error) throw error;

      // ═══════════════════════════════════════════════════════════
      // CRITICAL SYNC: Also update device_status.desired_manual_override
      // so ESP32 knows about the mode change on next config poll.
      // Without this, ESP32 continues running local automation
      // even when user sets MANUAL mode from the app.
      // ═══════════════════════════════════════════════════════════
      const isManual = mode === 'MANUAL';
      await supabase
        .from('device_status')
        .update({ desired_manual_override: isManual } as any)
        .eq('user_id', user.id);

      // Audit log
      logAction({
        action_type: 'automation_mode_change',
        action_category: 'automation',
        target_entity: 'farm_settings',
        new_value: { automation_mode: mode },
        severity: mode === 'MANUAL' ? 'warning' : 'info',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_mode'] });
      queryClient.invalidateQueries({ queryKey: ['farm_settings'] });
    },
  });
}
