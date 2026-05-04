import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Thermometer, Wind, AlertTriangle, Wrench, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useHeatStressAutomation } from '@/hooks/useHeatStressAutomation';
import { useSelectedShed } from '@/hooks/useSheds';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';

type FarmState = 'normal' | 'adjusting' | 'cooling' | 'emergency' | 'sensor_fail' | 'purge';

interface StateConfig {
  id: FarmState;
  icon: React.ElementType;
  explanation: { bn: string; en: string };
  systemLabel: string;
  gradient: string;
  borderColor: string;
}

const STATE_MAP: Record<FarmState, StateConfig> = {
  normal: {
    id: 'normal',
    icon: CheckCircle2,
    explanation: { bn: 'খামার স্বাভাবিক আছে', en: 'Farm is running normally' },
    systemLabel: 'NORMAL',
    gradient: 'from-emerald-600 via-green-500 to-emerald-600',
    borderColor: 'border-emerald-400/50',
  },
  adjusting: {
    id: 'adjusting',
    icon: Thermometer,
    explanation: { bn: 'পরিবেশ পরিবর্তন হচ্ছে — ঠিক করা হচ্ছে', en: 'Environment changing — adjusting' },
    systemLabel: 'WARNING',
    gradient: 'from-amber-600 via-yellow-500 to-amber-600',
    borderColor: 'border-amber-400/50',
  },
  cooling: {
    id: 'cooling',
    icon: Wind,
    explanation: { bn: 'গরম বেশি — ঠান্ডা করা হচ্ছে', en: 'Too hot — cooling in progress' },
    systemLabel: 'WARNING',
    gradient: 'from-orange-600 via-amber-500 to-orange-600',
    borderColor: 'border-orange-400/50',
  },
  emergency: {
    id: 'emergency',
    icon: AlertTriangle,
    explanation: { bn: 'প্রাণ বাঁচাতে সর্বোচ্চ বাতাস দেওয়া হচ্ছে', en: 'Emergency — maximum ventilation active' },
    systemLabel: 'EMERGENCY',
    gradient: 'from-red-600 via-red-500 to-rose-600',
    borderColor: 'border-red-400/50',
  },
  sensor_fail: {
    id: 'sensor_fail',
    icon: Wrench,
    explanation: { bn: 'সেন্সর সমস্যা — তবুও বাতাস চলছে', en: 'Sensor issue — ventilation still running' },
    systemLabel: 'SENSOR_FAIL',
    gradient: 'from-gray-600 via-slate-500 to-gray-600',
    borderColor: 'border-gray-400/50',
  },
  purge: {
    id: 'purge',
    icon: Zap,
    explanation: { bn: 'বিদ্যুৎ ফিরে এসেছে — পরিষ্কার করা হচ্ছে', en: 'Power back — purging in progress' },
    systemLabel: 'PURGE',
    gradient: 'from-blue-600 via-indigo-500 to-blue-600',
    borderColor: 'border-blue-400/50',
  },
};

export function StateExplanationHeader() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { selectedShedId } = useSelectedShed();
  const { data: deviceHealth } = useAllDeviceHealth();
  
  const isAnyDeviceOnline = (deviceHealth || []).some((d) => {
    if (!d.is_online || !d.last_seen_at) return false;
    return Date.now() - new Date(d.last_seen_at).getTime() < 2 * 60 * 1000;
  });

  const hsiResult = useHeatStressAutomation({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    shedId: selectedShedId,
    enabled: true,
  });

  const currentState = useMemo((): StateConfig => {
    if (!hasRealData) {
      return {
        id: 'sensor_fail',
        icon: Wrench,
        explanation: { bn: 'সেন্সর ডেটা নেই — ESP32 কানেক্ট করুন', en: 'No sensor data — connect ESP32' },
        systemLabel: 'NO_DATA',
        gradient: 'from-slate-600 via-gray-500 to-slate-600',
        borderColor: 'border-slate-400/50',
      };
    }
    const temp = sensorData.temperature;
    const ammonia = sensorData.ammonia;
    const hsi = hsiResult?.index || 0;

    if (temp > 38 || ammonia > 25 || hsi > 85) return STATE_MAP.emergency;
    if (temp > 32 || hsi > 70) return STATE_MAP.cooling;
    if (temp < 18) return STATE_MAP.adjusting;
    return STATE_MAP.normal;
  }, [sensorData, hsiResult, hasRealData]);

  const Icon = currentState.icon;
  const isEmergency = currentState.id === 'emergency';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${currentState.gradient} shadow-xl border ${currentState.borderColor}`}
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center py-6 px-5 text-center">
        {/* Live badge */}
        <div className="absolute top-3 right-3">
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white ${isAnyDeviceOnline ? 'bg-white/20' : 'bg-red-500/40'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isAnyDeviceOnline ? 'bg-white animate-pulse' : 'bg-red-300'}`} />
            {isAnyDeviceOnline
              ? (language === 'bn' ? 'লাইভ' : 'LIVE')
              : (language === 'bn' ? 'অফলাইন' : 'OFFLINE')}
          </span>
        </div>

        {/* Label */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-2">
          {language === 'bn' ? 'বর্তমান খামারের অবস্থা' : 'Current Farm Condition'}
        </p>

        {/* Icon */}
        <motion.div
          animate={{ scale: isEmergency ? [1, 1.15, 1] : 1 }}
          transition={{ duration: 0.8, repeat: isEmergency ? Infinity : 0 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-3"
        >
          <Icon className="h-9 w-9 text-white" />
        </motion.div>

        {/* Main explanation — PRIMARY */}
        <h1 className="text-lg sm:text-xl font-bold text-white leading-tight mb-2">
          {currentState.explanation[language]}
        </h1>

        {/* Technical state — SECONDARY small line */}
        <p className="text-[10px] text-white/50 font-mono">
          System State: {currentState.systemLabel}
        </p>
      </div>
    </motion.div>
  );
}
