import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useAlerts } from './useFarmData';
import { useLiveSensorData } from './useSensorData';
import { useNotificationSound } from './useNotificationSound';
import { useAuth } from '@/context/AuthContext';
import { useFarmType, getBroilerTempRangeByDays } from './useFarmType';
import { useActiveBatch } from './useBroilerData';
import { differenceInDays, parseISO } from 'date-fns';

export type AlertLevel = 'info' | 'warning' | 'danger';

export interface SmartAlert {
  id: string;
  type: string;
  level: AlertLevel;
  title: string;
  titleBn: string;
  message: string;
  messageBn: string;
  suggestion: string;
  suggestionBn: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  groupId?: string;
}

// Anti-spam cooldown periods in milliseconds
const ALERT_COOLDOWNS: Record<AlertLevel, number> = {
  info: 2 * 60 * 60 * 1000,      // 2 hours
  warning: 30 * 60 * 1000,       // 30 minutes
  danger: 2 * 60 * 1000,         // 2 minutes
};

// Repeat intervals for unresolved alerts
const REPEAT_INTERVALS: Record<AlertLevel, number> = {
  info: 0,                        // No repeat
  warning: 30 * 60 * 1000,       // 30 minutes
  danger: 2 * 60 * 1000,         // 2 minutes
};

// Quiet hours (night time)
const QUIET_HOURS = { start: 22, end: 6 }; // 10 PM to 6 AM

// Farmer-friendly alert messages with suggestions
export const ALERT_TEMPLATES: Record<string, {
  title: { en: string; bn: string };
  getMessage: (data?: any) => { en: string; bn: string };
  getSuggestion: () => { en: string; bn: string };
  level: AlertLevel;
}> = {
  high_temperature: {
    title: { en: 'Farm is too hot', bn: '🌡️ খামার বেশি গরম — স্বয়ংক্রিয়ভাবে ঠান্ডা করা হচ্ছে' },
    getMessage: (data) => ({
      en: `Temperature rising${data?.temp ? ` to ${data.temp}°C` : ''}. Auto-cooling active.`,
      bn: `তাপমাত্রা বাড়ছে${data?.temp ? ` (${data.temp}°সে)` : ''}। স্বয়ংক্রিয়ভাবে ঠান্ডা করা হচ্ছে।`,
    }),
    getSuggestion: () => ({
      en: 'System is auto-cooling. Check curtains if needed.',
      bn: 'সিস্টেম নিজে ঠান্ডা করছে। প্রয়োজনে পর্দা চেক করুন।',
    }),
    level: 'danger',
  },
  extreme_cold: {
    title: { en: 'Shed is too cold', bn: 'শেড অত্যন্ত ঠান্ডা' },
    getMessage: (data) => ({
      en: `Temperature has dropped${data?.temp ? ` to ${data.temp}°C` : ''}. Birds need warmth.`,
      bn: `তাপমাত্রা কমে গেছে${data?.temp ? ` (${data.temp}°সে)` : ''}। পাখিদের উষ্ণতা প্রয়োজন।`,
    }),
    getSuggestion: () => ({
      en: 'Close curtains and turn on heater',
      bn: 'পর্দা বন্ধ করুন এবং হিটার চালু করুন',
    }),
    level: 'danger',
  },
  high_ammonia: {
    title: { en: 'Gas level rising', bn: '💨 খামারে গ্যাস বেড়েছে — বাতাস দেওয়া হচ্ছে' },
    getMessage: (data) => ({
      en: `Ammonia level rising${data?.ppm ? ` to ${data.ppm} ppm` : ''}. Auto-ventilation active.`,
      bn: `গ্যাসের মাত্রা বাড়ছে${data?.ppm ? ` (${data.ppm} পিপিএম)` : ''}। স্বয়ংক্রিয়ভাবে বাতাস দেওয়া হচ্ছে।`,
    }),
    getSuggestion: () => ({
      en: 'System is auto-ventilating. Add fresh litter if possible.',
      bn: 'সিস্টেম নিজে বাতাস দিচ্ছে। সম্ভব হলে তাজা লিটার দিন।',
    }),
    level: 'warning',
  },
  ammonia_danger: {
    title: { en: 'Dangerous gas level', bn: '💨 খামারে গ্যাস অনেক বেশি — সর্বোচ্চ বাতাস দেওয়া হচ্ছে' },
    getMessage: () => ({
      en: 'Gas at dangerous level. Maximum ventilation active.',
      bn: 'গ্যাস বিপদসীমায়। সর্বোচ্চ বাতাস দেওয়া হচ্ছে।',
    }),
    getSuggestion: () => ({
      en: 'System is running max ventilation automatically.',
      bn: 'সিস্টেম নিজে সর্বোচ্চ বাতাস দিচ্ছে।',
    }),
    level: 'danger',
  },
  low_water: {
    title: { en: 'Birds drinking less water', bn: 'পাখিরা কম পানি খাচ্ছে' },
    getMessage: () => ({
      en: 'Water consumption is lower than usual. This may indicate health issues.',
      bn: 'পানি খরচ স্বাভাবিকের চেয়ে কম। এটি স্বাস্থ্য সমস্যার লক্ষণ হতে পারে।',
    }),
    getSuggestion: () => ({
      en: 'Check water lines for blockage or leaks',
      bn: 'পানির লাইনে ব্লকেজ বা লিকেজ চেক করুন',
    }),
    level: 'warning',
  },
  high_humidity: {
    title: { en: 'Shed is getting humid', bn: 'শেড ভেজা হয়ে যাচ্ছে' },
    getMessage: (data) => ({
      en: `Humidity is high${data?.humidity ? ` at ${data.humidity}%` : ''}. Litter may become wet.`,
      bn: `আর্দ্রতা বেশি${data?.humidity ? ` (${data.humidity}%)` : ''}। লিটার ভেজা হয়ে যেতে পারে।`,
    }),
    getSuggestion: () => ({
      en: 'Increase ventilation and check litter condition',
      bn: 'ভেন্টিলেশন বাড়ান এবং লিটার চেক করুন',
    }),
    level: 'info',
  },
  power_failure: {
    title: { en: 'Power outage', bn: '⚠️ খামারের বিদ্যুৎ চলে গেছে' },
    getMessage: () => ({
      en: 'Power supply interrupted. Running on backup.',
      bn: 'বিদ্যুৎ সরবরাহ বিচ্ছিন্ন। ব্যাকআপে চলছে।',
    }),
    getSuggestion: () => ({
      en: 'Check generator. System will auto-purge when power returns.',
      bn: 'জেনারেটর চেক করুন। বিদ্যুৎ ফিরলে সিস্টেম নিজে পরিষ্কার করবে।',
    }),
    level: 'danger',
  },
  power_restored: {
    title: { en: 'Power restored', bn: '⚡ বিদ্যুৎ ফিরে এসেছে, খামার পরিষ্কার করা হচ্ছে' },
    getMessage: () => ({
      en: 'Power is back. Farm purge running automatically.',
      bn: 'বিদ্যুৎ ফিরে এসেছে। খামার স্বয়ংক্রিয়ভাবে পরিষ্কার হচ্ছে।',
    }),
    getSuggestion: () => ({
      en: 'No action needed. System will return to normal after purge.',
      bn: 'কিছু করার দরকার নেই। পরিষ্কারের পর সিস্টেম স্বাভাবিক হবে।',
    }),
    level: 'info',
  },
  heat_stress: {
    title: { en: 'Extreme heat', bn: '🔥 অতিরিক্ত গরম — সর্বোচ্চ বাতাস দেওয়া হচ্ছে' },
    getMessage: () => ({
      en: 'Extreme heat detected. Maximum cooling active.',
      bn: 'অতিরিক্ত গরম। সর্বোচ্চ বাতাস ও কুলিং চলছে।',
    }),
    getSuggestion: () => ({
      en: 'System is auto-cooling at max. Check water supply.',
      bn: 'সিস্টেম নিজে সর্বোচ্চ কুলিং দিচ্ছে। পানি সরবরাহ চেক করুন।',
    }),
    level: 'danger',
  },
  no_ventilation: {
    title: { en: 'No ventilation detected', bn: 'ভেন্টিলেশন বন্ধ আছে' },
    getMessage: () => ({
      en: 'All ventilation fans appear to be off. Check fan connections.',
      bn: 'সব ভেন্টিলেশন ফ্যান বন্ধ মনে হচ্ছে। ফ্যানের সংযোগ চেক করুন।',
    }),
    getSuggestion: () => ({
      en: 'Manually check exhaust fans and power connections',
      bn: 'ম্যানুয়ালি এক্সহস্ট ফ্যান এবং পাওয়ার সংযোগ চেক করুন',
    }),
    level: 'danger',
  },
  sensor_failure: {
    title: { en: 'Sensor issue', bn: '🛠️ সেন্সর সমস্যা — খামার সেফটি মোডে চলছে' },
    getMessage: (data) => ({
      en: `${data?.sensor || 'A sensor'} not responding. Farm running in safety mode.`,
      bn: `${data?.sensorBn || 'একটি সেন্সর'} সাড়া দিচ্ছে না। খামার সেফটি মোডে চলছে।`,
    }),
    getSuggestion: () => ({
      en: 'Farm is safe. Check sensor connection when convenient.',
      bn: 'খামার নিরাপদ আছে। সুযোগে সেন্সর সংযোগ চেক করুন।',
    }),
    level: 'danger',
  },
  temperature_rising: {
    title: { en: 'Temperature slowly rising', bn: 'তাপমাত্রা ধীরে বাড়ছে' },
    getMessage: () => ({
      en: 'Temperature is gradually increasing. May need attention soon.',
      bn: 'তাপমাত্রা ধীরে ধীরে বাড়ছে। শীঘ্রই মনোযোগ দিতে হতে পারে।',
    }),
    getSuggestion: () => ({
      en: 'Monitor closely and prepare ventilation',
      bn: 'নজরে রাখুন এবং ভেন্টিলেশন প্রস্তুত রাখুন',
    }),
    level: 'info',
  },
  curtain_suggestion: {
    title: { en: 'Curtain adjustment suggested', bn: 'পর্দা সামঞ্জস্য করুন' },
    getMessage: () => ({
      en: 'Based on temperature difference, curtains may be opened slightly.',
      bn: 'তাপমাত্রার পার্থক্যের উপর ভিত্তি করে পর্দা সামান্য খোলা যেতে পারে।',
    }),
    getSuggestion: () => ({
      en: 'Open side curtains 10-20% for natural airflow',
      bn: 'প্রাকৃতিক বাতাসের জন্য পাশের পর্দা ১০-২০% খুলুন',
    }),
    level: 'info',
  },
  broiler_cold: {
    title: { en: 'Broiler too cold for age', bn: 'ব্রয়লার বয়স অনুযায়ী ঠান্ডা' },
    getMessage: (data) => ({
      en: `Temperature ${data?.temp || '--'}°C is below target ${data?.target || '--'}°C for ${data?.age || '--'} day old chicks.`,
      bn: `তাপমাত্রা ${data?.temp || '--'}°সে, ${data?.age || '--'} দিনের বাচ্চার জন্য টার্গেট ${data?.target || '--'}°সে।`,
    }),
    getSuggestion: () => ({
      en: 'Turn on heater immediately to maintain broiler temperature',
      bn: 'ব্রয়লারের তাপমাত্রা বজায় রাখতে এখনই হিটার চালু করুন',
    }),
    level: 'danger',
  },
  broiler_hot: {
    title: { en: 'Broiler too hot for age', bn: 'ব্রয়লার বয়স অনুযায়ী গরম' },
    getMessage: (data) => ({
      en: `Temperature ${data?.temp || '--'}°C is above target ${data?.target || '--'}°C for ${data?.age || '--'} day old chicks.`,
      bn: `তাপমাত্রা ${data?.temp || '--'}°সে, ${data?.age || '--'} দিনের বাচ্চার জন্য টার্গেট ${data?.target || '--'}°সে।`,
    }),
    getSuggestion: () => ({
      en: 'Turn off heater and increase ventilation',
      bn: 'হিটার বন্ধ করুন এবং ভেন্টিলেশন বাড়ান',
    }),
    level: 'warning',
  },
};

// Group related alerts together
function groupAlerts(alerts: SmartAlert[]): SmartAlert[] {
  const grouped: Map<string, SmartAlert[]> = new Map();
  const ungrouped: SmartAlert[] = [];

  // Group by type and time proximity (within 5 minutes)
  alerts.forEach(alert => {
    const groupKey = `${alert.level}_${Math.floor(alert.timestamp.getTime() / 300000)}`;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey)!.push(alert);
  });

  const result: SmartAlert[] = [];
  grouped.forEach((group, key) => {
    if (group.length > 2) {
      // Combine into single message
      const combinedAlert: SmartAlert = {
        ...group[0],
        id: `group_${key}`,
        groupId: key,
        title: `Multiple issues detected (${group.length})`,
        titleBn: `একাধিক সমস্যা শনাক্ত (${group.length}টি)`,
        message: group.map(a => a.title).join(', '),
        messageBn: group.map(a => a.titleBn).join(', '),
        suggestion: 'Check all systems and respond to the most critical issues first',
        suggestionBn: 'সব সিস্টেম চেক করুন এবং সবচেয়ে জরুরি সমস্যাগুলো আগে সমাধান করুন',
      };
      result.push(combinedAlert);
    } else {
      result.push(...group);
    }
  });

  return result.sort((a, b) => {
    // Sort by level (danger first) then by time
    const levelOrder = { danger: 0, warning: 1, info: 2 };
    if (levelOrder[a.level] !== levelOrder[b.level]) {
      return levelOrder[a.level] - levelOrder[b.level];
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
}

// Check if within quiet hours
function isQuietHours(): boolean {
  const hour = new Date().getHours();
  if (QUIET_HOURS.start > QUIET_HOURS.end) {
    // Spans midnight
    return hour >= QUIET_HOURS.start || hour < QUIET_HOURS.end;
  }
  return hour >= QUIET_HOURS.start && hour < QUIET_HOURS.end;
}

export function useSmartAlerts() {
  const { data: rawAlerts = [] } = useAlerts();
  const sensorData = useLiveSensorData();
  const { playDangerAlarm, playWarningSound } = useNotificationSound();
  const { language } = useAuth();
  const { isBroiler, isLayer } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const lastNotified = useRef<Map<string, number>>(new Map());
  const lastSoundPlayed = useRef<Map<AlertLevel, number>>(new Map());

  // Calculate broiler age
  const broilerAgeDays = useMemo(() => {
    if (!isBroiler || !activeBatch?.start_date) return 0;
    return differenceInDays(new Date(), parseISO(activeBatch.start_date));
  }, [isBroiler, activeBatch]);

  // Get broiler target temp range
  const broilerTempTarget = useMemo(() => {
    if (!isBroiler || broilerAgeDays <= 0) return null;
    return getBroilerTempRangeByDays(broilerAgeDays);
  }, [isBroiler, broilerAgeDays]);

  // Convert raw alerts to smart alerts
  const processAlerts = useCallback(() => {
    const processed: SmartAlert[] = rawAlerts.map(alert => {
      const template = ALERT_TEMPLATES[alert.alert_type] || ALERT_TEMPLATES['sensor_failure'];
      const msgData = template.getMessage({
        temp: sensorData?.temperature,
        humidity: sensorData?.humidity,
        ppm: sensorData?.ammonia,
        target: broilerTempTarget?.targetTemp,
        age: broilerAgeDays,
      });
      const suggestion = template.getSuggestion();

      return {
        id: alert.id,
        type: alert.alert_type,
        level: (alert.severity as AlertLevel) || template.level,
        title: template.title.en,
        titleBn: template.title.bn,
        message: msgData.en,
        messageBn: msgData.bn,
        suggestion: suggestion.en,
        suggestionBn: suggestion.bn,
        timestamp: new Date(alert.created_at),
        acknowledged: alert.acknowledged,
      };
    });

    // Add broiler-specific temperature alerts based on live sensor data
    if (isBroiler && broilerTempTarget && sensorData?.temperature) {
      const temp = sensorData.temperature;
      const target = broilerTempTarget.targetTemp;
      const tolerance = 2; // 2°C tolerance

      // Check if too cold for broiler age
      if (temp < target - tolerance) {
        const coldTemplate = ALERT_TEMPLATES['broiler_cold'];
        const coldMsg = coldTemplate.getMessage({ temp, target, age: broilerAgeDays });
        const coldSuggestion = coldTemplate.getSuggestion();
        
        processed.push({
          id: `broiler_cold_${Date.now()}`,
          type: 'broiler_cold',
          level: coldTemplate.level as AlertLevel,
          title: coldTemplate.title.en,
          titleBn: coldTemplate.title.bn,
          message: coldMsg.en,
          messageBn: coldMsg.bn,
          suggestion: coldSuggestion.en,
          suggestionBn: coldSuggestion.bn,
          timestamp: new Date(),
          acknowledged: false,
        });
      }

      // Check if too hot for broiler age
      if (temp > target + tolerance) {
        const hotTemplate = ALERT_TEMPLATES['broiler_hot'];
        const hotMsg = hotTemplate.getMessage({ temp, target, age: broilerAgeDays });
        const hotSuggestion = hotTemplate.getSuggestion();
        
        processed.push({
          id: `broiler_hot_${Date.now()}`,
          type: 'broiler_hot',
          level: hotTemplate.level as AlertLevel,
          title: hotTemplate.title.en,
          titleBn: hotTemplate.title.bn,
          message: hotMsg.en,
          messageBn: hotMsg.bn,
          suggestion: hotSuggestion.en,
          suggestionBn: hotSuggestion.bn,
          timestamp: new Date(),
          acknowledged: false,
        });
      }
    }

    return groupAlerts(processed);
  }, [rawAlerts, sensorData, isBroiler, broilerTempTarget, broilerAgeDays]);

  // Handle notifications with anti-spam
  const notify = useCallback((alert: SmartAlert) => {
    const now = Date.now();
    const lastTime = lastNotified.current.get(alert.type) || 0;
    const cooldown = ALERT_COOLDOWNS[alert.level];

    // Check anti-spam cooldown
    if (now - lastTime < cooldown) {
      return;
    }

    const quietMode = isQuietHours();

    // Play sound based on level and quiet hours
    if (alert.level === 'danger') {
      // Danger always plays, even in quiet hours
      const lastDanger = lastSoundPlayed.current.get('danger') || 0;
      if (now - lastDanger > 30000) { // Min 30s between sounds
        playDangerAlarm();
        lastSoundPlayed.current.set('danger', now);
      }
    } else if (!quietMode) {
      // Warning and info only during non-quiet hours
      if (alert.level === 'warning') {
        const lastWarning = lastSoundPlayed.current.get('warning') || 0;
        if (now - lastWarning > 60000) {
          playWarningSound();
          lastSoundPlayed.current.set('warning', now);
        }
      }
      // Info alerts are silent
    }

    lastNotified.current.set(alert.type, now);
  }, [playDangerAlarm, playWarningSound]);

  // Process and update alerts
  useEffect(() => {
    const processed = processAlerts();
    setSmartAlerts(processed);

    // Notify for unacknowledged alerts
    processed.forEach(alert => {
      if (!alert.acknowledged) {
        notify(alert);
      }
    });
  }, [processAlerts, notify]);

  // Get active (unresolved) alerts
  const activeAlerts = smartAlerts.filter(a => !a.acknowledged);
  const resolvedAlerts = smartAlerts.filter(a => a.acknowledged);

  // Get alert counts by level
  const alertCounts = {
    danger: activeAlerts.filter(a => a.level === 'danger').length,
    warning: activeAlerts.filter(a => a.level === 'warning').length,
    info: activeAlerts.filter(a => a.level === 'info').length,
    total: activeAlerts.length,
  };

  // Get most critical alert
  const criticalAlert = activeAlerts.find(a => a.level === 'danger') || 
                        activeAlerts.find(a => a.level === 'warning') ||
                        activeAlerts[0];

  return {
    alerts: smartAlerts,
    activeAlerts,
    resolvedAlerts,
    alertCounts,
    criticalAlert,
    isQuietHours: isQuietHours(),
    language,
  };
}

export default useSmartAlerts;
