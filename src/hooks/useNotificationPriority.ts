import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type NotificationPriority = 'normal' | 'important' | 'urgent' | 'critical';

export interface EscalationConfig {
  id: string;
  user_id: string;
  farm_id: string | null;
  secondary_phone: string | null;
  secondary_phone_label: string;
  escalation_enabled: boolean;
  ignored_critical_threshold: number;
  escalation_cooldown_minutes: number;
  normal_push: boolean;
  normal_sms: boolean;
  normal_sound: boolean;
  important_push: boolean;
  important_sms: boolean;
  important_sound: boolean;
  urgent_push: boolean;
  urgent_sms: boolean;
  urgent_sound: boolean;
  urgent_repeat_minutes: number;
  critical_push: boolean;
  critical_sms: boolean;
  critical_sound: boolean;
  critical_webhook: boolean;
  critical_repeat_minutes: number;
}

export interface DeliveryLogEntry {
  id: string;
  priority: NotificationPriority;
  channel: string;
  status: string;
  title: string;
  body: string | null;
  repeat_count: number;
  is_escalated: boolean;
  escalated_to: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface EscalationTracker {
  ignored_critical_count: number;
  is_escalated: boolean;
  escalated_at: string | null;
}

export const PRIORITY_LABELS: Record<NotificationPriority, { en: string; bn: string; color: string; icon: string }> = {
  normal: { en: 'Normal', bn: 'সাধারণ', color: 'text-blue-600', icon: '🔵' },
  important: { en: 'Important', bn: 'গুরুত্বপূর্ণ', color: 'text-amber-600', icon: '🟡' },
  urgent: { en: 'Urgent', bn: 'জরুরি', color: 'text-orange-600', icon: '🟠' },
  critical: { en: 'Critical', bn: 'সংকটপূর্ণ', color: 'text-red-600', icon: '🔴' },
};

export const PRIORITY_CHANNELS: Record<NotificationPriority, { push: boolean; sms: boolean; webhook: boolean; repeat: boolean }> = {
  normal: { push: true, sms: false, webhook: false, repeat: false },
  important: { push: true, sms: false, webhook: false, repeat: false },
  urgent: { push: true, sms: true, webhook: false, repeat: true },
  critical: { push: true, sms: true, webhook: true, repeat: true },
};

// Map old alert levels to new priorities
export function mapAlertLevelToPriority(level: string): NotificationPriority {
  switch (level) {
    case 'info': return 'normal';
    case 'warning': return 'important';
    case 'danger': return 'critical';
    default: return 'normal';
  }
}

export function mapEmergencyPriority(priority: string): NotificationPriority {
  switch (priority) {
    case 'INFO': return 'normal';
    case 'WARNING': return 'important';
    case 'CRITICAL': return 'urgent';
    case 'LIFE_THREATENING': return 'critical';
    default: return 'normal';
  }
}

export function useEscalationConfig() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['escalation-config', user?.id],
    queryFn: async (): Promise<EscalationConfig | null> => {
      if (!user) return null;
      const { data, error } = await (supabase.from('notification_escalation_config') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as EscalationConfig | null;
    },
    enabled: !!user,
  });
}

export function useUpdateEscalationConfig() {
  const { user, language } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<EscalationConfig>) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await (supabase.from('notification_escalation_config') as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase.from('notification_escalation_config') as any)
          .update(updates)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('notification_escalation_config') as any)
          .insert({ user_id: user.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-config'] });
      toast({
        title: language === 'bn' ? 'সংরক্ষিত!' : 'Saved!',
        description: language === 'bn' ? 'নোটিফিকেশন সেটিংস আপডেট হয়েছে' : 'Notification settings updated',
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeliveryLog(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['delivery-log', user?.id, limit],
    queryFn: async (): Promise<DeliveryLogEntry[]> => {
      if (!user) return [];
      const { data, error } = await (supabase.from('notification_delivery_log') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as DeliveryLogEntry[];
    },
    enabled: !!user,
  });
}

export function useEscalationTracker() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['escalation-tracker', user?.id],
    queryFn: async (): Promise<EscalationTracker | null> => {
      if (!user) return null;
      const { data, error } = await (supabase.from('notification_escalation_tracker') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as EscalationTracker | null;
    },
    enabled: !!user,
  });
}

export function useDispatchNotification() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      priority: NotificationPriority;
      title: string;
      body?: string;
      alert_id?: string;
      emergency_event_id?: string;
      farm_id?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notification-escalation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'dispatch',
            user_id: user.id,
            ...params,
          }),
        }
      );

      if (!resp.ok) throw new Error('Failed to dispatch notification');
      return resp.json();
    },
  });
}
