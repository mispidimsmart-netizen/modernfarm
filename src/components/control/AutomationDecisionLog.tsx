import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, ListChecks } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { Card, CardContent } from '@/components/ui/card';

interface LogEntry {
  id: string;
  time: string;
  text: { bn: string; en: string };
}

export function AutomationDecisionLog() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const prevStateRef = useRef<{ fan: boolean; heater: boolean; temp: number; ammonia: number }>({
    fan: false,
    heater: false,
    temp: 0,
    ammonia: 0,
  });

  useEffect(() => {
    const prev = prevStateRef.current;
    const now = new Date().toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newEntries: LogEntry[] = [];

    // Fan turned on
    if (deviceStatus.fan && !prev.fan) {
      if (sensorData.temperature > 38) {
        newEntries.push({
          id: `${Date.now()}-fan-emergency`,
          time: now,
          text: { bn: 'অতিরিক্ত গরম — প্রাণ বাঁচাতে সর্বোচ্চ বাতাস দেওয়া হচ্ছে', en: 'Extreme heat — maximum ventilation for bird safety' },
        });
      } else if (sensorData.ammonia > 25) {
        newEntries.push({
          id: `${Date.now()}-fan-gas-danger`,
          time: now,
          text: { bn: 'গ্যাস বিপদসীমায় — জরুরি বাতাস দেওয়া হচ্ছে', en: 'Gas at danger level — emergency ventilation' },
        });
      } else if (sensorData.temperature > 32) {
        newEntries.push({
          id: `${Date.now()}-fan-heat`,
          time: now,
          text: { bn: 'গরম বেড়েছে, বাতাস বাড়ানো হয়েছে', en: 'Heat increased, ventilation raised' },
        });
      } else if (sensorData.ammonia > 15) {
        newEntries.push({
          id: `${Date.now()}-fan-gas`,
          time: now,
          text: { bn: 'গ্যাস বেড়েছে, তাজা বাতাস দেওয়া হচ্ছে', en: 'Gas rising, fresh air being supplied' },
        });
      } else {
        newEntries.push({
          id: `${Date.now()}-fan-on`,
          time: now,
          text: { bn: 'খামারে তাজা বাতাস দেওয়া শুরু হয়েছে', en: 'Fresh air supply started' },
        });
      }
    }

    // Fan turned off
    if (!deviceStatus.fan && prev.fan) {
      newEntries.push({
        id: `${Date.now()}-fan-off`,
        time: now,
        text: { bn: 'পরিবেশ স্বাভাবিক হয়েছে, বাতাস বন্ধ করা হয়েছে', en: 'Environment normalized, ventilation stopped' },
      });
    }

    // Heater turned on
    if (deviceStatus.heater && !prev.heater) {
      newEntries.push({
        id: `${Date.now()}-heater-on`,
        time: now,
        text: { bn: 'ঠান্ডা বেড়েছে, হিটার দিয়ে গরম করা হচ্ছে', en: 'Cold detected, heating in progress' },
      });
    }

    // Heater turned off
    if (!deviceStatus.heater && prev.heater) {
      newEntries.push({
        id: `${Date.now()}-heater-off`,
        time: now,
        text: { bn: 'তাপমাত্রা স্বাভাবিক হয়েছে, হিটার বন্ধ করা হয়েছে', en: 'Temperature normalized, heater stopped' },
      });
    }

    if (newEntries.length > 0) {
      setEntries((e) => [...newEntries, ...e].slice(0, 10));
    }

    prevStateRef.current = {
      fan: deviceStatus.fan,
      heater: deviceStatus.heater ?? false,
      temp: sensorData.temperature,
      ammonia: sensorData.ammonia,
    };
  }, [deviceStatus.fan, deviceStatus.heater, sensorData.temperature, sensorData.ammonia, language]);

  // Seed initial entry on mount
  useEffect(() => {
    const now = new Date().toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setEntries([{
      id: 'init',
      time: now,
      text: { bn: 'সিস্টেম পর্যবেক্ষণ শুরু', en: 'System monitoring started' },
    }]);
  }, [language]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {language === 'bn' ? 'সিস্টেম কি করছে' : 'System Actions'}
            </p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-start gap-2.5 text-sm ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="font-mono text-xs shrink-0">{entry.time}</span>
                <span className="text-xs">— {entry.text[language]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
