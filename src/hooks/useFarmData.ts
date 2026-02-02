import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Database } from '@/integrations/supabase/types';

type FarmSettings = Database['public']['Tables']['farm_settings']['Row'];
type DeviceStatus = Database['public']['Tables']['device_status']['Row'];
type AutomationRule = Database['public']['Tables']['automation_rules']['Row'];
type LightingSchedule = Database['public']['Tables']['lighting_schedule']['Row'];
type Alert = Database['public']['Tables']['alerts']['Row'];
type SensorReading = Database['public']['Tables']['sensor_readings']['Row'];
type DailyReport = Database['public']['Tables']['daily_reports']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

// Profile hooks
export function useProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as Profile & { avatar_url?: string | null };
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (profile: Partial<Profile> & { avatar_url?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// Farm settings hooks
export function useFarmSettings() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['farm_settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('farm_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data as FarmSettings;
    },
    enabled: !!user,
  });
}

export function useUpdateFarmSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (settings: Partial<FarmSettings>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('farm_settings')
        .update(settings)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm_settings'] });
    },
  });
}

// Device status hooks
export function useDeviceStatus() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['device_status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('device_status')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data as DeviceStatus;
    },
    enabled: !!user,
  });
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (status: Partial<DeviceStatus>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('device_status')
        .update(status)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_status'] });
    },
  });
}

// Automation rules hooks
export function useAutomationRules() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['automation_rules', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AutomationRule[];
    },
    enabled: !!user,
  });
}

export function useAddAutomationRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (rule: Omit<AutomationRule, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('automation_rules')
        .insert({ ...rule, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
    },
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...rule }: Partial<AutomationRule> & { id: string }) => {
      const { error } = await supabase
        .from('automation_rules')
        .update(rule)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
    },
  });
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
    },
  });
}

// Lighting schedule hooks
export function useLightingSchedule() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['lighting_schedule', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('lighting_schedule')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data as LightingSchedule;
    },
    enabled: !!user,
  });
}

export function useUpdateLightingSchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (schedule: Partial<LightingSchedule>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('lighting_schedule')
        .update(schedule)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lighting_schedule'] });
    },
  });
}

// Alerts hooks
export function useAlerts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ acknowledged: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// Sensor readings hooks
export function useSensorReadings(hours: number = 24) {
  const { user } = useAuth();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  
  return useQuery({
    queryKey: ['sensor_readings', user?.id, hours],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true });
      if (error) throw error;
      return data as SensorReading[];
    },
    enabled: !!user,
  });
}

// Daily reports hooks
export function useDailyReports(days: number = 7) {
  const { user } = useAuth();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['daily_reports', user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', user.id)
        .gte('report_date', since)
        .order('report_date', { ascending: false });
      if (error) throw error;
      return data as DailyReport[];
    },
    enabled: !!user,
  });
}

export function useUpsertDailyReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (report: Partial<DailyReport> & { report_date: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('daily_reports')
        .upsert(
          { ...report, user_id: user.id },
          { onConflict: 'user_id,report_date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_reports'] });
    },
  });
}
