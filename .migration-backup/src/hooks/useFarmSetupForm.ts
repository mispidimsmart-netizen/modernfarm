import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useUpdateProfile, useFarmSettings, useUpdateFarmSettings } from '@/hooks/useFarmData';
import { useSheds, useSelectedShed, useUpdateShed } from '@/hooks/useSheds';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBirdAge } from '@/hooks/useBirdAge';
import { useWeatherCache } from '@/hooks/useWeather';
import { detectSeason, detectProfile, type FarmType, type Season, type FarmSize, type ProfileType } from '@/lib/farmSetup';
import { FARM_TYPES, SEASONS, PROFILES } from '@/data/farmSetupOptions';

export interface PendingSetupChange {
  type: 'farm_type' | 'season' | 'profile' | 'apply';
  value?: FarmType | Season | ProfileType;
  label?: string;
}

/** State + persistence for the Farm Setup settings tab. */
export function useFarmSetupForm() {
  const { language } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: sheds } = useSheds();
  const updateShed = useUpdateShed();
  const { data: farmSettings } = useFarmSettings();
  const updateFarmSettings = useUpdateFarmSettings();

  let selectedShedId: string | null = null;
  try {
    const ctx = useSelectedShed();
    selectedShedId = ctx.selectedShedId;
  } catch {
    // ShedProvider not available
  }

  const selectedShed = sheds?.find((s) => s.id === selectedShedId);
  const { data: weatherData } = useWeatherCache();
  const { toast } = useToast();

  // Auto-detect season from weather data
  const autoDetectedSeason = useMemo(
    () =>
      detectSeason(
        weatherData?.temperature ?? null,
        weatherData?.humidity ?? null,
        weatherData?.rain_probability ?? null,
      ),
    [weatherData],
  );

  const [farmType, setFarmType] = useState<FarmType>(
    (selectedShed?.farm_type as FarmType) || (profile?.farm_type as FarmType) || 'layer',
  );
  const [seasonOverride, setSeasonOverride] = useState<Season | null>(null);
  const [isSeasonManual, setIsSeasonManual] = useState(false);
  const [farmSize, setFarmSize] = useState<FarmSize>('medium');
  const [profileOverride, setProfileOverride] = useState<ProfileType | null>(null);
  const [isProfileManual, setIsProfileManual] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingSetupChange | null>(null);

  // Hydrate state from DB once farm_settings load
  useEffect(() => {
    if (!farmSettings) return;
    const s: any = farmSettings;
    if (s.farm_size) setFarmSize(s.farm_size as FarmSize);
    if (s.season_override) {
      setSeasonOverride(s.season_override as Season);
      setIsSeasonManual(true);
    }
    if (s.profile_override) {
      setProfileOverride(s.profile_override as ProfileType);
      setIsProfileManual(true);
    }
  }, [farmSettings]);

  // Sync setup wizard: mark automation profile step complete
  const markAutomationProfileSelected = async () => {
    try {
      const farmId = (farmSettings as any)?.farm_id;
      const { data: { user } } = await supabase.auth.getUser();
      if (!farmId || !user) return;
      const { data: existing } = await supabase
        .from('farm_setup_status')
        .select('id, step_automation_profile_selected')
        .eq('farm_id', farmId)
        .maybeSingle();
      if (existing?.step_automation_profile_selected) return;
      if (existing?.id) {
        await supabase
          .from('farm_setup_status')
          .update({ step_automation_profile_selected: true })
          .eq('id', existing.id);
      } else {
        await supabase.from('farm_setup_status').insert({
          farm_id: farmId,
          user_id: user.id,
          step_automation_profile_selected: true,
        });
      }
    } catch (e) {
      console.warn('[FarmSetupTab] markAutomationProfileSelected failed', e);
    }
  };

  // Unified bird age (broiler = batch start_date, layer = flock_info.age_weeks)
  const { ageDays: unifiedAgeDays, ageWeeks: unifiedAgeWeeks, hasValue: hasAge } = useBirdAge();
  const birdAge = unifiedAgeDays ?? 0;

  const autoDetectedProfile = useMemo(() => detectProfile(birdAge, farmType), [birdAge, farmType]);
  const activeProfile = isProfileManual && profileOverride ? profileOverride : autoDetectedProfile;
  const activeSeason = isSeasonManual && seasonOverride ? seasonOverride : autoDetectedSeason;

  const handleFarmTypeChange = (newType: FarmType) => {
    if (newType === farmType) return;
    const label = FARM_TYPES.find((t) => t.id === newType)?.name[language] || newType;
    setPendingChange({ type: 'farm_type', value: newType, label });
    setShowConfirmDialog(true);
  };

  const handleSeasonChange = (newSeason: Season) => {
    const label = SEASONS.find((s) => s.id === newSeason)?.name[language] || newSeason;
    setPendingChange({ type: 'season', value: newSeason, label });
    setShowConfirmDialog(true);
  };

  const handleProfileChange = (newProfile: ProfileType) => {
    const label = PROFILES.find((p) => p.id === newProfile)?.name[language] || newProfile;
    setPendingChange({ type: 'profile', value: newProfile, label });
    setShowConfirmDialog(true);
  };

  const handleApplyClick = () => {
    setPendingChange({ type: 'apply' });
    setShowConfirmDialog(true);
  };

  const handleConfirmApply = async () => {
    setShowConfirmDialog(false);
    if (!pendingChange) return;

    try {
      if (pendingChange.type === 'farm_type' && pendingChange.value) {
        const newType = pendingChange.value as FarmType;
        setFarmType(newType);
        if (selectedShedId) {
          await updateShed.mutateAsync({ id: selectedShedId, farm_type: newType } as any);
        }
        await updateProfile.mutateAsync({ farm_type: newType });
      } else if (pendingChange.type === 'season' && pendingChange.value) {
        const newSeason = pendingChange.value as Season;
        setIsSeasonManual(true);
        setSeasonOverride(newSeason);
        await updateFarmSettings.mutateAsync({ season_override: newSeason } as any);
      } else if (pendingChange.type === 'profile' && pendingChange.value) {
        const newProfile = pendingChange.value as ProfileType;
        setIsProfileManual(true);
        setProfileOverride(newProfile);
        await updateFarmSettings.mutateAsync({ profile_override: newProfile } as any);
        await markAutomationProfileSelected();
      } else if (pendingChange.type === 'apply') {
        if (selectedShedId) {
          await updateShed.mutateAsync({ id: selectedShedId, farm_type: farmType } as any);
        }
        await updateProfile.mutateAsync({ farm_type: farmType });
        await updateFarmSettings.mutateAsync({
          farm_size: farmSize,
          season_override: isSeasonManual ? seasonOverride : null,
          profile_override: isProfileManual ? profileOverride : null,
        } as any);
        if (isProfileManual && profileOverride) {
          await markAutomationProfileSelected();
        }
      }

      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'সেটিংস সংরক্ষণ ও প্রয়োগ করা হয়েছে' : 'Settings saved and applied',
      });
    } catch (error) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'আবার চেষ্টা করুন' : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setPendingChange(null);
    }
  };

  const clearSeasonOverride = () => {
    setIsSeasonManual(false);
    setSeasonOverride(null);
    updateFarmSettings.mutate({ season_override: null } as any);
  };

  const clearProfileOverride = () => {
    setIsProfileManual(false);
    setProfileOverride(null);
    updateFarmSettings.mutate({ profile_override: null } as any);
  };

  const changeFarmSize = (newSize: FarmSize) => {
    setFarmSize(newSize);
    updateFarmSettings.mutate({ farm_size: newSize } as any);
  };

  return {
    language,
    selectedShed,
    farmType,
    farmSize,
    changeFarmSize,
    autoDetectedSeason,
    activeSeason,
    isSeasonManual,
    setIsSeasonManual,
    clearSeasonOverride,
    autoDetectedProfile,
    activeProfile,
    isProfileManual,
    setIsProfileManual,
    clearProfileOverride,
    weatherData,
    birdAge,
    unifiedAgeWeeks,
    hasAge,
    showConfirmDialog,
    setShowConfirmDialog,
    pendingChange,
    setPendingChange,
    handleFarmTypeChange,
    handleSeasonChange,
    handleProfileChange,
    handleApplyClick,
    handleConfirmApply,
    isApplying: updateProfile.isPending,
  };
}
