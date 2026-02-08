import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { useFarmType } from '@/hooks/useFarmType';

/**
 * Broiler Age-Based Environment Profiles
 * Auto-switches based on bird age in days
 */
export type BroilerAgeProfile = 'chick' | 'grower' | 'finisher';

export interface AgeProfileConfig {
  id: BroilerAgeProfile;
  minDays: number;
  maxDays: number;
  icon: string;
  name: { bn: string; en: string };
  description: { bn: string; en: string };
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

export const BROILER_AGE_PROFILES: AgeProfileConfig[] = [
  {
    id: 'chick',
    minDays: 1,
    maxDays: 10,
    icon: '🐣',
    name: { bn: 'ছোট বাচ্চা (১-১০ দিন)', en: 'Chick Phase (Day 1-10)' },
    description: { 
      bn: 'সর্বোচ্চ তাপমাত্রা প্রয়োজন, ঠান্ডা থেকে রক্ষা', 
      en: 'Maximum warmth needed, protect from cold' 
    },
    settings: {
      temperature_min: 30,
      temperature_max: 34,
      humidity_min: 50,
      humidity_max: 70,
      ammonia_max: 15,
      fan_low_temp_min: 33,
      fan_low_temp_max: 34,
      fan_medium_temp_min: 34,
      fan_medium_temp_max: 35,
      fan_high_temp_min: 35,
      hsi_mild_threshold: 75,
      hsi_moderate_threshold: 80,
      hsi_severe_threshold: 85,
      hsi_emergency_threshold: 90,
    },
  },
  {
    id: 'grower',
    minDays: 11,
    maxDays: 21,
    icon: '🐤',
    name: { bn: 'বাড়ন্ত (১১-২১ দিন)', en: 'Grower Phase (Day 11-21)' },
    description: { 
      bn: 'তাপমাত্রা ধীরে ধীরে কমানো, বায়ু চলাচল বাড়ানো', 
      en: 'Gradual temp reduction, increase ventilation' 
    },
    settings: {
      temperature_min: 26,
      temperature_max: 30,
      humidity_min: 50,
      humidity_max: 75,
      ammonia_max: 20,
      fan_low_temp_min: 29,
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
    id: 'finisher',
    minDays: 22,
    maxDays: 999,
    icon: '🐔',
    name: { bn: 'মোটাতাজা (২২+ দিন)', en: 'Finisher Phase (Day 22+)' },
    description: { 
      bn: 'হিট স্ট্রেস থেকে সতর্কতা, সর্বোচ্চ বায়ু চলাচল', 
      en: 'Heat stress alert, maximum ventilation' 
    },
    settings: {
      temperature_min: 20,
      temperature_max: 26,
      humidity_min: 45,
      humidity_max: 70,
      ammonia_max: 20,
      fan_low_temp_min: 25,
      fan_low_temp_max: 27,
      fan_medium_temp_min: 27,
      fan_medium_temp_max: 29,
      fan_high_temp_min: 29,
      hsi_mild_threshold: 65,
      hsi_moderate_threshold: 70,
      hsi_severe_threshold: 75,
      hsi_emergency_threshold: 80,
    },
  },
];

/**
 * Get profile for a given age in days
 */
export function getProfileForAge(ageDays: number): AgeProfileConfig {
  const profile = BROILER_AGE_PROFILES.find(
    p => ageDays >= p.minDays && ageDays <= p.maxDays
  );
  return profile || BROILER_AGE_PROFILES[BROILER_AGE_PROFILES.length - 1];
}

/**
 * Hook to automatically switch environment profiles based on broiler age
 */
export function useBroilerAgeAutoMode(enabled: boolean = true) {
  const { user, language } = useAuth();
  const { isBroiler } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  const { toast } = useToast();
  
  const lastAppliedProfile = useRef<BroilerAgeProfile | null>(null);
  const lastCheckDay = useRef<number | null>(null);

  // Calculate current age
  const ageDays = activeBatch 
    ? Math.floor((Date.now() - new Date(activeBatch.start_date).getTime()) / (24 * 60 * 60 * 1000)) + 1
    : 0;

  const currentProfile = getProfileForAge(ageDays);

  useEffect(() => {
    if (!enabled || !user || !isBroiler || !activeBatch || ageDays <= 0) {
      return;
    }

    // Only check once per day
    if (lastCheckDay.current === ageDays) {
      return;
    }
    lastCheckDay.current = ageDays;

    const shouldSwitch = currentProfile.id !== lastAppliedProfile.current;
    
    if (!shouldSwitch) {
      return;
    }

    // Apply the new profile
    applyProfile(currentProfile);
    
  }, [ageDays, enabled, user, isBroiler, activeBatch, currentProfile]);

  const applyProfile = async (profile: AgeProfileConfig) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('farm_settings')
        .update({
          ...profile.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Create info alert about profile change
      await supabase.from('alerts').insert([{
        user_id: user.id,
        alert_type: 'temperature',
        severity: 'info',
        message: `Auto Mode: Switched to ${profile.name.en} (Day ${ageDays})`,
        message_bn: `অটো মোড: ${profile.name.bn} এ পরিবর্তিত হয়েছে (${ageDays} দিন)`,
      }]);

      lastAppliedProfile.current = profile.id;

      toast({
        title: profile.icon + ' ' + (language === 'bn' ? 'প্রোফাইল পরিবর্তন' : 'Profile Changed'),
        description: language === 'bn' 
          ? `${profile.name.bn} - সেটিংস স্বয়ংক্রিয়ভাবে আপডেট হয়েছে` 
          : `${profile.name.en} - Settings auto-updated`,
      });

      console.log(`[Age Auto-Mode] Applied profile: ${profile.id} for Day ${ageDays}`);
    } catch (error) {
      console.error('[Age Auto-Mode] Failed to apply profile:', error);
    }
  };

  // Force apply current profile
  const forceApply = () => {
    if (currentProfile) {
      applyProfile(currentProfile);
    }
  };

  return {
    enabled: enabled && isBroiler,
    ageDays,
    currentProfile,
    allProfiles: BROILER_AGE_PROFILES,
    forceApply,
    isActive: !!activeBatch && ageDays > 0,
    nextProfileChange: getNextProfileChange(ageDays),
  };
}

/**
 * Get days until next profile change
 */
function getNextProfileChange(currentDays: number): { daysUntil: number; nextProfile: AgeProfileConfig } | null {
  const currentProfile = getProfileForAge(currentDays);
  const currentIndex = BROILER_AGE_PROFILES.findIndex(p => p.id === currentProfile.id);
  
  if (currentIndex < BROILER_AGE_PROFILES.length - 1) {
    const nextProfile = BROILER_AGE_PROFILES[currentIndex + 1];
    return {
      daysUntil: nextProfile.minDays - currentDays,
      nextProfile,
    };
  }
  
  return null;
}
