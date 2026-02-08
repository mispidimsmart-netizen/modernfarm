import { AlertTriangle, Thermometer, Wind, Zap, Droplet, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface AlertData {
  id: string;
  type: 'temperature' | 'ammonia' | 'power' | 'water';
  severity: 'info' | 'warning' | 'danger';
  message: string;
  messageBn: string;
  timestamp: Date;
  acknowledged: boolean;
}

const alertIcons = {
  temperature: Thermometer,
  ammonia: Wind,
  power: Zap,
  water: Droplet,
};

interface AlertCardProps {
  alert: AlertData;
  onAcknowledge: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const { language } = useAuth();
  const Icon = alertIcons[alert.type];

  const getSeverityStyles = () => {
    switch (alert.severity) {
      case 'danger':
        return {
          card: 'alert-danger border-l-4 border-red-500',
          iconBg: 'bg-red-100 text-red-600',
          text: 'text-red-800',
          button: 'text-red-400 hover:bg-red-200 hover:text-red-600',
        };
      case 'warning':
        return {
          card: 'alert-warning border-l-4 border-amber-500',
          iconBg: 'bg-amber-100 text-amber-600',
          text: 'text-amber-800',
          button: 'text-amber-400 hover:bg-amber-200 hover:text-amber-600',
        };
      case 'info':
      default:
        return {
          card: 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500',
          iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
          text: 'text-blue-800 dark:text-blue-300',
          button: 'text-blue-400 hover:bg-blue-200 hover:text-blue-600',
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn('alert-card', styles.card)}
    >
      <div className={cn(
        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
        styles.iconBg
      )}>
        <Icon size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn('font-semibold', styles.text)}>
          {language === 'bn' ? alert.messageBn : alert.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {alert.timestamp.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US')}
        </p>
      </div>

      {!alert.acknowledged && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
            styles.button
          )}
        >
          <X size={18} />
        </button>
      )}
    </motion.div>
  );
}
