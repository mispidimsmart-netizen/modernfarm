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
      const { error } = await supabase
        .from('farm_settings')
        .update({ automation_mode: mode } as any)
        .eq('user_id', user.id);
      if (error) throw error;

      // Audit log
      logAction({
        actionType: 'automation_mode_change',
        actionCategory: 'automation',
        targetEntity: 'farm_settings',
        newValue: { automation_mode: mode },
        severity: mode === 'MANUAL' ? 'warning' : 'info',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_mode'] });
      queryClient.invalidateQueries({ queryKey: ['farm_settings'] });
    },
  });
}
