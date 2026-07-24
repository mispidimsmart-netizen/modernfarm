import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Thermometer, Wind, AlertTriangle, Wrench, Zap, Fan, Droplets, ArrowUpFromDot } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/translations';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useHeatStressAutomation } from '@/hooks/useHeatStressAutomation';
import { useSelectedShed } from '@/hooks/useSheds';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';

type FarmState = 'normal' | 'adjusting' | 'cooling' | 'cooling_needed' | 'emergency' | 'emergency_no_action' | 'sensor_fail' | 'purge';

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
    systemLabel: 'COOLING',
    gradient: 'from-orange-600 via-amber-500 to-orange-600',
    borderColor: 'border-orange-400/50',
  },
  cooling_needed: {
    id: 'cooling_needed' as FarmState,
    icon: AlertTriangle,
    explanation: { bn: '⚠️ গরম বেশি — কিন্তু কোনো কুলিং ডিভাইস চলছে না', en: '⚠️ Too hot — but no cooling device is running' },
    systemLabel: 'COOLING_NEEDED',
    gradient: 'from-orange-700 via-red-500 to-orange-700',
    borderColor: 'border-red-400/50',
  } as StateConfig,
  emergency: {
    id: 'emergency',
    icon: AlertTriangle,
    explanation: { bn: 'প্রাণ বাঁচাতে সর্বোচ্চ বাতাস দেওয়া হচ্ছে', en: 'Emergency — maximum ventilation active' },
    systemLabel: 'EMERGENCY',
    gradient: 'from-red-600 via-red-500 to-rose-600',
    borderColor: 'border-red-400/50',
  },
  emergency_no_action: {
    id: 'emergency_no_action' as FarmState,
    icon: AlertTriangle,
    explanation: { bn: '🚨 জরুরি অবস্থা — কোনো ডিভাইস কাজ করছে না! এখনই দেখুন', en: '🚨 Emergency — NO device is responding! Check now' },
    systemLabel: 'EMERGENCY_NO_ACTION',
    gradient: 'from-red-700 via-red-600 to-rose-700',
    borderColor: 'border-red-300',
  } as StateConfig,
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
  const { status: deviceStatus, isDeviceOnline } = useRealtimeDeviceStatus();
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

    // Are any cooling/ventilation devices actually running RIGHT NOW?
    // Only trust the relay flags when the device is online.
    const coolingActive = isDeviceOnline && (
      deviceStatus.fan ||
      deviceStatus.ceilingFan ||
      deviceStatus.fogger ||
      deviceStatus.sprinkler ||
      deviceStatus.circulation_fan
    );

    // Emergency conditions
    if (temp > 38 || ammonia > 25 || hsi > 85) {
      return coolingActive ? STATE_MAP.emergency : STATE_MAP.emergency_no_action;
    }
    // Cooling-needed conditions
    if (temp > 32 || hsi > 70) {
      return coolingActive ? STATE_MAP.cooling : STATE_MAP.cooling_needed;
    }
    if (temp < 18) return STATE_MAP.adjusting;
    return STATE_MAP.normal;
  }, [sensorData, hsiResult, hasRealData, deviceStatus, isDeviceOnline]);

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

      <div className="relative z-10 flex flex-col items-center justify-center py-4 px-3 sm:py-6 sm:px-5 md:py-8 md:px-6 text-center">
        {/* Live badge */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <span className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-0.5 text-[10px] sm:text-xs font-semibold text-white ${isAnyDeviceOnline ? 'bg-white/20' : 'bg-red-500/40'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isAnyDeviceOnline ? 'bg-white animate-pulse' : 'bg-red-300'}`} />
            {isAnyDeviceOnline
              ? (language === 'bn' ? 'লাইভ' : 'LIVE')
              : (language === 'bn' ? 'অফলাইন' : 'OFFLINE')}
          </span>
        </div>

        {/* Label */}
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/70 mb-1.5 sm:mb-2">
          {language === 'bn' ? 'বর্তমান খামারের অবস্থা' : 'Current Farm Condition'}
        </p>

        {/* Icon */}
        <motion.div
          animate={{ scale: isEmergency ? [1, 1.15, 1] : 1 }}
          transition={{ duration: 0.8, repeat: isEmergency ? Infinity : 0 }}
          className="flex h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-2 sm:mb-3"
        >
          <Icon className="h-6 w-6 sm:h-9 sm:w-9 md:h-11 md:w-11 text-white" />
        </motion.div>

        {/* Main explanation — PRIMARY */}
        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white leading-tight mb-1.5 sm:mb-2">
          {currentState.explanation[language]}
        </h1>

        {/* Active cooling devices — show which relays are ON for cooling/emergency */}
        {(currentState.id === 'cooling' || currentState.id === 'emergency') && isDeviceOnline && (() => {
          const activeDevices: { icon: React.ElementType; key: string }[] = [];
          if (deviceStatus.fan) activeDevices.push({ icon: Fan, key: 'exhaustFan' });
          if (deviceStatus.ceilingFan) activeDevices.push({ icon: Fan, key: 'ceilingFan' });
          if (deviceStatus.circulation_fan) activeDevices.push({ icon: Fan, key: 'circulationFan' });
          if (deviceStatus.fogger) activeDevices.push({ icon: Droplets, key: 'fogger' });
          if (deviceStatus.sprinkler) activeDevices.push({ icon: ArrowUpFromDot, key: 'sprinkler' });

          if (activeDevices.length === 0) return null;

          return (
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
              {activeDevices.map((d, i) => {
                const DIcon = d.icon;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[10px] sm:text-[11px] font-semibold text-white"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <DIcon className="h-3 w-3" />
                    {t('devices', d.key, language)}
                  </span>
                );
              })}
            </div>
          );
        })()}

        {/* Technical state — SECONDARY small line */}
        <p className="text-[10px] sm:text-xs text-white/50 font-mono">
          System State: {currentState.systemLabel}
        </p>
      </div>
    </motion.div>
  );
}
