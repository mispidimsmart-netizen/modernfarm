import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Thermometer, Snowflake, Flame, Wind, AlertTriangle, Moon, 
  CheckCircle2, Activity, Droplets, Fan, Bird, Egg
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useFarmType, getBroilerTempRangeByDays } from '@/hooks/useFarmType';
import { useActiveBatch, useBatchStats } from '@/hooks/useBroilerData';
import { useFlockInfo } from '@/hooks/useFarmManagement';
import { useHeatStressAutomation } from '@/hooks/useHeatStressAutomation';
import { useSelectedShed } from '@/hooks/useSheds';

type FarmHealthState = 'good' | 'hot' | 'cold' | 'danger';

interface BannerConfig {
  state: FarmHealthState;
  gradient: string;
  borderColor: string;
  icon: React.ElementType;
  title: { bn: string; en: string };
  subtitle: { bn: string; en: string };
}

export function HeroFarmBanner() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { data: settings } = useFarmSettings();
  const { isLayer, isBroiler, type } = useFarmType();
  const { selectedShedId } = useSelectedShed();
  
  // Broiler data
  const { data: activeBatch } = useActiveBatch();
  const batchStats = useBatchStats(activeBatch?.id);
  
  // Layer data
  const { data: flockInfo } = useFlockInfo();
  
  // HSI for determining state
  const hsiResult = useHeatStressAutomation({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    shedId: selectedShedId,
    enabled: true,
  });

  // Determine current farm health state
  const bannerConfig = useMemo((): BannerConfig => {
    const temp = sensorData.temperature;
    const ammonia = sensorData.ammonia;
    const hsi = hsiResult?.index || 0;
    
    // DANGER/EMERGENCY state
    if (temp > 38 || ammonia > 25 || hsi > 85) {
      return {
        state: 'danger',
        gradient: 'from-red-600 via-red-500 to-rose-600',
        borderColor: 'border-red-400/50',
        icon: AlertTriangle,
        title: { bn: '🔴 প্রাণ বাঁচাতে সর্বোচ্চ বাতাস দেওয়া হচ্ছে', en: '🔴 Maximum Ventilation Active' },
        subtitle: { bn: 'সিস্টেম স্বয়ংক্রিয়ভাবে পাখিদের বাঁচাচ্ছে', en: 'System is protecting birds automatically' },
      };
    }
    
    // HOT/WARNING state
    if (temp > 32 || hsi > 70) {
      return {
        state: 'hot',
        gradient: 'from-orange-600 via-amber-500 to-orange-600',
        borderColor: 'border-orange-400/50',
        icon: Thermometer,
        title: { bn: '🟠 গরম/গ্যাস বেশি — ঠান্ডা করা হচ্ছে', en: '🟠 Heat High — Cooling Active' },
        subtitle: { bn: 'স্বয়ংক্রিয়ভাবে ঠান্ডা করা হচ্ছে', en: 'Auto-cooling in progress' },
      };
    }
    
    // COLD state (especially for broilers)
    if (isBroiler && batchStats) {
      const targetRange = getBroilerTempRangeByDays(batchStats.ageDays);
      if (temp < targetRange.minTemp - 2) {
        return {
          state: 'cold',
          gradient: 'from-blue-600 via-sky-500 to-blue-600',
          borderColor: 'border-blue-400/50',
          icon: Snowflake,
          title: { bn: '🟡 পরিবেশ পরিবর্তন হচ্ছে — স্বয়ংক্রিয়ভাবে ঠিক করা হচ্ছে', en: '🟡 Environment Changing — Auto-Correcting' },
          subtitle: { bn: 'তাপমাত্রা বাড়ানো হচ্ছে', en: 'Heating in progress' },
        };
      }
    } else if (temp < 18) {
      return {
        state: 'cold',
        gradient: 'from-blue-600 via-sky-500 to-blue-600',
        borderColor: 'border-blue-400/50',
        icon: Snowflake,
        title: { bn: '🟡 পরিবেশ পরিবর্তন হচ্ছে — স্বয়ংক্রিয়ভাবে ঠিক করা হচ্ছে', en: '🟡 Environment Changing — Auto-Correcting' },
        subtitle: { bn: 'তাপমাত্রা বাড়ানো হচ্ছে', en: 'Heating in progress' },
      };
    }
    
    // GOOD state
    return {
      state: 'good',
      gradient: 'from-emerald-600 via-green-500 to-emerald-600',
      borderColor: 'border-emerald-400/50',
      icon: CheckCircle2,
      title: { bn: '🟢 খামার স্বাভাবিক চলছে', en: '🟢 Farm Running Normal' },
      subtitle: { bn: 'খামার সম্পূর্ণ অটোমেটিক চলছে', en: 'Farm is fully automatic' },
    };
  }, [sensorData, hsiResult, isBroiler, batchStats]);

  // Determine current automation activity
  const automationActivity = useMemo(() => {
    if (deviceStatus.heater) {
      return { 
        icon: Flame, 
        text: { bn: '🔥 তাপমাত্রা বাড়ানো হচ্ছে', en: '🔥 Heating Active' },
        color: 'text-orange-200'
      };
    }
    if (deviceStatus.fan) {
      if (sensorData.ammonia > 15) {
        return { 
          icon: Wind, 
          text: { bn: '💨 গ্যাস বের করা হচ্ছে', en: '💨 Exhausting Gas' },
          color: 'text-purple-200'
        };
      }
      if (sensorData.temperature > 32) {
        return { 
          icon: Wind, 
          text: { bn: '❄️ গরম কমানো হচ্ছে', en: '❄️ Reducing Heat' },
          color: 'text-cyan-200'
        };
      }
      return { 
        icon: Fan, 
        text: { bn: '🌬️ তাজা বাতাস দেওয়া হচ্ছে', en: '🌬️ Fresh Air Circulation' },
        color: 'text-teal-200'
      };
    }
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 5) {
      return { 
        icon: Moon, 
        text: { bn: '🌙 রাত্রি বিশ্রাম', en: '🌙 Night Rest' },
        color: 'text-indigo-200'
      };
    }
    return { 
      icon: Activity, 
      text: { bn: '✨ খামার স্বয়ংক্রিয় চলছে', en: '✨ Farm Running Automatically' },
      color: 'text-emerald-200'
    };
  }, [deviceStatus, sensorData.temperature]);

  // Get bird age and stage info
  const birdInfo = useMemo(() => {
    if (isBroiler && batchStats) {
      const ageDays = batchStats.ageDays;
      let stage = { bn: 'চিক', en: 'Chick' };
      if (ageDays >= 22) stage = { bn: 'ফিনিশার', en: 'Finisher' };
      else if (ageDays >= 11) stage = { bn: 'গ্রোয়ার', en: 'Grower' };
      
      return {
        age: { bn: `${ageDays} দিন`, en: `${ageDays} days` },
        stage,
        count: activeBatch?.current_bird_count || 0,
      };
    }
    
    if (isLayer && flockInfo) {
      const ageWeeks = flockInfo.age_weeks || 0;
      let stage = { bn: 'গ্রোয়ার', en: 'Grower' };
      if (ageWeeks >= 20) stage = { bn: 'লেয়ার', en: 'Layer' };
      else if (ageWeeks >= 8) stage = { bn: 'পুলেট', en: 'Pullet' };
      
      return {
        age: { bn: `${ageWeeks} সপ্তাহ`, en: `${ageWeeks} weeks` },
        stage,
        count: flockInfo.total_birds || 0,
      };
    }
    
    return null;
  }, [isBroiler, isLayer, batchStats, flockInfo]);

  const Icon = bannerConfig.icon;
  const AutoIcon = automationActivity.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${bannerConfig.gradient} p-5 shadow-xl border ${bannerConfig.borderColor}`}
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      </div>

      <div className="relative z-10">
        {/* Top row: Farm Type + Live Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isBroiler ? (
              <Bird className="h-5 w-5 text-white/80" />
            ) : (
              <Egg className="h-5 w-5 text-white/80" />
            )}
            <span className="text-sm font-medium text-white/80">
              {isBroiler 
                ? (language === 'bn' ? 'ব্রয়লার ফার্ম' : 'Broiler Farm')
                : (language === 'bn' ? 'লেয়ার ফার্ম' : 'Layer Farm')
              }
            </span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {language === 'bn' ? 'লাইভ' : 'LIVE'}
          </span>
        </div>

        {/* Main Status Row */}
        <div className="flex items-center gap-4 mb-4">
          <motion.div
            animate={{ 
              scale: bannerConfig.state === 'danger' ? [1, 1.1, 1] : 1,
            }}
            transition={{ 
              duration: 0.8,
              repeat: bannerConfig.state === 'danger' ? Infinity : 0,
            }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
          >
            <Icon className="h-9 w-9 text-white" />
          </motion.div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-1">
              {bannerConfig.title[language]}
            </h1>
            <p className="text-sm text-white/80">
              {bannerConfig.subtitle[language]}
            </p>
          </div>
        </div>

        {/* Automation Activity */}
        <div className="flex items-center gap-2 mb-3 rounded-xl bg-white/10 p-3">
          <AutoIcon className={`h-5 w-5 ${automationActivity.color}`} />
          <span className={`text-sm font-medium ${automationActivity.color}`}>
            {automationActivity.text[language]}
          </span>
        </div>

        {/* Bird Info Row */}
        {birdInfo && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/10 p-2.5 text-center">
              <p className="text-[10px] uppercase text-white/60 mb-0.5">
                {language === 'bn' ? 'বয়স' : 'Age'}
              </p>
              <p className="text-sm font-bold text-white">
                {birdInfo.age[language]}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5 text-center">
              <p className="text-[10px] uppercase text-white/60 mb-0.5">
                {language === 'bn' ? 'স্টেজ' : 'Stage'}
              </p>
              <p className="text-sm font-bold text-white">
                {birdInfo.stage[language]}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5 text-center">
              <p className="text-[10px] uppercase text-white/60 mb-0.5">
                {language === 'bn' ? 'পাখি' : 'Birds'}
              </p>
              <p className="text-sm font-bold text-white">
                {birdInfo.count.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
