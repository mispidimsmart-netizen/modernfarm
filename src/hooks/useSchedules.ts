import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type ScheduleType = 'feed' | 'cleaning' | 'vaccination' | 'custom';
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly';

export interface Schedule {
  id: string;
  user_id: string;
  shed_id: string | null;
  schedule_type: ScheduleType;
  title: string;
  title_bn: string | null;
  description: string | null;
  recurrence: RecurrenceType;
  time_of_day: string;
  day_of_week: number | null;
  day_of_month: number | null;
  next_run_at: string | null;
  last_run_at: string | null;
  is_active: boolean;
  notify_before_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleNotification {
  id: string;
  user_id: string;
  schedule_id: string;
  notification_type: 'reminder' | 'due' | 'overdue';
  message: string;
  message_bn: string | null;
  is_read: boolean;
  created_at: string;
}

export function useSchedules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['schedules', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('time_of_day', { ascending: true });
      if (error) throw error;
      return data as Schedule[];
    },
    enabled: !!user,
  });
}

export function useAddSchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (schedule: Omit<Schedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      // Calculate next_run_at
      const now = new Date();
      const [hours, minutes] = schedule.time_of_day.split(':').map(Number);
      const nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      
      if (nextRun <= now) {
        // If time has passed today, schedule for tomorrow (for daily)
        if (schedule.recurrence === 'daily') {
          nextRun.setDate(nextRun.getDate() + 1);
        }
      }

      const { error } = await supabase
        .from('schedules')
        .insert({
          ...schedule,
          user_id: user.id,
          next_run_at: nextRun.toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...schedule }: Partial<Schedule> & { id: string }) => {
      const { error } = await supabase
        .from('schedules')
        .update(schedule)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useScheduleNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['schedule_notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('schedule_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ScheduleNotification[];
    },
    enabled: !!user,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedule_notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_notifications'] });
    },
  });
}

// Utility to get schedule type labels
export function getScheduleTypeLabel(type: ScheduleType, language: 'en' | 'bn') {
  const labels: Record<ScheduleType, { en: string; bn: string }> = {
    feed: { en: 'Feeding', bn: 'খাবার' },
    cleaning: { en: 'Cleaning', bn: 'পরিষ্কার' },
    vaccination: { en: 'Vaccination', bn: 'টিকা' },
    custom: { en: 'Custom', bn: 'কাস্টম' },
  };
  return labels[type][language];
}

export function getRecurrenceLabel(recurrence: RecurrenceType, language: 'en' | 'bn') {
  const labels: Record<RecurrenceType, { en: string; bn: string }> = {
    once: { en: 'Once', bn: 'একবার' },
    daily: { en: 'Daily', bn: 'প্রতিদিন' },
    weekly: { en: 'Weekly', bn: 'সাপ্তাহিক' },
    monthly: { en: 'Monthly', bn: 'মাসিক' },
  };
  return labels[recurrence][language];
}
