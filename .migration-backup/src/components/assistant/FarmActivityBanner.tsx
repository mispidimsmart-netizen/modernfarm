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
    label: { bn: '🔴 প্রাণ বাঁচাতে সর্বোচ্চ বাতাস দেওয়া হচ্ছে', en: '🔴 Maximum Ventilation for Bird Safety' },
    description: { bn: 'সিস্টেম স্বয়ংক্রিয়ভাবে পাখিদের বাঁচাচ্ছে', en: 'System is automatically protecting birds' },
    gradient: 'from-red-600 via-red-500 to-rose-600',
    borderColor: 'border-red-400/50',
    textColor: 'text-red-100',
    priority: 1,
  },
  {
    id: 'gas_purge',
    icon: Wind,
    label: { bn: '🟠 গ্যাস বেশি — বাতাস দেওয়া হচ্ছে', en: '🟠 High Gas — Exhausting' },
    description: { bn: 'গ্যাস বের করা হচ্ছে, ফ্যান চলছে', en: 'Exhausting gas, fan running' },
    gradient: 'from-purple-600 via-fuchsia-500 to-purple-600',
    borderColor: 'border-purple-400/50',
    textColor: 'text-purple-100',
    priority: 2,
  },
  {
    id: 'cooling',
    icon: Snowflake,
    label: { bn: '🟠 গরম বেশি — ঠান্ডা করা হচ্ছে', en: '🟠 Too Hot — Cooling Active' },
    description: { bn: 'গরম কমানো হচ্ছে, ফগার ও ফ্যান চলছে', en: 'Reducing heat, fogger & fan running' },
    gradient: 'from-cyan-600 via-sky-500 to-blue-600',
    borderColor: 'border-cyan-400/50',
    textColor: 'text-cyan-100',
    priority: 3,
  },
  {
    id: 'heating',
    icon: Flame,
    label: { bn: '🟡 ঠান্ডা — তাপমাত্রা বাড়ানো হচ্ছে', en: '🟡 Cold — Heating Active' },
    description: { bn: 'স্বয়ংক্রিয়ভাবে ঠিক করা হচ্ছে', en: 'Auto-correcting temperature' },
    gradient: 'from-orange-600 via-amber-500 to-orange-600',
    borderColor: 'border-orange-400/50',
    textColor: 'text-orange-100',
    priority: 4,
  },
  {
    id: 'min_vent',
    icon: Fan,
    label: { bn: '🟢 তাজা বাতাস দেওয়া হচ্ছে', en: '🟢 Fresh Air Circulation' },
    description: { bn: 'সর্বনিম্ন বায়ু চলাচল চলছে', en: 'Minimum ventilation running' },
    gradient: 'from-teal-600 via-emerald-500 to-teal-600',
    borderColor: 'border-teal-400/50',
    textColor: 'text-teal-100',
    priority: 5,
  },
  {
    id: 'night_rest',
    icon: Moon,
    label: { bn: '🌙 রাত্রি বিশ্রাম', en: '🌙 Night Rest Mode' },
    description: { bn: 'মুরগি বিশ্রামে আছে, খামার নিরাপদ', en: 'Birds resting, farm is safe' },
    gradient: 'from-indigo-700 via-slate-600 to-indigo-700',
    borderColor: 'border-indigo-400/50',
    textColor: 'text-indigo-100',
    priority: 6,
  },
  {
    id: 'purge',
    icon: Wind,
    label: { bn: '🔵 বিদ্যুৎ ফিরে এসেছে — খামার পরিষ্কার করা হচ্ছে', en: '🔵 Power Restored — Purging' },
    description: { bn: 'বিদ্যুৎ যাওয়ার পর পরিষ্কার করা হচ্ছে', en: 'Post-power-outage purge active' },
    gradient: 'from-blue-600 via-indigo-500 to-blue-600',
    borderColor: 'border-blue-400/50',
    textColor: 'text-blue-100',
    priority: 2,
  },
  {
    id: 'sensor_fail',
    icon: AlertTriangle,
    label: { bn: '⚪ সেন্সর সমস্যা — তবুও খামার নিরাপদ চলছে', en: '⚪ Sensor Issue — Farm Running Safely' },
    description: { bn: 'সেন্সর না থাকায় সেফটি মোড চলছে', en: 'Safety mode active due to sensor failure' },
    gradient: 'from-gray-600 via-slate-500 to-gray-600',
    borderColor: 'border-gray-400/50',
    textColor: 'text-gray-100',
    priority: 3,
  },
  {
    id: 'optimal',
    icon: Activity,
    label: { bn: '🟢 খামার স্বাভাবিক চলছে', en: '🟢 Farm Running Normal' },
    description: { bn: 'খামার সম্পূর্ণ অটোমেটিক চলছে', en: 'Farm is fully automatic' },
    gradient: 'from-emerald-600 via-green-500 to-emerald-600',
    borderColor: 'border-emerald-400/50',
    textColor: 'text-emerald-100',
    priority: 10,
  },
];

export function FarmActivityBanner() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { data: settings } = useFarmSettings();
  const { isBroiler } = useFarmType();

  // Determine current farm state based on sensor data and device status
  const currentState = useMemo((): FarmState => {
    // No real sensor data — show neutral state
    if (!hasRealData) {
      return {
        id: 'no_data',
        icon: AlertTriangle,
        label: { bn: '⚪ সেন্সর ডেটা নেই', en: '⚪ No Sensor Data' },
        description: { bn: 'ESP32 কানেক্ট করুন', en: 'Connect ESP32 device' },
        gradient: 'from-slate-600 via-gray-500 to-slate-600',
        borderColor: 'border-slate-400/50',
        textColor: 'text-slate-100',
        priority: 0,
      };
    }
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
  }, [sensorData, deviceStatus, hasRealData]);

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
