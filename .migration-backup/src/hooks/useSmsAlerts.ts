import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SmsAlertSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  temperature_alerts: boolean;
  humidity_alerts: boolean;
  ammonia_alerts: boolean;
  power_alerts: boolean;
  water_alerts: boolean;
  device_offline_alerts: boolean;
  cooldown_minutes: number;
  last_sms_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SmsPhoneNumber {
  id: string;
  user_id: string;
  phone_number: string;
  label: string;
  is_active: boolean;
  created_at: string;
}

interface SmsLog {
  id: string;
  user_id: string;
  phone_number: string;
  message: string;
  alert_type: string;
  sent_via: 'gsm' | 'gateway';
  status: 'sent' | 'failed' | 'pending';
  error_message: string | null;
  created_at: string;
}

export function useSmsAlertSettings() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sms_alert_settings', user?.id],
    queryFn: async (): Promise<SmsAlertSettings | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('sms_alert_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as SmsAlertSettings | null;
    },
    enabled: !!user,
  });
}

export function useUpdateSmsAlertSettings() {
  const { user, language } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (settings: Partial<SmsAlertSettings>) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if settings exist
      const { data: existing } = await supabase
        .from('sms_alert_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('sms_alert_settings')
          .update(settings)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sms_alert_settings')
          .insert({ user_id: user.id, ...settings });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms_alert_settings'] });
      toast({
        title: language === 'bn' ? 'সংরক্ষিত!' : 'Saved!',
        description: language === 'bn' ? 'SMS সেটিংস আপডেট হয়েছে' : 'SMS settings updated',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSmsPhoneNumbers() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sms_phone_numbers', user?.id],
    queryFn: async (): Promise<SmsPhoneNumber[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('sms_phone_numbers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as SmsPhoneNumber[];
    },
    enabled: !!user,
  });
}

export function useAddPhoneNumber() {
  const { user, language } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ phone_number, label }: { phone_number: string; label?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('sms_phone_numbers')
        .insert({
          user_id: user.id,
          phone_number,
          label: label || 'Primary',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms_phone_numbers'] });
      toast({
        title: language === 'bn' ? 'যোগ হয়েছে!' : 'Added!',
        description: language === 'bn' ? 'ফোন নম্বর যোগ করা হয়েছে' : 'Phone number added',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePhoneNumber() {
  const { language } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sms_phone_numbers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms_phone_numbers'] });
      toast({
        title: language === 'bn' ? 'মুছে ফেলা হয়েছে!' : 'Deleted!',
        description: language === 'bn' ? 'ফোন নম্বর সরানো হয়েছে' : 'Phone number removed',
      });
    },
  });
}

export function useTogglePhoneNumber() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sms_phone_numbers')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms_phone_numbers'] });
    },
  });
}

export function useSmsLogs(limit = 20) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sms_logs', user?.id, limit],
    queryFn: async (): Promise<SmsLog[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as SmsLog[];
    },
    enabled: !!user,
  });
}
