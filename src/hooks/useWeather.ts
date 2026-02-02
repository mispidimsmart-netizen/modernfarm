import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface WeatherData {
  id: string;
  user_id: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather_condition: string;
  weather_icon: string;
  rain_probability: number;
  forecast_json: any;
  fetched_at: string;
}

export interface WeatherSettings {
  id: string;
  user_id: string;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  auto_fan_adjustment: boolean;
  rain_alert_enabled: boolean;
  heat_wave_protection: boolean;
  heat_wave_threshold: number;
  last_weather_fetch: string | null;
  created_at: string;
  updated_at: string;
}

export function useWeatherCache() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weather_cache', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('weather_cache')
        .select('*')
        .eq('user_id', user.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as WeatherData | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Auto refresh every 15 minutes
  });
}

export function useWeatherSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weather_settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('weather_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as WeatherSettings | null;
    },
    enabled: !!user,
  });
}

export function useUpdateWeatherSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<WeatherSettings>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('weather_settings')
        .upsert({
          ...settings,
          user_id: user.id,
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather_settings'] });
    },
  });
}

export function useFetchWeather() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ lat, lng, location_name }: { lat: number; lng: number; location_name?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('fetch-weather', {
        body: { lat, lng, location_name },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather_cache'] });
      queryClient.invalidateQueries({ queryKey: ['weather_settings'] });
    },
  });
}

export function useCurrentLocation() {
  return useMutation({
    mutationFn: async (): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            reject(new Error(`Geolocation error: ${error.message}`));
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    },
  });
}
