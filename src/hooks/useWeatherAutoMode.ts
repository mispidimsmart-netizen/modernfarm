import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useWeatherCache, useWeatherSettings } from './useWeather';
import { useApplySmartMode, SmartModeType, SMART_MODE_PROFILES } from './useSmartModeProfiles';
import { useToast } from './use-toast';

export interface WeatherAutoModeConfig {
  enabled: boolean;
  summer_temp_threshold: number;     // Above this = Summer Mode
  winter_temp_threshold: number;     // Below this = Winter Mode
  rain_probability_threshold: number; // Above this = Rainy Mode
  emergency_temp_threshold: number;   // Above this = Emergency Mode
  last_auto_mode: SmartModeType | null;
  last_mode_change: string | null;
}

const DEFAULT_CONFIG: WeatherAutoModeConfig = {
  enabled: true, // Auto mode enabled by default
  summer_temp_threshold: 32,
  winter_temp_threshold: 18,
  rain_probability_threshold: 60,
  emergency_temp_threshold: 38,
  last_auto_mode: null,
  last_mode_change: null,
};

// Determine which mode should be active based on weather
export function determineWeatherMode(
  temperature: number,
  rainProbability: number,
  config: WeatherAutoModeConfig
): SmartModeType {
  // Emergency takes highest priority
  if (temperature >= config.emergency_temp_threshold) {
    return 'emergency';
  }
  
  // Rain mode if high probability
  if (rainProbability >= config.rain_probability_threshold) {
    return 'rainy';
  }
  
  // Temperature-based modes
  if (temperature >= config.summer_temp_threshold) {
    return 'summer';
  }
  
  if (temperature <= config.winter_temp_threshold) {
    return 'winter';
  }
  
  // Normal conditions
  return 'normal';
}

export function useWeatherAutoModeConfig() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weather_auto_mode_config', user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_CONFIG;
      
      // Store config in localStorage since we don't have a dedicated table
      const stored = localStorage.getItem(`weather_auto_mode_${user.id}`);
      if (stored) {
        try {
          return { ...DEFAULT_CONFIG, ...JSON.parse(stored) } as WeatherAutoModeConfig;
        } catch {
          return DEFAULT_CONFIG;
        }
      }
      return DEFAULT_CONFIG;
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
      
      const current = localStorage.getItem(`weather_auto_mode_${user.id}`);
      const currentConfig = current ? JSON.parse(current) : DEFAULT_CONFIG;
      const newConfig = { ...currentConfig, ...config };
      
      localStorage.setItem(`weather_auto_mode_${user.id}`, JSON.stringify(newConfig));
      return newConfig;
    },
    onSuccess: (newConfig, _, __) => {
      // Invalidate with correct query key including user id
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

// Main hook that monitors weather and auto-switches modes
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
    if (!user || !weather || !config?.enabled) {
      return;
    }

    const temperature = weather.temperature ?? 25;
    const rainProbability = weather.rain_probability ?? 0;
    
    const suggestedMode = determineWeatherMode(temperature, rainProbability, config);
    setCurrentAutoMode(suggestedMode);

    // Only apply if mode changed and not first run (to avoid applying on page load)
    if (isInitializedRef.current && suggestedMode !== lastAppliedRef.current) {
      const profile = SMART_MODE_PROFILES.find(p => p.id === suggestedMode);
      
      // Apply the new mode
      applyMode.mutate(suggestedMode, {
        onSuccess: () => {
          lastAppliedRef.current = suggestedMode;
          
          // Update config with last applied mode
          updateConfig.mutate({
            last_auto_mode: suggestedMode,
            last_mode_change: new Date().toISOString(),
          });

          // Show notification
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
      // First run - just set the ref without applying
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

// Get suggested mode without applying (for preview)
export function useWeatherModeSuggestion() {
  const { data: weather } = useWeatherCache();
  const { data: config } = useWeatherAutoModeConfig();

  if (!weather || !config) {
    return null;
  }

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

function getReasonForMode(
  mode: SmartModeType, 
  temp: number, 
  rain: number, 
  config: WeatherAutoModeConfig,
  lang: 'bn' | 'en'
): string {
  switch (mode) {
    case 'emergency':
      return lang === 'bn' 
        ? `তাপমাত্রা ${temp}°C (>${config.emergency_temp_threshold}°C)`
        : `Temperature ${temp}°C (>${config.emergency_temp_threshold}°C)`;
    case 'summer':
      return lang === 'bn'
        ? `তাপমাত্রা ${temp}°C (>${config.summer_temp_threshold}°C)`
        : `Temperature ${temp}°C (>${config.summer_temp_threshold}°C)`;
    case 'winter':
      return lang === 'bn'
        ? `তাপমাত্রা ${temp}°C (<${config.winter_temp_threshold}°C)`
        : `Temperature ${temp}°C (<${config.winter_temp_threshold}°C)`;
    case 'rainy':
      return lang === 'bn'
        ? `বৃষ্টির সম্ভাবনা ${rain}% (>${config.rain_probability_threshold}%)`
        : `Rain probability ${rain}% (>${config.rain_probability_threshold}%)`;
    default:
      return lang === 'bn' ? 'স্বাভাবিক আবহাওয়া' : 'Normal weather conditions';
  }
}
