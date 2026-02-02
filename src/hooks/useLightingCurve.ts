import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { 
  LightingCurveSettings, 
  LightingState, 
  calculateLightingState,
  generateCurveData 
} from '@/lib/lightingCurve';
import { useToast } from '@/hooks/use-toast';

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
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateLightingSchedule() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: {
      start_time?: string;
      end_time?: string;
      gradual_enabled?: boolean;
      fade_in_minutes?: number;
      fade_out_minutes?: number;
      min_brightness?: number;
      max_brightness?: number;
      manual_override?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('lighting_schedule')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lighting_schedule'] });
      toast({
        title: language === 'bn' ? 'সেটিংস সেভ হয়েছে' : 'Settings saved',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'এরর হয়েছে' : 'Error occurred',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useLightingCurve() {
  const { data: schedule, isLoading } = useLightingSchedule();
  const [currentState, setCurrentState] = useState<LightingState | null>(null);

  const settings: LightingCurveSettings | null = useMemo(() => {
    if (!schedule) return null;
    return {
      gradualEnabled: schedule.gradual_enabled ?? true,
      fadeInMinutes: schedule.fade_in_minutes ?? 30,
      fadeOutMinutes: schedule.fade_out_minutes ?? 30,
      minBrightness: schedule.min_brightness ?? 0,
      maxBrightness: schedule.max_brightness ?? 100,
      startTime: typeof schedule.start_time === 'string' 
        ? schedule.start_time.slice(0, 5) 
        : '05:00',
      endTime: typeof schedule.end_time === 'string' 
        ? schedule.end_time.slice(0, 5) 
        : '21:00',
    };
  }, [schedule]);

  const curveData = useMemo(() => {
    if (!settings) return [];
    return generateCurveData(settings);
  }, [settings]);

  // Update state every minute
  useEffect(() => {
    if (!settings) return;

    const updateState = () => {
      setCurrentState(calculateLightingState(settings));
    };

    updateState();
    const interval = setInterval(updateState, 60 * 1000); // Every minute

    return () => clearInterval(interval);
  }, [settings]);

  return {
    settings,
    currentState,
    curveData,
    schedule,
    isLoading,
  };
}
