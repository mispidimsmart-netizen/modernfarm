import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useSelectedShed } from './useSheds';
import { useToast } from '@/hooks/use-toast';

export interface AdvancedAutomationSettings {
  id: string;
  user_id: string;
  shed_id: string | null;
  
  // Module 1: Minimum Ventilation Timer
  min_vent_enabled: boolean;
  min_vent_temp_threshold: number;
  min_vent_cycle_seconds: number;
  min_vent_interval_minutes: number;
  min_vent_ceiling_fan_always_on: boolean;
  
  // Module 2: Heater Control
  heater_enabled: boolean;
  heater_on_temp: number;
  heater_off_temp: number;
  heater_tolerance: number;
  
  // Module 3: Fogger Cooling
  fogger_enabled: boolean;
  fogger_start_temp: number;
  fogger_start_humidity_max: number;
  fogger_on_seconds: number;
  fogger_pause_seconds: number;
  fogger_stop_temp: number;
  fogger_stop_humidity: number;
  
  // Module 4: Broiler Airflow Growth Mode
  airflow_enabled: boolean;
  airflow_early_age_days: number;
  airflow_mid_age_days: number;
  airflow_mid_on_seconds: number;
  airflow_mid_interval_minutes: number;
  airflow_night_on_seconds: number;
  airflow_night_interval_minutes: number;
  
  // Module 5: Lighting
  lighting_fade_duration_minutes: number;
  
  // Module 6: Curtain Advisory
  curtain_advisory_enabled: boolean;
  curtain_open_temp_diff: number;
  curtain_close_on_cold: boolean;
  
  // Module 7: Water Analytics
  water_drop_threshold_percent: number;
  water_night_spike_enabled: boolean;
  water_zero_flow_alert: boolean;
  water_baseline_hours: number;
  
  automation_priority: string;
  created_at: string;
  updated_at: string;
}

export type AdvancedAutomationSettingsUpdate = Partial<Omit<AdvancedAutomationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

/**
 * Hook to fetch advanced automation settings
 */
export function useAdvancedAutomationSettings() {
  const { user } = useAuth();
  const { selectedShedId } = useSelectedShed();

  return useQuery({
    queryKey: ['advanced_automation_settings', user?.id, selectedShedId],
    queryFn: async (): Promise<AdvancedAutomationSettings | null> => {
      if (!user) return null;

      // Try to get shed-specific settings first
      let query = supabase
        .from('advanced_automation_settings')
        .select('*')
        .eq('user_id', user.id);

      if (selectedShedId) {
        query = query.eq('shed_id', selectedShedId);
      } else {
        query = query.is('shed_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      // If no settings exist, return default values
      if (!data) {
        return {
          id: '',
          user_id: user.id,
          shed_id: selectedShedId || null,
          min_vent_enabled: true,
          min_vent_temp_threshold: 26,
          min_vent_cycle_seconds: 40,
          min_vent_interval_minutes: 5,
          min_vent_ceiling_fan_always_on: true,
          heater_enabled: true,
          heater_on_temp: 20,
          heater_off_temp: 24,
          heater_tolerance: 0.7,
          fogger_enabled: false,
          fogger_start_temp: 32,
          fogger_start_humidity_max: 85,
          fogger_on_seconds: 40,
          fogger_pause_seconds: 120,
          fogger_stop_temp: 30,
          fogger_stop_humidity: 90,
          airflow_enabled: true,
          airflow_early_age_days: 10,
          airflow_mid_age_days: 20,
          airflow_mid_on_seconds: 30,
          airflow_mid_interval_minutes: 3,
          airflow_night_on_seconds: 60,
          airflow_night_interval_minutes: 5,
          lighting_fade_duration_minutes: 10,
          curtain_advisory_enabled: true,
          curtain_open_temp_diff: 3,
          curtain_close_on_cold: true,
          water_drop_threshold_percent: 30,
          water_night_spike_enabled: true,
          water_zero_flow_alert: true,
          water_baseline_hours: 24,
          automation_priority: 'safety,heating,cooling,ventilation,lighting,advisory',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      
      return data as AdvancedAutomationSettings;
    },
    enabled: !!user,
  });
}

/**
 * Hook to update advanced automation settings
 */
export function useUpdateAdvancedAutomationSettings() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: AdvancedAutomationSettingsUpdate) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('advanced_automation_settings')
        .upsert({
          user_id: user.id,
          shed_id: selectedShedId || null,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'user_id,shed_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced_automation_settings'] });
      toast({
        title: language === 'bn' ? 'সেটিংস সংরক্ষিত' : 'Settings saved',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'সেটিংস সংরক্ষণ ব্যর্থ' : 'Failed to save settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
