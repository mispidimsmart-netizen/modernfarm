import { memo, useMemo } from 'react';
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
import { useDeviceStateModel } from '@/hooks/useDeviceStateModel';

type StatusId = 'normal' | 'adjusting' | 'cooling' | 'emergency' | 'sensor_fail' | 'purge';

interface StatusConfig {
  id: StatusId;
  icon: React.ElementType;
  title: { bn: string; en: string };
  gradient: string;
  borderColor: string;
  dotColor: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
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
  emergency_no_action: {
    id: 'emergency',
    icon: AlertTriangle,
    title: { bn: '🚨 বিপদ! ডিভাইস চলছে না — এখনই দেখুন', en: '🚨 DANGER! No device running — Check now' },
    gradient: 'from-red-700 via-rose-600 to-red-700',
    borderColor: 'border-red-500',
    dotColor: 'bg-red-500',
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
  no_data: {
    id: 'sensor_fail',
    icon: Wrench,
    title: { bn: '⚪ সেন্সর ডেটা নেই — ESP32 কানেক্ট করুন', en: '⚪ No Sensor Data — Connect ESP32' },
    gradient: 'from-slate-600 via-gray-500 to-slate-600',
    borderColor: 'border-slate-400/50',
    dotColor: 'bg-slate-400',
  } as StatusConfig,
};

interface DeviceItem {
  icon: React.ElementType;
  label: { bn: string; en: string };
  isOn: boolean;
  reason: { bn: string; en: string };
}

function IndustrialHeroStatusImpl() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { status: deviceStatus, isDeviceOnline } = useRealtimeDeviceStatus();
  const { isBroiler } = useFarmType();
  const { selectedShedId } = useSelectedShed();
  const { data: activeBatch } = useActiveBatch();
  const batchStats = useBatchStats(activeBatch?.id);
  const { data: automationMode } = useAutomationMode();
  const { data: deviceStateModel } = useDeviceStateModel();
  const isManualMode = automationMode === 'MANUAL';
  const isSafetyOverride = !!deviceStateModel?.safety_override;

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

    // No real sensor data — don't fabricate "normal" status
    if (!hasRealData) {
      return (STATUS_MAP as any).no_data as StatusConfig;
    }

    // Emergency: extreme values (same in both modes — safety is always active)
    if (temp > 38 || ammonia > 25 || hsi > 85) {
      // ডিভাইস না চললে আলাদা সতর্কবার্তা — মিথ্যা আশ্বাস দেবে না
      if (!anyDeviceActive) {
        return (STATUS_MAP as any).emergency_no_action as StatusConfig;
      }
      return STATUS_MAP.emergency;
    }

    // Manual mode: show manual control status
    if (isManualMode) {
      if (anyDeviceActive) {
        return {
          ...STATUS_MAP.adjusting,
          title: { bn: '✋ আপনি নিয়ন্ত্রণ করছেন', en: '✋ You Are In Control' },
        };
      }
      return {
        ...STATUS_MAP.normal,
        title: { bn: '✋ ম্যানুয়াল মোড — সব বন্ধ', en: '✋ Manual Mode — All Off' },
      };
    }

    // Auto mode logic (existing)
    if ((temp > 32 || hsi > 70) && anyDeviceActive) {
      return STATUS_MAP.cooling;
    }
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
  }, [sensorData, hsiResult, isBroiler, batchStats, deviceStatus, isManualMode, hasRealData]);

  // Build device status list with source-tagged reasons
  // Source priority: safety > manual > auto > idle/unknown
  // No "চলছে" message is shown unless an actual rule matches the device's state.
  const deviceItems = useMemo((): DeviceItem[] => {
    const temp = sensorData.temperature;
    const ammonia = sensorData.ammonia;
    const hum = sensorData.humidity;
    const hsi = hsiResult?.index || 0;

    const offlineLabel = { bn: '⚠️ অজানা — ESP32', en: '⚠️ Unknown — ESP32' };

    // ESP32 offline → cannot trust relay state. Show all as unknown.
    if (!hasRealData || !isDeviceOnline) {
      return [
        { icon: Fan, label: { bn: 'এক্সহস্ট ফ্যান', en: 'Exhaust Fan' }, isOn: false, reason: offlineLabel },
        { icon: Fan, label: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' }, isOn: false, reason: offlineLabel },
        { icon: Flame, label: { bn: 'হিটার', en: 'Heater' }, isOn: false, reason: offlineLabel },
        { icon: Lightbulb, label: { bn: 'লাইট', en: 'Light' }, isOn: false, reason: offlineLabel },
        { icon: Droplets, label: { bn: 'ফগার', en: 'Fogger' }, isOn: false, reason: offlineLabel },
        { icon: ArrowUpFromDot, label: { bn: 'স্প্রিংকলার', en: 'Sprinkler' }, isOn: false, reason: offlineLabel },
      ];
    }

    // Helper: build a source-tagged reason for one device
    // - autoOn: would automation want this device ON now?
    // - autoReason: what automation would say if it had turned it ON (only used when autoOn=true AND device is ON)
    const buildReason = (
      isOn: boolean,
      autoOn: boolean,
      autoReason: { bn: string; en: string } | null,
      idleReason: { bn: string; en: string },
    ): { bn: string; en: string } => {
      // Safety override wins (only meaningful if device is ON and condition matches safety rule)
      if (isOn && isSafetyOverride && autoOn) {
        return {
          bn: `🛡️ সেফটি: ${autoReason?.bn ?? 'নিরাপত্তা নিয়ম'}`,
          en: `🛡️ Safety: ${autoReason?.en ?? 'safety rule'}`,
        };
      }
      // Manual mode → user is the source of truth
      if (isManualMode) {
        return isOn
          ? { bn: '✋ আপনি চালু করেছেন', en: '✋ You turned ON' }
          : { bn: '✋ আপনি বন্ধ রেখেছেন', en: '✋ You kept OFF' };
      }
      // Auto mode
      if (isOn && autoOn && autoReason) {
        return { bn: `🤖 অটো: ${autoReason.bn}`, en: `🤖 Auto: ${autoReason.en}` };
      }
      // Device ON but no automation rule matches → don't fabricate a reason
      if (isOn && !autoOn) {
        return { bn: '⚠️ চালু — কারণ অজানা', en: '⚠️ ON — reason unknown' };
      }
      // Device OFF but automation wants it ON → real warning, not "not needed"
      if (!isOn && autoOn) {
        return { bn: '⚠️ প্রয়োজন কিন্তু বন্ধ', en: '⚠️ Needed but OFF' };
      }
      // OFF and idle
      return idleReason;
    };

    // === Per-device: compute autoOn condition + autoReason ===

    // Exhaust Fan: NH3>25 OR temp>38 OR temp>32 OR HSI>70
    let fanAutoOn = false;
    let fanAutoReason: { bn: string; en: string } | null = null;
    if (ammonia > 25) {
      fanAutoOn = true;
      fanAutoReason = { bn: `NH₃ ${ammonia.toFixed(0)} ppm — গ্যাস বের করা`, en: `NH₃ ${ammonia.toFixed(0)} ppm — Exhausting gas` };
    } else if (temp > 38) {
      fanAutoOn = true;
      fanAutoReason = { bn: `${temp.toFixed(1)}°C — ইমার্জেন্সি কুলিং`, en: `${temp.toFixed(1)}°C — Emergency cooling` };
    } else if (temp > 32 || hsi > 70) {
      fanAutoOn = true;
      fanAutoReason = { bn: `${temp.toFixed(1)}°C — গরম কমানো`, en: `${temp.toFixed(1)}°C — Reducing heat` };
    }

    // Heater: temp below safe range
    let heaterAutoOn = false;
    let heaterAutoReason: { bn: string; en: string } | null = null;
    const heaterMinTemp = isBroiler && batchStats ? getBroilerTempRangeByDays(batchStats.ageDays).minTemp : 18;
    if (temp < heaterMinTemp) {
      heaterAutoOn = true;
      heaterAutoReason = { bn: `${temp.toFixed(1)}°C — তাপমাত্রা বাড়ানো`, en: `${temp.toFixed(1)}°C — Heating active` };
    }

    // Fogger: high temp + low humidity
    let foggerAutoOn = false;
    let foggerAutoReason: { bn: string; en: string } | null = null;
    if (temp > 32 && hum < 70) {
      foggerAutoOn = true;
      foggerAutoReason = { bn: `${temp.toFixed(1)}°C H:${hum.toFixed(0)}% — কুলিং`, en: `${temp.toFixed(1)}°C H:${hum.toFixed(0)}% — Cooling` };
    }

    // Ceiling fan: temp > 28
    let ceilingFanAutoOn = false;
    let ceilingFanAutoReason: { bn: string; en: string } | null = null;
    if (temp > 28) {
      ceilingFanAutoOn = true;
      ceilingFanAutoReason = { bn: `${temp.toFixed(1)}°C — বাতাস সঞ্চালন`, en: `${temp.toFixed(1)}°C — Air circulation` };
    }

    // Sprinkler: HSI > 75 (roof cooling)
    let sprinklerAutoOn = false;
    let sprinklerAutoReason: { bn: string; en: string } | null = null;
    if (hsi > 75) {
      sprinklerAutoOn = true;
      sprinklerAutoReason = { bn: `HSI ${hsi.toFixed(0)} — ছাদ কুলিং`, en: `HSI ${hsi.toFixed(0)} — Roof cooling` };
    }

    // Light: schedule-based (we don't compute schedule here, just label as schedule source)
    const lightReason = isManualMode
      ? (deviceStatus.light
          ? { bn: '✋ আপনি চালু করেছেন', en: '✋ You turned ON' }
          : { bn: '✋ আপনি বন্ধ রেখেছেন', en: '✋ You kept OFF' })
      : (deviceStatus.light
          ? { bn: '🤖 অটো: শিডিউল অনুযায়ী চালু', en: '🤖 Auto: ON per schedule' }
          : { bn: '🤖 অটো: শিডিউল অনুযায়ী বন্ধ', en: '🤖 Auto: OFF per schedule' });

    const idleOff = { bn: 'বন্ধ — এখন প্রয়োজন নেই', en: 'OFF — Not needed now' };

    return [
      { icon: Fan, label: { bn: 'এক্সহস্ট ফ্যান', en: 'Exhaust Fan' }, isOn: !!deviceStatus.fan,
        reason: buildReason(!!deviceStatus.fan, fanAutoOn, fanAutoReason, idleOff) },
      { icon: Fan, label: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' }, isOn: !!deviceStatus.ceilingFan,
        reason: buildReason(!!deviceStatus.ceilingFan, ceilingFanAutoOn, ceilingFanAutoReason, idleOff) },
      { icon: Flame, label: { bn: 'হিটার', en: 'Heater' }, isOn: !!deviceStatus.heater,
        reason: buildReason(!!deviceStatus.heater, heaterAutoOn, heaterAutoReason, idleOff) },
      { icon: Lightbulb, label: { bn: 'লাইট', en: 'Light' }, isOn: !!deviceStatus.light, reason: lightReason },
      { icon: Droplets, label: { bn: 'ফগার', en: 'Fogger' }, isOn: !!deviceStatus.fogger,
        reason: buildReason(!!deviceStatus.fogger, foggerAutoOn, foggerAutoReason, idleOff) },
      { icon: ArrowUpFromDot, label: { bn: 'স্প্রিংকলার', en: 'Sprinkler' }, isOn: !!deviceStatus.sprinkler,
        reason: buildReason(!!deviceStatus.sprinkler, sprinklerAutoOn, sprinklerAutoReason, idleOff) },
    ];
  }, [deviceStatus, sensorData, hsiResult, isManualMode, hasRealData, isDeviceOnline, isSafetyOverride, isBroiler, batchStats]);

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


export const IndustrialHeroStatus = memo(IndustrialHeroStatusImpl);
