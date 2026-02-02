import { AlertTriangle, Thermometer, Wind, Zap, Droplet, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Alert } from '@/lib/types';
import { cn } from '@/lib/utils';

const alertIcons = {
  temperature: Thermometer,
  ammonia: Wind,
  power: Zap,
  water: Droplet,
};

interface AlertCardProps {
  alert: Alert;
  onAcknowledge: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const { language } = useApp();
  const Icon = alertIcons[alert.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'alert-card',
        alert.severity === 'danger' ? 'alert-danger' : 'alert-warning'
      )}
    >
      <div className={cn(
        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
        alert.severity === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
      )}>
        <Icon size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn(
          'font-semibold',
          alert.severity === 'danger' ? 'text-red-800' : 'text-amber-800'
        )}>
          {language === 'bn' ? alert.messageBn : alert.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {alert.timestamp.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US')}
        </p>
      </div>

      <button
        onClick={() => onAcknowledge(alert.id)}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          alert.severity === 'danger' 
            ? 'text-red-400 hover:bg-red-200 hover:text-red-600' 
            : 'text-amber-400 hover:bg-amber-200 hover:text-amber-600'
        )}
      >
        <X size={18} />
      </button>
    </motion.div>
  );
}
