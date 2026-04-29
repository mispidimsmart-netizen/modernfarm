import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useSelectedShed } from './useSheds';
import { useToast } from '@/hooks/use-toast';

export type ControlPreference = 'low' | 'auto' | 'high';

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
  
  // Operation Preferences (low/auto/high) — soft modifiers on thresholds above
  ventilation_preference: ControlPreference;
  heating_preference: ControlPreference;
  cooling_preference: ControlPreference;
  comfort_preference: ControlPreference;
  protection_preference: ControlPreference;
  
  automation_priority: string;
  created_at: string;
  updated_at: string;
}

export type AdvancedAutomationSettingsUpdate = Partial<Omit<AdvancedAutomationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

/**
 * Apply Operation Preferences (low/auto/high) as soft modifiers on top of the
 * configured automation thresholds. This is what every automation hook should
 * actually use — it lets farmers nudge behaviour without losing tuned values.
 *
 * IMPORTANT: This NEVER overrides ESP32 hardware invariants (e.g. >38°C fans
 * forced ON). It only shifts the soft thresholds the cloud uses to compute
 * desired states.
 */
export function applyPreferences(s: AdvancedAutomationSettings): AdvancedAutomationSettings {
  const out = { ...s };

  // ── Ventilation: shift min-vent threshold + airflow interval ──
  if (s.ventilation_preference === 'high') {
    // More ventilation → activate min-vent earlier, shorten intervals
    out.min_vent_temp_threshold = s.min_vent_temp_threshold + 2;       // e.g. 26 → 28
    out.min_vent_interval_minutes = Math.max(1, Math.round(s.min_vent_interval_minutes * 0.6));
    out.airflow_mid_interval_minutes = Math.max(1, Math.round(s.airflow_mid_interval_minutes * 0.7));
    out.airflow_night_interval_minutes = Math.max(1, Math.round(s.airflow_night_interval_minutes * 0.7));
  } else if (s.ventilation_preference === 'low') {
    // Less ventilation → activate later, longer intervals (gas-saving)
    out.min_vent_temp_threshold = Math.max(15, s.min_vent_temp_threshold - 2);
    out.min_vent_interval_minutes = Math.round(s.min_vent_interval_minutes * 1.5);
    out.airflow_mid_interval_minutes = Math.round(s.airflow_mid_interval_minutes * 1.4);
    out.airflow_night_interval_minutes = Math.round(s.airflow_night_interval_minutes * 1.4);
  }

  // ── Heating: shift heater on/off windows ──
  if (s.heating_preference === 'high') {
    // Warmer birds → turn heater on sooner, off later
    out.heater_on_temp = s.heater_on_temp + 1.5;   // e.g. 20 → 21.5
    out.heater_off_temp = s.heater_off_temp + 1.5; // e.g. 24 → 25.5
  } else if (s.heating_preference === 'low') {
    // Cooler / energy-saving → only heat when really cold
    out.heater_on_temp = Math.max(10, s.heater_on_temp - 1.5);
    out.heater_off_temp = Math.max(out.heater_on_temp + 1, s.heater_off_temp - 1.5);
  }

  // ── Cooling: shift fogger start temp + enable flag for "low" ──
  if (s.cooling_preference === 'high') {
    out.fogger_enabled = true;
    out.fogger_start_temp = Math.max(28, s.fogger_start_temp - 1.5); // start cooling earlier
    out.fogger_stop_temp = Math.max(26, s.fogger_stop_temp - 1);
  } else if (s.cooling_preference === 'low') {
    // Reluctant cooling — only at very high temps
    out.fogger_start_temp = s.fogger_start_temp + 2;
    out.fogger_stop_temp = s.fogger_stop_temp + 1;
  }

  // ── Comfort: widens or narrows heater tolerance + curtain reactivity ──
  if (s.comfort_preference === 'high') {
    // Bird priority → tight tolerance band, more reactive
    out.heater_tolerance = Math.max(0.3, s.heater_tolerance - 0.3);
    out.curtain_open_temp_diff = Math.max(1, s.curtain_open_temp_diff - 1);
  } else if (s.comfort_preference === 'low') {
    // Economy → loose tolerance, less switching = less power
    out.heater_tolerance = s.heater_tolerance + 0.5;
    out.curtain_open_temp_diff = s.curtain_open_temp_diff + 1;
  }

  // ── Protection: tighten or relax safety thresholds ──
  if (s.protection_preference === 'high') {
    // Maximum safety → more sensitive water + curtain advisories
    out.water_drop_threshold_percent = Math.max(10, s.water_drop_threshold_percent - 10);
    out.water_night_spike_enabled = true;
    out.water_zero_flow_alert = true;
    out.curtain_advisory_enabled = true;
    out.min_vent_enabled = true; // never disable in max-protection
  } else if (s.protection_preference === 'low') {
    // Standard / fewer alerts → less sensitive
    out.water_drop_threshold_percent = Math.min(60, s.water_drop_threshold_percent + 15);
  }

  return out;
}

/**
 * Hook to fetch advanced automation settings.
 * Returns settings WITH operation preferences already applied as modifiers.
 */
export function useAdvancedAutomationSettings() {
  const { user } = useAuth();
  const { selectedShedId } = useSelectedShed();

  return useQuery({
    queryKey: ['advanced_automation_settings', user?.id, selectedShedId],
    queryFn: async (): Promise<AdvancedAutomationSettings | null> => {
      if (!user) return null;

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
      
      const base: AdvancedAutomationSettings = data
        ? (data as unknown as AdvancedAutomationSettings)
        : {
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
            ventilation_preference: 'auto',
            heating_preference: 'auto',
            cooling_preference: 'auto',
            comfort_preference: 'auto',
            protection_preference: 'auto',
            automation_priority: 'safety,heating,cooling,ventilation,lighting,advisory',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

      // Normalise preference fields if DB row predates the columns
      base.ventilation_preference = (base.ventilation_preference || 'auto') as ControlPreference;
      base.heating_preference = (base.heating_preference || 'auto') as ControlPreference;
      base.cooling_preference = (base.cooling_preference || 'auto') as ControlPreference;
      base.comfort_preference = (base.comfort_preference || 'auto') as ControlPreference;
      base.protection_preference = (base.protection_preference || 'auto') as ControlPreference;

      return applyPreferences(base);
    },
    enabled: !!user,
  });
}

/**
 * Hook to fetch the RAW (un-preference-adjusted) settings.
 * Use this in the settings UI where the user is editing the underlying values.
 */
export function useRawAdvancedAutomationSettings() {
  const { user } = useAuth();
  const { selectedShedId } = useSelectedShed();

  return useQuery({
    queryKey: ['advanced_automation_settings_raw', user?.id, selectedShedId],
    queryFn: async (): Promise<AdvancedAutomationSettings | null> => {
      if (!user) return null;
      let query = supabase
        .from('advanced_automation_settings')
        .select('*')
        .eq('user_id', user.id);
      if (selectedShedId) query = query.eq('shed_id', selectedShedId);
      else query = query.is('shed_id', null);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as unknown as AdvancedAutomationSettings | null;
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
  const { selectedFarmId } = useFarmContext();
  const { selectedShedId } = useSelectedShed();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: AdvancedAutomationSettingsUpdate) => {
      if (!user) throw new Error('Not authenticated');
      if (!selectedFarmId) throw new Error('No farm selected');

      const payload = {
        user_id: user.id,
        farm_id: selectedFarmId,
        shed_id: selectedShedId || null,
        ...settings,
        updated_at: new Date().toISOString(),
      };

      let updateQuery = supabase
        .from('advanced_automation_settings')
        .update(payload)
        .eq('user_id', user.id);

      updateQuery = selectedShedId
        ? updateQuery.eq('shed_id', selectedShedId)
        : updateQuery.is('shed_id', null);

      const { data: updatedRow, error: updateError } = await updateQuery
        .select('id')
        .maybeSingle();

      if (updateError) throw updateError;

      if (!updatedRow) {
        const { error: insertError } = await supabase
          .from('advanced_automation_settings')
          .insert(payload);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced_automation_settings'] });
      queryClient.invalidateQueries({ queryKey: ['advanced_automation_settings_raw'] });
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
