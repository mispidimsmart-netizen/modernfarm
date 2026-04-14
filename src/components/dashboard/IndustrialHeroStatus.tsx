import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, CheckCircle2, Thermometer, Snowflake, 
  Wind, Wrench, Zap, Fan, Flame, Droplets, Lightbulb, 
  CircleDot, CircleOff, ArrowUpFromDot
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useHeatStressAutomation } from '@/hooks/useHeatStressAutomation';
import { useFarmType, getBroilerTempRangeByDays } from '@/hooks/useFarmType';
import { useActiveBatch, useBatchStats } from '@/hooks/useBroilerData';
import { useSelectedShed } from '@/hooks/useSheds';
import { useAutomationMode } from '@/hooks/useAutomationMode';

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
    title: { bn: '🟠 তাপমাত্রা নিয়ন্ত্রণ চলছে', en: '🟠 Temperature Control Active' },
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

interface DeviceItem {
  icon: React.ElementType;
  label: { bn: string; en: string };
  isOn: boolean;
  reason: { bn: string; en: string };
}

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
    const anyDeviceActive = deviceStatus.fan || deviceStatus.heater || deviceStatus.fogger || deviceStatus.ceilingFan || deviceStatus.sprinkler;

    // Emergency: extreme values
    if (temp > 38 || ammonia > 25 || hsi > 85) {
      return STATUS_MAP.emergency;
    }

    // Cooling: devices are actively cooling OR dangerous thresholds
    if ((temp > 32 || hsi > 70) && anyDeviceActive) {
      return STATUS_MAP.cooling;
    }

    // Adjusting: devices active for temperature adjustment
    if (anyDeviceActive) {
      if (isBroiler && batchStats) {
        const targetRange = getBroilerTempRangeByDays(batchStats.ageDays);
        if (temp < targetRange.minTemp || temp > targetRange.maxTemp) {
          return STATUS_MAP.adjusting;
        }
      } else if (temp < 18 || temp > 32) {
        return STATUS_MAP.adjusting;
      }
    }

    return STATUS_MAP.normal;
  }, [sensorData, hsiResult, isBroiler, batchStats, deviceStatus]);

  // Build device status list with reasons
  const deviceItems = useMemo((): DeviceItem[] => {
    const temp = sensorData.temperature;
    const ammonia = sensorData.ammonia;
    const hsi = hsiResult?.index || 0;

    // Fan reason
    let fanReason: { bn: string; en: string };
    if (!deviceStatus.fan) {
      fanReason = { bn: 'বন্ধ — এখন প্রয়োজন নেই', en: 'OFF — Not needed now' };
    } else if (ammonia > 25) {
      fanReason = { bn: `NH₃ ${ammonia.toFixed(0)} ppm — গ্যাস বের করা হচ্ছে`, en: `NH₃ ${ammonia.toFixed(0)} ppm — Exhausting gas` };
    } else if (temp > 38) {
      fanReason = { bn: `${temp.toFixed(1)}°C — ইমার্জেন্সি কুলিং`, en: `${temp.toFixed(1)}°C — Emergency cooling` };
    } else if (temp > 32 || hsi > 70) {
      fanReason = { bn: `${temp.toFixed(1)}°C — গরম কমানো হচ্ছে`, en: `${temp.toFixed(1)}°C — Reducing heat` };
    } else {
      fanReason = { bn: 'তাজা বাতাস দেওয়া হচ্ছে', en: 'Fresh air circulation' };
    }

    // Heater reason
    let heaterReason: { bn: string; en: string };
    if (!deviceStatus.heater) {
      heaterReason = { bn: 'বন্ধ — এখন প্রয়োজন নেই', en: 'OFF — Not needed now' };
    } else {
      heaterReason = { bn: `${temp.toFixed(1)}°C — তাপমাত্রা বাড়ানো হচ্ছে`, en: `${temp.toFixed(1)}°C — Heating active` };
    }

    // Fogger reason
    let foggerReason: { bn: string; en: string };
    if (!deviceStatus.fogger) {
      foggerReason = { bn: 'বন্ধ — এখন প্রয়োজন নেই', en: 'OFF — Not needed now' };
    } else {
      foggerReason = { bn: `${temp.toFixed(1)}°C H:${sensorData.humidity.toFixed(0)}% — কুলিং`, en: `${temp.toFixed(1)}°C H:${sensorData.humidity.toFixed(0)}% — Cooling` };
    }

    // Light reason
    let lightReason: { bn: string; en: string };
    if (!deviceStatus.light) {
      lightReason = { bn: 'বন্ধ — শিডিউল অনুযায়ী', en: 'OFF — Per schedule' };
    } else {
      lightReason = { bn: 'চালু — শিডিউল অনুযায়ী', en: 'ON — Per schedule' };
    }

    // Ceiling Fan reason
    let ceilingFanReason: { bn: string; en: string };
    if (!deviceStatus.ceilingFan) {
      ceilingFanReason = { bn: 'বন্ধ — এখন প্রয়োজন নেই', en: 'OFF — Not needed now' };
    } else {
      ceilingFanReason = { bn: `${temp.toFixed(1)}°C — বাতাস সঞ্চালন`, en: `${temp.toFixed(1)}°C — Air circulation` };
    }

    // Sprinkler reason
    let sprinklerReason: { bn: string; en: string };
    if (!deviceStatus.sprinkler) {
      sprinklerReason = { bn: 'বন্ধ — এখন প্রয়োজন নেই', en: 'OFF — Not needed now' };
    } else {
      sprinklerReason = { bn: `HSI ${hsi.toFixed(0)} — ছাদ কুলিং`, en: `HSI ${hsi.toFixed(0)} — Roof cooling` };
    }

    return [
      { icon: Fan, label: { bn: 'এক্সহস্ট ফ্যান', en: 'Exhaust Fan' }, isOn: !!deviceStatus.fan, reason: fanReason },
      { icon: Fan, label: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' }, isOn: !!deviceStatus.ceilingFan, reason: ceilingFanReason },
      { icon: Flame, label: { bn: 'হিটার', en: 'Heater' }, isOn: !!deviceStatus.heater, reason: heaterReason },
      { icon: Lightbulb, label: { bn: 'লাইট', en: 'Light' }, isOn: !!deviceStatus.light, reason: lightReason },
      { icon: Droplets, label: { bn: 'ফগার', en: 'Fogger' }, isOn: !!deviceStatus.fogger, reason: foggerReason },
      { icon: ArrowUpFromDot, label: { bn: 'স্প্রিংকলার', en: 'Sprinkler' }, isOn: !!deviceStatus.sprinkler, reason: sprinklerReason },
    ];
  }, [deviceStatus, sensorData, hsiResult]);

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

      <div className="relative z-10 px-5 pt-5 pb-4">
        {/* Top row: Status + Live */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                scale: isEmergency ? [1, 1.15, 1] : 1,
              }}
              transition={{
                duration: 0.8,
                repeat: isEmergency ? Infinity : 0,
              }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
            >
              <Icon className="h-7 w-7 text-white" />
            </motion.div>
            <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {currentStatus.title[language]}
            </h1>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white shrink-0">
            <span className={`h-2 w-2 rounded-full ${currentStatus.dotColor} animate-pulse`} />
            {language === 'bn' ? 'লাইভ' : 'LIVE'}
          </span>
        </div>

        {/* Device Status Grid — THE KEY INFORMATION */}
        <div className="grid grid-cols-3 gap-1.5">
          {deviceItems.map((device) => {
            const DeviceIcon = device.icon;
            return (
              <div
                key={device.label.en}
                className={`rounded-xl p-2.5 ${
                  device.isOn 
                    ? 'bg-white/25 backdrop-blur-sm' 
                    : 'bg-black/15 backdrop-blur-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <DeviceIcon className={`h-4 w-4 ${device.isOn ? 'text-white' : 'text-white/50'}`} />
                  <span className={`text-xs font-bold ${device.isOn ? 'text-white' : 'text-white/50'}`}>
                    {device.label[language]}
                  </span>
                  {device.isOn ? (
                    <CircleDot className="h-3 w-3 text-green-300 ml-auto" />
                  ) : (
                    <CircleOff className="h-3 w-3 text-white/30 ml-auto" />
                  )}
                </div>
                <p className={`text-[10px] leading-tight ${device.isOn ? 'text-white/90' : 'text-white/40'}`}>
                  {device.reason[language]}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
