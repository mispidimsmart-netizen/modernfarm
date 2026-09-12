import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { deriveSetupState } from '@/lib/onboarding';

// Step definitions & progress math live in the pure SSOT module.
export { SETUP_STEPS, deriveSetupState, setupProgressPercent, completedStepCount, nextSetupStep } from '@/lib/onboarding';
export type { SetupStep, SetupStepDef } from '@/lib/onboarding';

export function useFarmSetupStatus() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['farm-setup-status', selectedFarmId],
    queryFn: async () => {
      if (!user || !selectedFarmId) return null;
      const { data, error } = await supabase
        .from('farm_setup_status')
        .select('*')
        .eq('farm_id', selectedFarmId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!selectedFarmId,
  });
}

export function useUpdateSetupStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!user || !selectedFarmId) throw new Error('Missing context');
      
      const { error } = await supabase
        .from('farm_setup_status')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('farm_id', selectedFarmId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-setup-status'] });
    },
  });
}

export function useIsSetupComplete() {
  const { data: status, isLoading } = useFarmSetupStatus();
  const derived = deriveSetupState(status as Record<string, unknown> | null);
  return {
    // Missing row => complete (backward compat with pre-wizard farms).
    isComplete: status ? (status.setup_completed ?? true) : true,
    isHardwareValidated: derived.isHardwareValidated,
    progressPercent: derived.percent,
    nextStep: derived.nextStep,
    isLoading,
    status,
  };
}
