import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Egg, Drumstick, Sun, Cloud, Snowflake, CloudRain, 
  Baby, TrendingUp, Factory, Flame, Wind, Check,
  Wand2, ChevronRight, Home, AlertTriangle, Sparkles, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useFarmData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { useWeatherCache } from '@/hooks/useWeather';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Auto-detect season based on temperature and humidity
function detectSeason(temperature: number | null, humidity: number | null, rainProbability: number | null): Season {
  if (!temperature) return 'summer';
  
  // High rain probability = rainy season
  if (rainProbability && rainProbability > 50) return 'rainy';
  if (humidity && humidity > 85 && rainProbability && rainProbability > 30) return 'rainy';
  
  // Temperature based detection
  if (temperature < 20) return 'winter';
  if (temperature >= 30) return 'summer';
  
  // Moderate temperature with high humidity = likely rainy
  if (temperature >= 20 && temperature < 30 && humidity && humidity > 80) return 'rainy';
  
  return 'summer';
}

// Auto-detect profile based on bird age
function detectProfile(ageDays: number, farmType: FarmType): ProfileType {
  if (farmType === 'broiler') {
    // Broiler age-based profiles
    if (ageDays <= 10) return 'chick_care';
    if (ageDays <= 21) return 'grower';
    return 'production';
  } else {
    // Layer age-based profiles (weeks)
    const ageWeeks = Math.floor(ageDays / 7);
    if (ageWeeks <= 4) return 'chick_care';
    if (ageWeeks <= 18) return 'grower';
    return 'production';
  }
}
type FarmType = 'layer' | 'broiler';
type Season = 'summer' | 'winter' | 'rainy';
type FarmSize = 'small' | 'medium' | 'large';
type ProfileType = 'chick_care' | 'grower' | 'production' | 'heat_protection' | 'cold_protection';

const FARM_TYPES = [
  {
    id: 'layer' as FarmType,
    icon: Egg,
    name: { bn: 'লেয়ার', en: 'Layer' },
    description: { bn: 'ডিম উৎপাদন', en: 'Egg production' },
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    id: 'broiler' as FarmType,
    icon: Drumstick,
    name: { bn: 'ব্রয়লার', en: 'Broiler' },
    description: { bn: 'মাংস উৎপাদন', en: 'Meat production' },
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
];

const SEASONS = [
  {
    id: 'summer' as Season,
    icon: Sun,
    name: { bn: 'গ্রীষ্ম', en: 'Summer' },
    description: { bn: 'গরমের সময়', en: 'Hot weather' },
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    id: 'winter' as Season,
    icon: Snowflake,
    name: { bn: 'শীত', en: 'Winter' },
    description: { bn: 'ঠান্ডার সময়', en: 'Cold weather' },
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'rainy' as Season,
    icon: CloudRain,
    name: { bn: 'বর্ষা', en: 'Rainy' },
    description: { bn: 'বৃষ্টির সময়', en: 'Monsoon' },
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
];

const FARM_SIZES = [
  { id: 'small' as FarmSize, name: { bn: 'ছোট', en: 'Small' }, range: { bn: '< ১,০০০ পাখি', en: '< 1,000 birds' } },
  { id: 'medium' as FarmSize, name: { bn: 'মাঝারি', en: 'Medium' }, range: { bn: '১,০০০ - ৫,০০০', en: '1,000 - 5,000' } },
  { id: 'large' as FarmSize, name: { bn: 'বড়', en: 'Large' }, range: { bn: '৫,০০০+', en: '5,000+' } },
];

const PROFILES = [
  {
    id: 'chick_care' as ProfileType,
    icon: Baby,
    name: { bn: 'বাচ্চা পরিচর্যা', en: 'Chick Care' },
    description: { bn: '১-১০ দিনের জন্য উচ্চ তাপমাত্রা', en: 'High temp for 1-10 days old' },
    color: 'text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  {
    id: 'grower' as ProfileType,
    icon: TrendingUp,
    name: { bn: 'গ্রোয়ার স্টেজ', en: 'Grower Stage' },
    description: { bn: '১১-২১ দিনের জন্য সুষম পরিবেশ', en: 'Balanced for 11-21 days old' },
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'production' as ProfileType,
    icon: Factory,
    name: { bn: 'প্রোডাকশন', en: 'Production' },
    description: { bn: 'সর্বোচ্চ উৎপাদনের জন্য', en: 'For maximum output' },
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'heat_protection' as ProfileType,
    icon: Flame,
    name: { bn: 'তাপ সুরক্ষা', en: 'Heat Protection' },
    description: { bn: 'অতিরিক্ত গরমে সুরক্ষা', en: 'Protection during extreme heat' },
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    id: 'cold_protection' as ProfileType,
    icon: Wind,
    name: { bn: 'ঠান্ডা সুরক্ষা', en: 'Cold Protection' },
    description: { bn: 'শীতকালে সুরক্ষা', en: 'Protection during cold' },
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
];

export function FarmSetupTab() {
  const { language } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: activeBatch } = useActiveBatch();
  const { data: weatherData } = useWeatherCache();
  const { toast } = useToast();

  // Auto-detect season from weather data
  const autoDetectedSeason = useMemo(() => {
    return detectSeason(
      weatherData?.temperature ?? null,
      weatherData?.humidity ?? null,
      weatherData?.rain_probability ?? null
    );
  }, [weatherData]);

  const [farmType, setFarmType] = useState<FarmType>((profile?.farm_type as FarmType) || 'layer');
  const [seasonOverride, setSeasonOverride] = useState<Season | null>(null);
  const [isSeasonManual, setIsSeasonManual] = useState(false);
  const [farmSize, setFarmSize] = useState<FarmSize>('medium');
  const [profileOverride, setProfileOverride] = useState<ProfileType | null>(null);
  const [isProfileManual, setIsProfileManual] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Calculate bird age from active batch or flock info
  const birdAge = useMemo(() => {
    if (farmType === 'broiler' && activeBatch?.start_date) {
      return Math.floor((Date.now() - new Date(activeBatch.start_date).getTime()) / (1000 * 60 * 60 * 24));
    }
    // For layers, we could use flock_info purchase_date if available
    return 0;
  }, [farmType, activeBatch]);

  // Auto-detect profile from bird age
  const autoDetectedProfile = useMemo(() => {
    return detectProfile(birdAge, farmType);
  }, [birdAge, farmType]);

  // Active profile (auto or manual)
  const activeProfile = isProfileManual && profileOverride ? profileOverride : autoDetectedProfile;

  // Active season (auto or manual)
  const activeSeason = isSeasonManual && seasonOverride ? seasonOverride : autoDetectedSeason;

  const handleApplyClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmApply = async () => {
    setShowConfirmDialog(false);
    try {
      await updateProfile.mutateAsync({ 
        farm_type: farmType,
      });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' 
          ? 'প্রস্তাবিত সেটিংস প্রয়োগ করা হয়েছে' 
          : 'Recommended settings applied',
      });
    } catch (error) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'আবার চেষ্টা করুন' : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Farm Type Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'খামারের ধরণ' : 'Farm Type'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? 'আপনার খামার কি ডিম না মাংসের জন্য?' 
              : 'Is your farm for eggs or meat?'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {FARM_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = farmType === type.id;
              return (
                <motion.button
                  key={type.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFarmType(type.id)}
                  className={`relative rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? `${type.bgColor} border-2 border-current ${type.color} shadow-md`
                      : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <Icon className={`h-8 w-8 mb-2 ${isSelected ? type.color : 'text-muted-foreground'}`} />
                  <p className="font-semibold">{type.name[language]}</p>
                  <p className="text-xs text-muted-foreground">{type.description[language]}</p>
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bird Age Display (for broiler) */}
      {farmType === 'broiler' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Baby className="h-5 w-5 text-pink-500" />
              {language === 'bn' ? 'পাখির বয়স' : 'Bird Age'}
              <Badge variant="secondary" className="ml-2 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {language === 'bn' ? 'অটো' : 'Auto'}
              </Badge>
            </CardTitle>
            <CardDescription>
              {language === 'bn' 
                ? activeBatch?.start_date 
                  ? `ব্যাচ শুরুর তারিখ থেকে গণনা করা হয়েছে`
                  : 'কোনো সক্রিয় ব্যাচ নেই - Farm Management এ ব্যাচ তৈরি করুন'
                : activeBatch?.start_date
                  ? `Calculated from batch start date`
                  : 'No active batch - Create a batch in Farm Management'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center p-4 rounded-xl bg-muted/50">
                <p className="text-4xl font-bold text-primary">{birdAge}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'bn' ? 'দিন বয়স' : 'days old'}
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-orange-500">
                  {birdAge <= 3 ? 33 : birdAge <= 7 ? 31 : birdAge <= 14 ? 29 : birdAge <= 21 ? 26 : birdAge <= 28 ? 24 : 22}°C
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'bn' ? 'টার্গেট তাপমাত্রা' : 'Target Temp'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Season Detection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                {language === 'bn' ? 'মৌসুম' : 'Season'}
                {!isSeasonManual && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {language === 'bn' ? 'অটো' : 'Auto'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {language === 'bn' 
                  ? isSeasonManual 
                    ? 'ম্যানুয়ালি নির্বাচিত' 
                    : `Weather API থেকে স্বয়ংক্রিয়ভাবে সনাক্ত (${weatherData?.temperature ?? '--'}°C, ${weatherData?.humidity ?? '--'}%)`
                  : isSeasonManual
                    ? 'Manually selected'
                    : `Auto-detected from Weather API (${weatherData?.temperature ?? '--'}°C, ${weatherData?.humidity ?? '--'}%)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="season-manual" className="text-xs text-muted-foreground">
                {language === 'bn' ? 'ম্যানুয়াল' : 'Manual'}
              </Label>
              <Switch
                id="season-manual"
                checked={isSeasonManual}
                onCheckedChange={(checked) => {
                  setIsSeasonManual(checked);
                  if (!checked) setSeasonOverride(null);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {SEASONS.map((s) => {
              const Icon = s.icon;
              const isSelected = activeSeason === s.id;
              const isAutoDetected = !isSeasonManual && autoDetectedSeason === s.id;
              return (
                <motion.button
                  key={s.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (isSeasonManual) {
                      setSeasonOverride(s.id);
                    } else {
                      // Enable manual mode and set this season
                      setIsSeasonManual(true);
                      setSeasonOverride(s.id);
                    }
                  }}
                  disabled={!isSeasonManual && isAutoDetected}
                  className={`relative rounded-xl p-3 text-center transition-all ${
                    isSelected
                      ? `${s.bgColor} border-2 border-current ${s.color}`
                      : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                  } ${!isSeasonManual && !isAutoDetected ? 'opacity-50' : ''}`}
                >
                  {isAutoDetected && !isSeasonManual && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                  <Icon className={`h-6 w-6 mx-auto mb-1 ${isSelected ? s.color : 'text-muted-foreground'}`} />
                  <p className="text-sm font-medium">{s.name[language]}</p>
                </motion.button>
              );
            })}
          </div>
          
          {/* Reset to auto button */}
          {isSeasonManual && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-muted-foreground"
              onClick={() => {
                setIsSeasonManual(false);
                setSeasonOverride(null);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {language === 'bn' ? 'অটো ডিটেক্টে ফিরে যান' : 'Reset to Auto-detect'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Farm Size */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {language === 'bn' ? 'খামারের আকার' : 'Farm Size'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={farmSize} onValueChange={(v) => setFarmSize(v as FarmSize)}>
            <div className="grid grid-cols-3 gap-2">
              {FARM_SIZES.map((size) => (
                <div key={size.id}>
                  <RadioGroupItem value={size.id} id={size.id} className="sr-only" />
                  <Label
                    htmlFor={size.id}
                    className={`flex flex-col items-center justify-center rounded-xl p-3 cursor-pointer transition-all ${
                      farmSize === size.id
                        ? 'bg-primary/10 border-2 border-primary text-primary'
                        : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                    }`}
                  >
                    <span className="font-semibold">{size.name[language]}</span>
                    <span className="text-xs text-muted-foreground">{size.range[language]}</span>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Profile Selection - Auto-detected from bird age */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                {language === 'bn' ? 'পরিচালনা প্রোফাইল' : 'Management Profile'}
                {!isProfileManual && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {language === 'bn' ? 'অটো' : 'Auto'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {language === 'bn' 
                  ? isProfileManual 
                    ? 'ম্যানুয়ালি নির্বাচিত' 
                    : `পাখির বয়স (${birdAge} দিন) থেকে স্বয়ংক্রিয়ভাবে নির্ধারিত`
                  : isProfileManual
                    ? 'Manually selected'
                    : `Auto-detected from bird age (${birdAge} days)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="profile-manual" className="text-xs text-muted-foreground">
                {language === 'bn' ? 'ম্যানুয়াল' : 'Manual'}
              </Label>
              <Switch
                id="profile-manual"
                checked={isProfileManual}
                onCheckedChange={(checked) => {
                  setIsProfileManual(checked);
                  if (!checked) setProfileOverride(null);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PROFILES.map((p) => {
              const Icon = p.icon;
              const isSelected = activeProfile === p.id;
              const isAutoDetected = !isProfileManual && autoDetectedProfile === p.id;
              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    if (isProfileManual) {
                      setProfileOverride(p.id);
                    } else {
                      // Enable manual mode and set this profile
                      setIsProfileManual(true);
                      setProfileOverride(p.id);
                    }
                  }}
                  disabled={!isProfileManual && isAutoDetected}
                  className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all ${
                    isSelected
                      ? `${p.bgColor} border-2 border-current ${p.color}`
                      : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                  } ${!isProfileManual && !isAutoDetected ? 'opacity-50' : ''}`}
                >
                  {isAutoDetected && !isProfileManual && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-lg ${p.bgColor}`}>
                    <Icon className={`h-5 w-5 ${p.color}`} />
                    {isAutoDetected && !isProfileManual && (
                      <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Sparkles className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{p.name[language]}</p>
                    <p className="text-xs text-muted-foreground">{p.description[language]}</p>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-primary" />}
                </motion.button>
              );
            })}
          </div>
          
          {/* Reset to auto button */}
          {isProfileManual && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-muted-foreground"
              onClick={() => {
                setIsProfileManual(false);
                setProfileOverride(null);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {language === 'bn' ? 'অটো ডিটেক্টে ফিরে যান' : 'Reset to Auto-detect'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Apply Button */}
      <Button 
        onClick={handleApplyClick} 
        className="w-full h-14 text-lg"
        disabled={updateProfile.isPending}
      >
        <Wand2 className="mr-2 h-5 w-5" />
        {language === 'bn' ? 'প্রস্তাবিত সেটিংস প্রয়োগ করুন' : 'Apply Recommended Settings'}
        <ChevronRight className="ml-2 h-5 w-5" />
      </Button>

      {/* Explanation */}
      <p className="text-center text-sm text-muted-foreground px-4">
        {language === 'bn' 
          ? '💡 এটি আপনার নির্বাচন অনুযায়ী তাপমাত্রা, আর্দ্রতা এবং ভেন্টিলেশন সেটিংস স্বয়ংক্রিয়ভাবে সমন্বয় করবে।' 
          : '💡 This will auto-adjust temperature, humidity, and ventilation settings based on your selections.'}
      </p>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {language === 'bn' ? 'অটোমেশনে প্রভাব পড়বে' : 'Automation Will Be Affected'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {language === 'bn' 
                  ? 'এই পরিবর্তন আপনার সম্পূর্ণ অটোমেশন সিস্টেমে প্রভাব ফেলবে:' 
                  : 'This change will affect your entire automation system:'}
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>{language === 'bn' ? 'তাপমাত্রা ও আর্দ্রতার থ্রেশহোল্ড পরিবর্তন হবে' : 'Temperature & humidity thresholds will change'}</li>
                <li>{language === 'bn' ? 'ফ্যান এবং হিটার অটোমেশন রিসেট হবে' : 'Fan and heater automation will reset'}</li>
                <li>{language === 'bn' ? 'অ্যালার্ম সেটিংস পুনরায় কনফিগার হবে' : 'Alarm settings will reconfigure'}</li>
                {farmType === 'broiler' && (
                  <li>{language === 'bn' ? 'বয়স-ভিত্তিক তাপমাত্রা কার্ভ সক্রিয় হবে' : 'Age-based temp curve will activate'}</li>
                )}
              </ul>
              <p className="font-medium text-foreground pt-2">
                {language === 'bn' 
                  ? 'আপনি কি নিশ্চিত এই পরিবর্তন করতে চান?' 
                  : 'Are you sure you want to make this change?'}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmApply}
              className="bg-primary"
            >
              {language === 'bn' ? 'হ্যাঁ, প্রয়োগ করুন' : 'Yes, Apply'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
