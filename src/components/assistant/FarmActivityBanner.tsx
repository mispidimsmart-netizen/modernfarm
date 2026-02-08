import { motion } from 'framer-motion';
import { Flame, Snowflake, Wind, AlertTriangle, Moon, Droplets, Fan, ThermometerSun, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useFarmType } from '@/hooks/useFarmType';
import { useMemo } from 'react';

interface FarmState {
  id: string;
  icon: React.ElementType;
  label: { bn: string; en: string };
  description: { bn: string; en: string };
  gradient: string;
  borderColor: string;
  textColor: string;
  priority: number;
}

const FARM_STATES: FarmState[] = [
  {
    id: 'emergency',
    icon: AlertTriangle,
    label: { bn: '🚨 জরুরি অবস্থা', en: '🚨 Emergency' },
    description: { bn: 'অতিরিক্ত তাপ/গ্যাস - জরুরি ব্যবস্থা নিন', en: 'Critical heat/gas - Take immediate action' },
    gradient: 'from-red-600 via-red-500 to-rose-600',
    borderColor: 'border-red-400/50',
    textColor: 'text-red-100',
    priority: 1,
  },
  {
    id: 'gas_purge',
    icon: Wind,
    label: { bn: '💨 গ্যাস পরিষ্কার চলছে', en: '💨 Gas Purge Active' },
    description: { bn: 'অ্যামোনিয়া বেশি - ফ্যান চলছে', en: 'High ammonia - Exhaust running' },
    gradient: 'from-purple-600 via-fuchsia-500 to-purple-600',
    borderColor: 'border-purple-400/50',
    textColor: 'text-purple-100',
    priority: 2,
  },
  {
    id: 'cooling',
    icon: Snowflake,
    label: { bn: '❄️ কুলিং মোড', en: '❄️ Cooling Mode' },
    description: { bn: 'ফগার ও ফ্যান চলছে', en: 'Fogger & fan running' },
    gradient: 'from-cyan-600 via-sky-500 to-blue-600',
    borderColor: 'border-cyan-400/50',
    textColor: 'text-cyan-100',
    priority: 3,
  },
  {
    id: 'heating',
    icon: Flame,
    label: { bn: '🔥 হিটিং মোড', en: '🔥 Heating Mode' },
    description: { bn: 'তাপমাত্রা বাড়ানো হচ্ছে', en: 'Maintaining temperature' },
    gradient: 'from-orange-600 via-amber-500 to-orange-600',
    borderColor: 'border-orange-400/50',
    textColor: 'text-orange-100',
    priority: 4,
  },
  {
    id: 'min_vent',
    icon: Fan,
    label: { bn: '🌬️ ভেন্টিলেশন চলছে', en: '🌬️ Ventilation Running' },
    description: { bn: 'সর্বনিম্ন বায়ু চলাচল', en: 'Minimum air circulation' },
    gradient: 'from-teal-600 via-emerald-500 to-teal-600',
    borderColor: 'border-teal-400/50',
    textColor: 'text-teal-100',
    priority: 5,
  },
  {
    id: 'night_rest',
    icon: Moon,
    label: { bn: '🌙 রাত্রি বিশ্রাম', en: '🌙 Night Rest Mode' },
    description: { bn: 'মুরগি বিশ্রামে আছে', en: 'Birds are resting' },
    gradient: 'from-indigo-700 via-slate-600 to-indigo-700',
    borderColor: 'border-indigo-400/50',
    textColor: 'text-indigo-100',
    priority: 6,
  },
  {
    id: 'optimal',
    icon: Activity,
    label: { bn: '✅ সব ঠিক আছে', en: '✅ All Systems Normal' },
    description: { bn: 'খামার স্বাভাবিক অবস্থায় আছে', en: 'Farm is running optimally' },
    gradient: 'from-emerald-600 via-green-500 to-emerald-600',
    borderColor: 'border-emerald-400/50',
    textColor: 'text-emerald-100',
    priority: 10,
  },
];

export function FarmActivityBanner() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { data: settings } = useFarmSettings();
  const { isBroiler } = useFarmType();

  // Determine current farm state based on sensor data and device status
  const currentState = useMemo((): FarmState => {
    const temp = sensorData.temperature;
    const humidity = sensorData.humidity;
    const ammonia = sensorData.ammonia;
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 22 || currentHour < 5;

    // Priority 1: Emergency (extreme heat or ammonia)
    if (temp > 40 || ammonia > 25) {
      return FARM_STATES.find(s => s.id === 'emergency')!;
    }

    // Priority 2: Gas Purge (high ammonia)
    if (ammonia > 15 && deviceStatus.fan) {
      return FARM_STATES.find(s => s.id === 'gas_purge')!;
    }

    // Priority 3: Cooling Mode (high temp with fan/fogger)
    if (temp > 32 && deviceStatus.fan) {
      return FARM_STATES.find(s => s.id === 'cooling')!;
    }

    // Priority 4: Heating Mode (low temp with heater)
    if (temp < 26 && deviceStatus.heater) {
      return FARM_STATES.find(s => s.id === 'heating')!;
    }

    // Priority 5: Minimum Ventilation (fan cycling)
    if (temp < 26 && deviceStatus.fan) {
      return FARM_STATES.find(s => s.id === 'min_vent')!;
    }

    // Priority 6: Night Rest Mode
    if (isNight && !deviceStatus.light) {
      return FARM_STATES.find(s => s.id === 'night_rest')!;
    }

    // Default: Optimal
    return FARM_STATES.find(s => s.id === 'optimal')!;
  }, [sensorData, deviceStatus]);

  const Icon = currentState.icon;

  return (
    <motion.div
      key={currentState.id}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${currentState.gradient} p-4 shadow-lg border ${currentState.borderColor}`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
      </div>

      <div className="relative flex items-center gap-4">
        {/* Animated Icon */}
        <motion.div
          animate={{ 
            scale: currentState.id === 'emergency' ? [1, 1.1, 1] : 1,
            rotate: currentState.id === 'min_vent' || currentState.id === 'cooling' ? [0, 360] : 0,
          }}
          transition={{ 
            duration: currentState.id === 'emergency' ? 0.8 : 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          className={`flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ${currentState.textColor}`}
        >
          <Icon className="h-8 w-8" />
        </motion.div>

        {/* Text Content */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">
            {currentState.label[language]}
          </h3>
          <p className={`text-sm ${currentState.textColor} opacity-90`}>
            {currentState.description[language]}
          </p>
        </div>

        {/* Live indicator */}
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {language === 'bn' ? 'লাইভ' : 'LIVE'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
