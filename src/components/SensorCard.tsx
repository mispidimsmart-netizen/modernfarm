import { LucideIcon, Thermometer, Droplets, Wind, Droplet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { StatusLevel } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SensorCardProps {
  type: 'temperature' | 'humidity' | 'ammonia' | 'water';
  value: number;
  unit: string;
  label: string;
  status: StatusLevel;
}

const sensorIcons: Record<string, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplets,
  ammonia: Wind,
  water: Droplet,
};

const sensorColors: Record<string, string> = {
  temperature: 'text-sensor-temperature',
  humidity: 'text-sensor-humidity',
  ammonia: 'text-sensor-ammonia',
  water: 'text-sensor-water',
};

const statusColors: Record<StatusLevel, string> = {
  normal: 'bg-status-normal',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
};

const statusBgColors: Record<StatusLevel, string> = {
  normal: 'bg-green-50 border-green-200',
  warning: 'bg-amber-50 border-amber-200',
  danger: 'bg-red-50 border-red-200',
};

export function SensorCard({ type, value, unit, label, status }: SensorCardProps) {
  const { language } = useApp();
  const Icon = sensorIcons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'sensor-card relative border',
        statusBgColors[status]
      )}
    >
      {/* Status indicator dot */}
      <div className={cn(
        'absolute right-3 top-3 h-3 w-3 rounded-full',
        statusColors[status],
        status === 'danger' && 'animate-pulse'
      )} />

      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm',
          sensorColors[type]
        )}>
          <Icon size={24} />
        </div>

        <div className="flex-1">
          <p className="text-sensor-label">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sensor-value">{value.toFixed(1)}</span>
            <span className="text-base font-medium text-muted-foreground">{unit}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
