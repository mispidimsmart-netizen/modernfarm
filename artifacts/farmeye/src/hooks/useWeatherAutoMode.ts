/**
 * Weather Auto-Mode hook — thin React adapter.
 * All decision logic lives in @/lib/weatherMode (pure, unit tested).
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useWeatherCache } from './useWeather';
import { useApplySmartMode } from './useSmartModeProfiles';
import { SMART_MODE_PROFILES, type SmartModeType } from '@/lib/smartModeProfiles';
import {
  DEFAULT_WEATHER_AUTO_MODE_CONFIG,
  determineWeatherMode,
  getReasonForMode,
  parseWeatherAutoModeConfig,
  type WeatherAutoModeConfig,
} from '@/lib/weatherMode';
import { useToast } from './use-toast';

export type { WeatherAutoModeConfig };
export { determineWeatherMode };

const storageKey = (userId: string) => `weather_auto_mode_${userId}`;

export function useWeatherAutoModeConfig() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weather_auto_mode_config', user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_WEATHER_AUTO_MODE_CONFIG;
      return parseWeatherAutoModeConfig(localStorage.getItem(storageKey(user.id)));
    },
    enabled: !!user,
  });
}

export function useUpdateWeatherAutoModeConfig() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: Partial<WeatherAutoModeConfig>) => {
      if (!user) throw new Error('Not authenticated');

      const currentConfig = parseWeatherAutoModeConfig(localStorage.getItem(storageKey(user.id)));
      const newConfig = { ...currentConfig, ...config };

      localStorage.setItem(storageKey(user.id), JSON.stringify(newConfig));
      return newConfig;
    },
    onSuccess: (newConfig) => {
      queryClient.setQueryData(['weather_auto_mode_config', user?.id], newConfig);
      queryClient.invalidateQueries({ queryKey: ['weather_auto_mode_config', user?.id] });
      toast({
        title: language === 'bn' ? 'সেটিংস সেভ হয়েছে' : 'Settings saved',
        description: newConfig.enabled
          ? (language === 'bn' ? 'আবহাওয়া অটো-মোড সক্রিয়' : 'Weather auto-mode enabled')
          : (language === 'bn' ? 'আবহাওয়া অটো-মোড নিষ্ক্রিয়' : 'Weather auto-mode disabled'),
      });
    },
  });
}

// Monitors weather and auto-switches smart mode profiles
export function useWeatherAutoMode() {
  const { user, language } = useAuth();
  const { data: weather } = useWeatherCache();
  const { data: config } = useWeatherAutoModeConfig();
  const applyMode = useApplySmartMode();
  const updateConfig = useUpdateWeatherAutoModeConfig();
  const { toast } = useToast();

  const [currentAutoMode, setCurrentAutoMode] = useState<SmartModeType | null>(null);
  const lastAppliedRef = useRef<SmartModeType | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!user || !weather || !config?.enabled) return;

    const temperature = weather.temperature ?? 25;
    const rainProbability = weather.rain_probability ?? 0;

    const suggestedMode = determineWeatherMode(temperature, rainProbability, config);
    setCurrentAutoMode(suggestedMode);

    // Skip first run so page load never re-applies settings
    if (isInitializedRef.current && suggestedMode !== lastAppliedRef.current) {
      const profile = SMART_MODE_PROFILES.find(p => p.id === suggestedMode);

      applyMode.mutate(suggestedMode, {
        onSuccess: () => {
          lastAppliedRef.current = suggestedMode;

          updateConfig.mutate({
            last_auto_mode: suggestedMode,
            last_mode_change: new Date().toISOString(),
          });

          toast({
            title: language === 'bn'
              ? `🌤️ আবহাওয়া অটো-মোড: ${profile?.name.bn}`
              : `🌤️ Weather Auto-Mode: ${profile?.name.en}`,
            description: language === 'bn'
              ? `তাপমাত্রা ${temperature}°C, বৃষ্টির সম্ভাবনা ${rainProbability}%`
              : `Temperature ${temperature}°C, Rain probability ${rainProbability}%`,
          });
        },
      });
    } else if (!isInitializedRef.current) {
      lastAppliedRef.current = suggestedMode;
      isInitializedRef.current = true;
    }
  }, [weather?.temperature, weather?.rain_probability, config?.enabled]);

  return {
    currentAutoMode,
    isEnabled: config?.enabled ?? false,
    weather: weather ? {
      temperature: weather.temperature,
      rainProbability: weather.rain_probability,
      condition: weather.weather_condition,
    } : null,
    config,
  };
}

// Suggested mode without applying (preview only)
export function useWeatherModeSuggestion() {
  const { data: weather } = useWeatherCache();
  const { data: config } = useWeatherAutoModeConfig();

  if (!weather || !config) return null;

  const temperature = weather.temperature ?? 25;
  const rainProbability = weather.rain_probability ?? 0;

  const suggestedMode = determineWeatherMode(temperature, rainProbability, config);
  const profile = SMART_MODE_PROFILES.find(p => p.id === suggestedMode);

  return {
    mode: suggestedMode,
    profile,
    reason: getReasonForMode(suggestedMode, temperature, rainProbability, config, 'bn'),
    reasonEn: getReasonForMode(suggestedMode, temperature, rainProbability, config, 'en'),
  };
}
