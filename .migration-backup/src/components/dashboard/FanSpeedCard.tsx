import { Card, CardContent } from '@/components/ui/card';
import { Fan } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { FanSpeed, getFanSpeedColor, getFanSpeedBgColor } from '@/lib/fanSpeed';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FanSpeedCardProps {
  temperature: number | null;
  fanSpeed: FanSpeed;
  message: string;
}

export function FanSpeedCard({ temperature, fanSpeed, message }: FanSpeedCardProps) {
  const { language } = useAuth();
  const { hasRealData } = useRealtimeSensorData();

  if (!hasRealData) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <Fan className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
          <p className="text-sm font-medium text-muted-foreground">
            {language === 'bn' ? 'ফ্যান স্পিড — সেন্সর ডেটা নেই' : 'Fan Speed — No sensor data'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSpeedLabel = (speed: FanSpeed) => {
    const labels = {
      OFF: { bn: 'বন্ধ', en: 'OFF' },
      LOW: { bn: 'নিম্ন', en: 'LOW' },
      MEDIUM: { bn: 'মাঝারি', en: 'MEDIUM' },
      HIGH: { bn: 'সর্বোচ্চ', en: 'HIGH' },
    };
    return labels[speed][language];
  };

  const getAnimationSpeed = (speed: FanSpeed) => {
    switch (speed) {
      case 'OFF': return 0;
      case 'LOW': return 3;
      case 'MEDIUM': return 1.5;
      case 'HIGH': return 0.5;
      default: return 0;
    }
  };

  const animationDuration = getAnimationSpeed(fanSpeed);

  return (
    <Card className={cn('overflow-hidden', getFanSpeedBgColor(fanSpeed))}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={fanSpeed !== 'OFF' ? { rotate: 360 } : { rotate: 0 }}
              transition={fanSpeed !== 'OFF' ? {
                duration: animationDuration,
                repeat: Infinity,
                ease: 'linear'
              } : {}}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl',
                fanSpeed !== 'OFF' ? 'bg-white/50 dark:bg-white/10' : 'bg-muted'
              )}
            >
              <Fan className={cn('h-6 w-6', getFanSpeedColor(fanSpeed))} />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'ফ্যান স্পিড' : 'Fan Speed'}
              </p>
              <p className={cn('text-2xl font-bold', getFanSpeedColor(fanSpeed))}>
                {getSpeedLabel(fanSpeed)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'তাপমাত্রা' : 'Temperature'}
            </p>
            <p className="text-lg font-semibold">
              {temperature !== null ? `${temperature.toFixed(1)}°C` : '--'}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}
