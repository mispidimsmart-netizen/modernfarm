import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';

export type ScheduleType = 'feed' | 'cleaning' | 'vaccination' | 'custom';
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly';

export interface Schedule {
  id: string;
  user_id: string;
  farm_id: string | null;
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
  custom_interval_days: number | null; // For custom cleaning intervals (2-6 days)
  created_at: string;
  updated_at: string;
}

export interface ScheduleNotification {
  id: string;
  user_id: string;
  farm_id: string | null;
  schedule_id: string;
  notification_type: 'reminder' | 'due' | 'overdue';
  message: string;
  message_bn: string | null;
  is_read: boolean;
  created_at: string;
}

// Safe context access (FarmProvider may not always wrap)
function useSafeFarmId(): string | null {
  try {
    return useFarmContext().selectedFarmId;
  } catch {
    return null;
  }
}

export function useSchedules() {
  const { user } = useAuth();
  const selectedFarmId = useSafeFarmId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['schedules', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('schedules')
        .select('*')
        .order('time_of_day', { ascending: true });

      if (selectedFarmId) {
        // farm-scoped: include rows for this farm + legacy null-farm rows owned by user
        q = q.or(`farm_id.eq.${selectedFarmId},and(farm_id.is.null,user_id.eq.${user.id})`);
      } else {
        q = q.eq('user_id', user.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Schedule[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const filter = selectedFarmId
      ? `farm_id=eq.${selectedFarmId}`
      : `user_id=eq.${user.id}`;

    const channel = supabase
      .channel(`schedules-${selectedFarmId ?? user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules', filter },
        () => {
          queryClient.invalidateQueries({ queryKey: ['schedules'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedFarmId, queryClient]);

  return query;
}

export function useAddSchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const selectedFarmId = useSafeFarmId();

  return useMutation({
    mutationFn: async (schedule: Omit<Schedule, 'id' | 'user_id' | 'farm_id' | 'created_at' | 'updated_at'>) => {
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

      // Resolve farm_id: explicit selectedFarmId, else derive from shed
      let farmId: string | null = selectedFarmId;
      if (!farmId && schedule.shed_id) {
        const { data: shed } = await supabase
          .from('sheds')
          .select('farm_id')
          .eq('id', schedule.shed_id)
          .maybeSingle();
        farmId = shed?.farm_id ?? null;
      }

      const { error } = await supabase
        .from('schedules')
        .insert({
          ...schedule,
          user_id: user.id,
          farm_id: farmId,
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
