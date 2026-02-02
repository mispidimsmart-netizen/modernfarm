import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type SmartModeType = 'summer' | 'winter' | 'rainy' | 'emergency' | 'normal';

export interface SmartModeProfile {
  id: SmartModeType;
  icon: string;
  name: { bn: string; en: string };
  description: { bn: string; en: string };
  color: string;
  bgColor: string;
  settings: {
    temperature_min: number;
    temperature_max: number;
    humidity_min: number;
    humidity_max: number;
    ammonia_max: number;
    fan_low_temp_min: number;
    fan_low_temp_max: number;
    fan_medium_temp_min: number;
    fan_medium_temp_max: number;
    fan_high_temp_min: number;
    hsi_mild_threshold: number;
    hsi_moderate_threshold: number;
    hsi_severe_threshold: number;
    hsi_emergency_threshold: number;
  };
}

export const SMART_MODE_PROFILES: SmartModeProfile[] = [
  {
    id: 'summer',
    icon: '🌞',
    name: { bn: 'গ্রীষ্ম মোড', en: 'Summer Mode' },
    description: { 
      bn: 'গরমের জন্য - ফ্যান বেশি চলবে, তাপমাত্রা সীমা কম', 
      en: 'For hot weather - fans run more, lower temp thresholds' 
    },
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    settings: {
      temperature_min: 20,
      temperature_max: 28,        // Lower threshold for summer
      humidity_min: 50,
      humidity_max: 75,
      ammonia_max: 20,
      fan_low_temp_min: 25,       // Start fan earlier
      fan_low_temp_max: 27,
      fan_medium_temp_min: 27,
      fan_medium_temp_max: 30,
      fan_high_temp_min: 30,      // High fan at lower temp
      hsi_mild_threshold: 65,     // Earlier HSI warnings
      hsi_moderate_threshold: 70,
      hsi_severe_threshold: 75,
      hsi_emergency_threshold: 80,
    },
  },
  {
    id: 'winter',
    icon: '❄️',
    name: { bn: 'শীত মোড', en: 'Winter Mode' },
    description: { 
      bn: 'শীতের জন্য - ফ্যান কম চলবে, তাপমাত্রা বেশি সহ্য', 
      en: 'For cold weather - fewer fans, higher temp tolerance' 
    },
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    settings: {
      temperature_min: 18,
      temperature_max: 35,        // Higher tolerance in winter
      humidity_min: 40,
      humidity_max: 70,
      ammonia_max: 25,
      fan_low_temp_min: 30,       // Start fan later
      fan_low_temp_max: 32,
      fan_medium_temp_min: 32,
      fan_medium_temp_max: 35,
      fan_high_temp_min: 35,
      hsi_mild_threshold: 75,     // Higher HSI thresholds
      hsi_moderate_threshold: 80,
      hsi_severe_threshold: 85,
      hsi_emergency_threshold: 90,
    },
  },
  {
    id: 'rainy',
    icon: '🌧️',
    name: { bn: 'বর্ষা মোড', en: 'Rainy Mode' },
    description: { 
      bn: 'বৃষ্টির সময় - আর্দ্রতা বেশি সহ্য, অ্যামোনিয়া সতর্কতা', 
      en: 'For monsoon - higher humidity tolerance, ammonia alert' 
    },
    color: 'text-sky-600',
    bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    settings: {
      temperature_min: 20,
      temperature_max: 32,
      humidity_min: 50,
      humidity_max: 90,           // Higher humidity tolerance
      ammonia_max: 18,            // Lower ammonia threshold (poor ventilation)
      fan_low_temp_min: 28,
      fan_low_temp_max: 30,
      fan_medium_temp_min: 30,
      fan_medium_temp_max: 32,
      fan_high_temp_min: 32,
      hsi_mild_threshold: 70,
      hsi_moderate_threshold: 75,
      hsi_severe_threshold: 80,
      hsi_emergency_threshold: 85,
    },
  },
  {
    id: 'emergency',
    icon: '🚨',
    name: { bn: 'জরুরি মোড', en: 'Emergency Mode' },
    description: { 
      bn: 'তাপদাহ/রোগ - সর্বোচ্চ সতর্কতা, সব ফ্যান চালু', 
      en: 'Heat wave/disease - maximum alerts, all fans on' 
    },
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    settings: {
      temperature_min: 20,
      temperature_max: 26,        // Very strict temperature
      humidity_min: 45,
      humidity_max: 70,
      ammonia_max: 15,            // Very strict ammonia
      fan_low_temp_min: 24,       // Fans start very early
      fan_low_temp_max: 25,
      fan_medium_temp_min: 25,
      fan_medium_temp_max: 27,
      fan_high_temp_min: 27,
      hsi_mild_threshold: 60,     // Very early HSI warnings
      hsi_moderate_threshold: 65,
      hsi_severe_threshold: 70,
      hsi_emergency_threshold: 75,
    },
  },
  {
    id: 'normal',
    icon: '✨',
    name: { bn: 'সাধারণ মোড', en: 'Normal Mode' },
    description: { 
      bn: 'স্বাভাবিক অবস্থা - ডিফল্ট সেটিংস', 
      en: 'Normal conditions - default settings' 
    },
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    settings: {
      temperature_min: 18,
      temperature_max: 32,
      humidity_min: 40,
      humidity_max: 80,
      ammonia_max: 25,
      fan_low_temp_min: 28,
      fan_low_temp_max: 30,
      fan_medium_temp_min: 30,
      fan_medium_temp_max: 33,
      fan_high_temp_min: 33,
      hsi_mild_threshold: 70,
      hsi_moderate_threshold: 75,
      hsi_severe_threshold: 80,
      hsi_emergency_threshold: 85,
    },
  },
];

export function useApplySmartMode() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (modeId: SmartModeType) => {
      if (!user) throw new Error('Not authenticated');
      
      const profile = SMART_MODE_PROFILES.find(p => p.id === modeId);
      if (!profile) throw new Error('Invalid mode');

      const { error } = await supabase
        .from('farm_settings')
        .update({
          ...profile.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      return profile;
    },
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ['farm-settings'] });
      toast({
        title: profile.icon + ' ' + profile.name[language],
        description: language === 'bn' 
          ? 'সেটিংস সফলভাবে প্রয়োগ হয়েছে' 
          : 'Settings applied successfully',
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
