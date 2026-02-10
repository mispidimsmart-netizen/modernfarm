import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, CheckCircle2, Thermometer, Snowflake, 
  Wind, Wrench, Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useHeatStressAutomation } from '@/hooks/useHeatStressAutomation';
import { useFarmType, getBroilerTempRangeByDays } from '@/hooks/useFarmType';
import { useActiveBatch, useBatchStats } from '@/hooks/useBroilerData';
import { useSelectedShed } from '@/hooks/useSheds';

type StatusId = 'normal' | 'adjusting' | 'cooling' | 'emergency' | 'sensor_fail' | 'purge';

interface StatusConfig {
  id: StatusId;
  icon: React.ElementType;
  title: { bn: string; en: string };
  gradient: string;
  borderColor: string;
  dotColor: string;
}

const STATUS_MAP: Record<StatusId, StatusConfig> = {
  normal: {
    id: 'normal',
    icon: CheckCircle2,
    title: { bn: '🟢 খামার স্বাভাবিক চলছে', en: '🟢 Farm Running Normal' },
    gradient: 'from-emerald-600 via-green-500 to-emerald-600',
    borderColor: 'border-emerald-400/50',
    dotColor: 'bg-emerald-400',
  },
  adjusting: {
    id: 'adjusting',
    icon: Thermometer,
    title: { bn: '🟡 পরিবেশ পরিবর্তন হচ্ছে', en: '🟡 Environment Adjusting' },
    gradient: 'from-amber-600 via-yellow-500 to-amber-600',
    borderColor: 'border-amber-400/50',
    dotColor: 'bg-amber-400',
  },
  cooling: {
    id: 'cooling',
    icon: Wind,
    title: { bn: '🟠 ঠান্ডা/গরম ঠিক করা হচ্ছে', en: '🟠 Temperature Correcting' },
    gradient: 'from-orange-600 via-amber-500 to-orange-600',
    borderColor: 'border-orange-400/50',
    dotColor: 'bg-orange-400',
  },
  emergency: {
    id: 'emergency',
    icon: AlertTriangle,
    title: { bn: '🔴 প্রাণ বাঁচাতে কাজ চলছে', en: '🔴 Emergency Action Active' },
    gradient: 'from-red-600 via-red-500 to-rose-600',
    borderColor: 'border-red-400/50',
    dotColor: 'bg-red-400',
  },
  sensor_fail: {
    id: 'sensor_fail',
    icon: Wrench,
    title: { bn: '⚪ সেন্সর সমস্যা তবুও খামার চলছে', en: '⚪ Sensor Issue — Farm Running' },
    gradient: 'from-gray-600 via-slate-500 to-gray-600',
    borderColor: 'border-gray-400/50',
    dotColor: 'bg-gray-400',
  },
  purge: {
    id: 'purge',
    icon: Zap,
    title: { bn: '🔵 বিদ্যুৎ ফিরে — পরিষ্কার করা হচ্ছে', en: '🔵 Power Back — Purging' },
    gradient: 'from-blue-600 via-indigo-500 to-blue-600',
    borderColor: 'border-blue-400/50',
    dotColor: 'bg-blue-400',
  },
};

export function IndustrialHeroStatus() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { isBroiler } = useFarmType();
  const { selectedShedId } = useSelectedShed();
  const { data: activeBatch } = useActiveBatch();
  const batchStats = useBatchStats(activeBatch?.id);

  const hsiResult = useHeatStressAutomation({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    shedId: selectedShedId,
    enabled: true,
  });

  const currentStatus = useMemo((): StatusConfig => {
    const temp = sensorData.temperature;
    const ammonia = sensorData.ammonia;
    const hsi = hsiResult?.index || 0;

    // Emergency
    if (temp > 38 || ammonia > 25 || hsi > 85) {
      return STATUS_MAP.emergency;
    }

    // Cooling/Heating active
    if (temp > 32 || hsi > 70) {
      return STATUS_MAP.cooling;
    }

    // Cold adjusting
    if (isBroiler && batchStats) {
      const targetRange = getBroilerTempRangeByDays(batchStats.ageDays);
      if (temp < targetRange.minTemp - 2) {
        return STATUS_MAP.adjusting;
      }
    } else if (temp < 18) {
      return STATUS_MAP.adjusting;
    }

    // Normal
    return STATUS_MAP.normal;
  }, [sensorData, hsiResult, isBroiler, batchStats]);

  const Icon = currentStatus.icon;
  const isEmergency = currentStatus.id === 'emergency';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${currentStatus.gradient} shadow-xl border ${currentStatus.borderColor}`}
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center py-8 px-6 text-center">
        {/* Live indicator */}
        <div className="absolute top-4 right-4">
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
            <span className={`h-2 w-2 rounded-full ${currentStatus.dotColor} animate-pulse`} />
            {language === 'bn' ? 'লাইভ' : 'LIVE'}
          </span>
        </div>

        {/* Large icon */}
        <motion.div
          animate={{
            scale: isEmergency ? [1, 1.15, 1] : 1,
          }}
          transition={{
            duration: 0.8,
            repeat: isEmergency ? Infinity : 0,
          }}
          className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm mb-4"
        >
          <Icon className="h-11 w-11 text-white" />
        </motion.div>

        {/* Main status text — THE LARGEST element */}
        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
          {currentStatus.title[language]}
        </h1>
      </div>
    </motion.div>
  );
}
