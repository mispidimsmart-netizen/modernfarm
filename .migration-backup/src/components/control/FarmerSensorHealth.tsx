import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Thermometer, Droplets, Wind } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useSensorValidation } from '@/hooks/useSensorValidation';
import { Card, CardContent } from '@/components/ui/card';

export function FarmerSensorHealth() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { issues } = useSensorValidation(sensorData);

  if (!hasRealData) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-dashed bg-muted/30">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              📡 {language === 'bn' ? 'সেন্সর ডেটা নেই — ESP32 কানেক্ট করুন' : 'No sensor data — connect ESP32'}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const sensors = useMemo(() => {
    const issueMap = new Map(issues.map((i) => [i.sensor, i]));

    const sensorList: { name: { bn: string; en: string }; icon: React.ElementType; sensor: 'temperature' | 'ammonia' | 'humidity' }[] = [
      {
        name: { bn: 'তাপমাত্রা সেন্সর', en: 'Temperature Sensor' },
        icon: Thermometer,
        sensor: 'temperature',
      },
      {
        name: { bn: 'গ্যাস সেন্সর', en: 'Gas Sensor' },
        icon: Wind,
        sensor: 'ammonia',
      },
      {
        name: { bn: 'আর্দ্রতা সেন্সর', en: 'Humidity Sensor' },
        icon: Droplets,
        sensor: 'humidity',
      },
    ];

    return sensorList.map((s) => {
      const issue = issueMap.get(s.sensor);
      return {
        ...s,
        ok: !issue,
        statusText: issue
          ? { bn: 'সংযোগ সমস্যা', en: 'Connection issue' }
          : { bn: 'ঠিক আছে', en: 'OK' },
      };
    });
  }, [issues]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {language === 'bn' ? 'সেন্সর স্বাস্থ্য' : 'Sensor Health'}
          </p>
          <div className="space-y-2.5">
            {sensors.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.sensor} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{s.name[language]}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className={`text-xs font-medium ${s.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {s.statusText[language]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
