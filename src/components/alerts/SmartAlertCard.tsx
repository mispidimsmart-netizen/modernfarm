import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Thermometer, 
  Wind, 
  Zap, 
  Droplet, 
  X,
  Lightbulb,
  Clock,
  CheckCircle2,
  Eye,
  ShieldAlert,
  ShieldCheck,
  LucideIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { SmartAlert, AlertLevel } from '@/hooks/useSmartAlerts';

interface SmartAlertCardProps {
  alert: SmartAlert;
  onAcknowledge: (id: string) => void;
  showTimeline?: boolean;
}

const alertIcons: Record<string, LucideIcon> = {
  temperature: Thermometer,
  high_temperature: Thermometer,
  extreme_cold: Thermometer,
  heat_stress: Thermometer,
  ammonia: Wind,
  high_ammonia: Wind,
  ammonia_danger: Wind,
  power: Zap,
  power_failure: Zap,
  water: Droplet,
  low_water: Droplet,
  humidity: Droplet,
  high_humidity: Droplet,
  default: AlertTriangle,
};

const levelStyles: Record<AlertLevel, {
  card: string;
  iconBg: string;
  text: string;
  button: string;
  badge: string;
}> = {
  danger: {
    card: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30',
    iconBg: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
    text: 'text-red-800 dark:text-red-300',
    button: 'text-red-400 hover:bg-red-200 hover:text-red-600',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  warning: {
    card: 'border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-300',
    button: 'text-amber-400 hover:bg-amber-200 hover:text-amber-600',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  info: {
    card: 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-300',
    button: 'text-blue-400 hover:bg-blue-200 hover:text-blue-600',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
};

const levelLabels: Record<AlertLevel, { en: string; bn: string }> = {
  danger: { en: 'Urgent', bn: 'জরুরি' },
  warning: { en: 'Warning', bn: 'সতর্কতা' },
  info: { en: 'Info', bn: 'তথ্য' },
};

// Alert types where system handles automatically (no user action needed)
const AUTO_HANDLED_TYPES = new Set([
  'high_temperature', 'heat_stress', 'high_ammonia', 'ammonia_danger',
  'power_restored', 'high_humidity', 'temperature_rising',
]);

// Alert types that need human attention (look at it)
const ATTENTION_TYPES = new Set([
  'low_water', 'curtain_suggestion', 'broiler_hot', 'sensor_failure',
]);

// Alert types requiring urgent human action
const ACTION_REQUIRED_TYPES = new Set([
  'power_failure', 'extreme_cold', 'broiler_cold', 'no_ventilation',
]);

function getActionIndicator(alertType: string, language: 'bn' | 'en'): {
  text: string;
  icon: LucideIcon;
  color: string;
} {
  if (ACTION_REQUIRED_TYPES.has(alertType)) {
    return {
      text: language === 'bn' ? '⚡ দ্রুত ব্যবস্থা নিন' : '⚡ Take action now',
      icon: ShieldAlert,
      color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50',
    };
  }
  if (ATTENTION_TYPES.has(alertType)) {
    return {
      text: language === 'bn' ? '👁️ একবার দেখে নিন' : '👁️ Check once',
      icon: Eye,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50',
    };
  }
  // Auto-handled or default
  return {
    text: language === 'bn' ? '✅ আপনার কিছু করার প্রয়োজন নেই' : '✅ No action needed',
    icon: ShieldCheck,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50',
  };
}

function getAlertStatusLabel(alert: SmartAlert, language: 'bn' | 'en'): {
  text: string;
  color: string;
} {
  if (alert.resolvedAt) {
    return {
      text: language === 'bn' ? '✅ সমাধান হয়েছে' : '✅ Resolved',
      color: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  
  const now = new Date();
  const diff = now.getTime() - alert.timestamp.getTime();
  const minutesAgo = diff / 60000;
  
  if (minutesAgo < 30) {
    return {
      text: language === 'bn' ? '🔴 এখন চলছে' : '🔴 Ongoing',
      color: 'text-red-600 dark:text-red-400',
    };
  }
  
  return {
    text: language === 'bn' ? '⏱️ আগে হয়েছিল' : '⏱️ Past event',
    color: 'text-muted-foreground',
  };
}

export function SmartAlertCard({ alert, onAcknowledge, showTimeline = false }: SmartAlertCardProps) {
  const { language } = useAuth();
  const Icon = alertIcons[alert.type] || alertIcons.default;
  const styles = levelStyles[alert.level];
  const actionIndicator = useMemo(() => getActionIndicator(alert.type, language), [alert.type, language]);
  const alertStatus = useMemo(() => getAlertStatusLabel(alert, language), [alert, language]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (language === 'bn') {
      if (minutes < 1) return 'এইমাত্র';
      if (minutes < 60) return `${minutes} মিনিট আগে`;
      if (hours < 24) return `${hours} ঘন্টা আগে`;
      return date.toLocaleDateString('bn-BD');
    }

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-US');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn('rounded-xl p-4 shadow-sm', styles.card)}
    >
      {/* Header with Icon and Badge */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          styles.iconBg
        )}>
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Level Badge + Status */}
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', styles.badge)}>
              {levelLabels[alert.level][language]}
            </span>
            <span className={cn('text-xs font-medium', alertStatus.color)}>
              {alertStatus.text}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={12} />
              {formatTime(alert.timestamp)}
            </span>
          </div>

          {/* Title */}
          <h4 className={cn('font-semibold', styles.text)}>
            {language === 'bn' ? alert.titleBn : alert.title}
          </h4>

          {/* Message */}
          <p className="mt-1 text-sm text-muted-foreground">
            {language === 'bn' ? alert.messageBn : alert.message}
          </p>

          {/* Suggestion */}
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-background/50 p-2">
            <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-primary" />
            <p className="text-sm font-medium text-foreground">
              {language === 'bn' ? alert.suggestionBn : alert.suggestion}
            </p>
          </div>

          {/* Action Indicator */}
          <div className={cn('mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold', actionIndicator.color)}>
            <actionIndicator.icon size={14} />
            <span>{actionIndicator.text}</span>
          </div>

          {/* Timeline info */}
          {showTimeline && alert.resolvedAt && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 size={12} className="text-green-500" />
              <span>
                {language === 'bn' ? 'সমাধান হয়েছে: ' : 'Resolved: '}
                {formatTime(alert.resolvedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Acknowledge button */}
        {!alert.acknowledged && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              styles.button
            )}
            title={language === 'bn' ? 'বাতিল করুন' : 'Dismiss'}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default SmartAlertCard;
