import { useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { ShedContext, useSheds } from '@/hooks/useSheds';
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
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['farm_settings', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return null;
      let query = supabase
        .from('farm_settings')
        .select('*')
        .eq('user_id', user.id);
      // Scope to the selected farm; legacy rows may have farm_id NULL.
      if (selectedFarmId) {
        query = query.or(`farm_id.eq.${selectedFarmId},farm_id.is.null`);
      }
      const { data, error } = await query.order('farm_id', {
        ascending: false,
        nullsFirst: false,
      });
      if (error) throw error;
      const rows = (data ?? []) as FarmSettings[];
      const exact = rows.find((r) => r.farm_id === selectedFarmId);
      return (exact ?? rows[0] ?? null) as FarmSettings | null;
    },
    enabled: !!user,
  });
}

export function useUpdateFarmSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useMutation({
    mutationFn: async (settings: Partial<FarmSettings>) => {
      if (!user) throw new Error('Not authenticated');
      // Resolve the exact settings row for the selected farm to avoid
      // updating every farm of a multi-farm account.
      const current = queryClient.getQueryData<FarmSettings | null>([
        'farm_settings',
        user.id,
        selectedFarmId,
      ]);
      let query = supabase.from('farm_settings').update(settings);
      if (current?.id) {
        query = query.eq('id', current.id);
      } else {
        query = query.eq('user_id', user.id);
        if (selectedFarmId) {
          query = query.or(`farm_id.eq.${selectedFarmId},farm_id.is.null`);
        }
      }
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm_settings'] });
    },
  });
}

// Device status hooks
export function useDeviceStatus(shedId?: string | null) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  
  return useQuery({
    queryKey: ['device_status', user?.id, selectedFarmId, shedId],
    queryFn: async () => {
      if (!user || !selectedFarmId) return null;
      let query = supabase
        .from('device_status')
        .select('*')
        .eq('user_id', user.id)
        .eq('farm_id', selectedFarmId);
      
      if (shedId) {
        query = query.eq('shed_id', shedId);
      } else {
        // Fallback: look for a record with null shed_id or just take the first one
        // Better to encourage shedId usage
        query = query.order('updated_at', { ascending: false });
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as DeviceStatus;
    },
    enabled: !!user && !!selectedFarmId,
    staleTime: 1000,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
}

export function useUpdateDeviceStatus(shedId?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  
  return useMutation({
    mutationFn: async (status: Partial<DeviceStatus>) => {
      if (!user) throw new Error('Not authenticated');
      if (!selectedFarmId) throw new Error('No farm selected');
      let query = supabase
        .from('device_status')
        .update(status)
        .eq('user_id', user.id)
        .eq('farm_id', selectedFarmId);
      
      if (shedId) {
        query = query.eq('shed_id', shedId);
      }

      const { error } = await query;
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
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['automation_rules', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('automation_rules')
        .select('*')
        .eq('user_id', user.id);
      if (selectedFarmId) {
        query = query.or(`farm_id.eq.${selectedFarmId},farm_id.is.null`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
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

// Lighting schedule hooks — farm-scoped to prevent cross-farm overwrites
export function useLightingSchedule() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  
  return useQuery({
    queryKey: ['lighting_schedule', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return null;
      let q = supabase
        .from('lighting_schedule')
        .select('*')
        .eq('user_id', user.id);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as LightingSchedule;
    },
    enabled: !!user,
  });
}

export function useUpdateLightingSchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  
  return useMutation({
    mutationFn: async (schedule: Partial<LightingSchedule>) => {
      if (!user) throw new Error('Not authenticated');
      let q = supabase
        .from('lighting_schedule')
        .update(schedule)
        .eq('user_id', user.id);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { error } = await q;
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
  const { selectedFarmId } = useFarmContext();

  // Multi-shed scoping: when account has >1 shed AND a specific shed is selected,
  // filter alerts to that shed (plus farm-wide alerts where shed_id IS NULL).
  const shedCtx = useContext(ShedContext);
  const selectedShedId = shedCtx?.selectedShedId ?? null;
  const { data: sheds = [] } = useSheds();
  const scopeShedId = sheds.length > 1 && selectedShedId ? selectedShedId : null;

  return useQuery({
    queryKey: ['alerts', user?.id, selectedFarmId, scopeShedId],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id);
      if (selectedFarmId) {
        q = q.or(`farm_id.eq.${selectedFarmId},farm_id.is.null`);
      }
      if (scopeShedId) {
        q = q.or(`shed_id.eq.${scopeShedId},shed_id.is.null`);
      }
      const { data, error } = await q
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('alerts')
        .update({ acknowledged: true })
        .eq('id', id)
        .eq('user_id', user.id);
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
  const { selectedFarmId } = useFarmContext();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  return useQuery({
    queryKey: ['sensor_readings', user?.id, selectedFarmId, hours],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('sensor_readings')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', since);
      if (selectedFarmId) {
        query = query.eq('farm_id', selectedFarmId);
      }
      const { data, error } = await query.order('recorded_at', { ascending: true });
      if (error) throw error;
      return data as SensorReading[];
    },
    enabled: !!user,
  });
}
