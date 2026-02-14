import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';

export type SetupStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const SETUP_STEPS = [
  { step: 1, key: 'step_farm_created', icon: '🏠', en: 'Create Farm', bn: 'খামার তৈরি' },
  { step: 2, key: 'step_shed_added', icon: '🏗️', en: 'Add Shed', bn: 'শেড যোগ করুন' },
  { step: 3, key: 'step_controller_registered', icon: '📱', en: 'Register Controller', bn: 'কন্ট্রোলার সংযোগ' },
  { step: 4, key: 'step_relays_tested', icon: '🔌', en: 'Test Relays', bn: 'রিলে পরীক্ষা' },
  { step: 5, key: 'step_sensors_calibrated', icon: '🌡️', en: 'Calibrate Sensors', bn: 'সেন্সর ক্যালিব্রেশন' },
  { step: 6, key: 'step_chick_age_set', icon: '🐣', en: 'Set Chick Age', bn: 'বাচ্চার বয়স সেট' },
  { step: 7, key: 'step_automation_profile_selected', icon: '⚙️', en: 'Automation Profile', bn: 'অটোমেশন প্রোফাইল' },
  { step: 8, key: 'step_simulation_passed', icon: '🧪', en: 'Simulation Test', bn: 'সিমুলেশন টেস্ট' },
] as const;

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
  return {
    isComplete: status?.setup_completed ?? true, // default true for backward compat
    isLoading,
    status,
  };
}
