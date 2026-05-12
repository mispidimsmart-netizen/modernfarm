import { motion } from 'framer-motion';
import { 
  Thermometer, Wind, Zap, Droplet, AlertTriangle,
  Clock, CheckCircle2, Eye, AlertCircle, ShieldCheck,
  LucideIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { SmartAlert, AlertLevel } from '@/hooks/useSmartAlerts';

interface IndustrialAlertCardProps {
  alert: SmartAlert;
  onAcknowledge: (id: string) => void;
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
  power_restored: Zap,
  water: Droplet,
  low_water: Droplet,
  humidity: Droplet,
  high_humidity: Droplet,
  sensor_failure: AlertTriangle,
  broiler_cold: Thermometer,
  broiler_hot: Thermometer,
  default: AlertTriangle,
};

// Action indicator config
interface ActionIndicator {
  icon: LucideIcon;
  label: { bn: string; en: string };
  color: string;
}

const ACTION_INDICATORS: Record<AlertLevel, ActionIndicator> = {
  info: {
    icon: CheckCircle2,
    label: { bn: '✔ নিজে ঠিক হয়েছে', en: '✔ Auto-resolved' },
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
  },
  warning: {
    icon: Eye,
    label: { bn: '⚠ দেখে নিন', en: '⚠ Check it' },
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
  },
  danger: {
    icon: AlertCircle,
    label: { bn: '❗ দ্রুত দেখুন', en: '❗ Act now' },
    color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
  },
};

const LEVEL_STYLES: Record<AlertLevel, {
  card: string;
  iconBg: string;
}> = {
  info: {
    card: 'border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  },
  warning: {
    card: 'border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
  },
  danger: {
    card: 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-500/20',
    iconBg: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 animate-pulse',
  },
};

// Get farmer-friendly "what system is doing" explanation
function getSystemAction(alert: SmartAlert, lang: 'bn' | 'en'): string {
  const actions: Record<string, { bn: string; en: string }> = {
    high_temperature: { bn: 'সিস্টেম ঠান্ডা করছে', en: 'System is cooling' },
    heat_stress: { bn: 'সর্বোচ্চ বাতাস দেওয়া হচ্ছে', en: 'Maximum ventilation active' },
    extreme_cold: { bn: 'হিটার চালু করা হচ্ছে', en: 'Heater activating' },
    high_ammonia: { bn: 'বাতাস দেওয়া হচ্ছে', en: 'Ventilation running' },
    ammonia_danger: { bn: 'সর্বোচ্চ বাতাস দেওয়া হচ্ছে', en: 'Maximum ventilation active' },
    power_failure: { bn: 'ব্যাকআপে চলছে', en: 'Running on backup' },
    power_restored: { bn: 'খামার পরিষ্কার করা হচ্ছে', en: 'Farm purge running' },
    sensor_failure: { bn: 'সেফটি মোড চালু আছে', en: 'Safety mode active' },
    low_water: { bn: 'পানির লাইন চেক করুন', en: 'Check water lines' },
    high_humidity: { bn: 'ভেন্টিলেশন বাড়ানো হচ্ছে', en: 'Increasing ventilation' },
    broiler_cold: { bn: 'হিটার চালু করুন', en: 'Turn on heater' },
    broiler_hot: { bn: 'হিটার বন্ধ ও ভেন্টিলেশন', en: 'Heater off, ventilating' },
    temperature_rising: { bn: 'নজরে রাখা হচ্ছে', en: 'Monitoring' },
    curtain_suggestion: { bn: 'পর্দা সামঞ্জস্য করুন', en: 'Adjust curtains' },
    no_ventilation: { bn: 'ফ্যান সংযোগ চেক করুন', en: 'Check fan connections' },
  };
  const action = actions[alert.type];
  return action ? action[lang] : (lang === 'bn' ? 'সিস্টেম কাজ করছে' : 'System is working');
}

// Does the user need to act?
function getNeedToAct(alert: SmartAlert, lang: 'bn' | 'en'): string {
  if (alert.level === 'info') {
    return lang === 'bn' ? 'আপনার কিছু করার প্রয়োজন নেই' : 'No action needed';
  }
  if (alert.level === 'warning') {
    return lang === 'bn' ? 'সুযোগে দেখে নিন' : 'Check when convenient';
  }
  return lang === 'bn' ? 'যত তাড়াতাড়ি সম্ভব দেখুন' : 'Check as soon as possible';
}

export function IndustrialAlertCard({ alert, onAcknowledge }: IndustrialAlertCardProps) {
  const { language } = useAuth();
  const Icon = alertIcons[alert.type] || alertIcons.default;
  const styles = LEVEL_STYLES[alert.level];
  const actionIndicator = ACTION_INDICATORS[alert.level];
  const ActionIcon = actionIndicator.icon;
  const isGrouped = !!alert.childAlerts && alert.childAlerts.length > 0;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (language === 'bn') {
      if (minutes < 1) return 'এখন চলছে';
      if (minutes < 60) return `${minutes} মিনিট আগে`;
      if (hours < 24) return `${hours} ঘন্টা আগে`;
      return date.toLocaleDateString('bn-BD');
    }
    if (minutes < 1) return 'Active now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-US');
  };

  const formatResponse = (secs: number) => {
    if (secs < 60) return language === 'bn' ? `${secs} সেকেন্ডে` : `in ${secs}s`;
    const m = Math.floor(secs / 60);
    if (m < 60) return language === 'bn' ? `${m} মিনিটে` : `in ${m}m`;
    const h = Math.floor(m / 60);
    return language === 'bn' ? `${h} ঘন্টায়` : `in ${h}h`;
  };

  const timeStatus = alert.acknowledged
    ? (language === 'bn' ? 'সমাধান হয়েছে' : 'Resolved')
    : formatTime(alert.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn('rounded-xl p-4 shadow-sm', styles.card)}
    >
      {/* Row 1: Icon + Message */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          styles.iconBg
        )}>
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-foreground text-sm">
            {language === 'bn' ? alert.titleBn : alert.title}
          </h4>

          {/* Row 2: What system is doing */}
          <p className="mt-1 text-sm text-muted-foreground">
            {getSystemAction(alert, language)}
          </p>

          {/* Row 3: Do you need to act? */}
          <p className="mt-1 text-xs text-muted-foreground italic">
            {getNeedToAct(alert, language)}
          </p>
        </div>
      </div>

      {/* Grouped alert details — show what each issue was */}
      {isGrouped && (
        <div className="mt-3 space-y-1.5 rounded-lg bg-background/60 dark:bg-background/30 p-2.5 border border-border/50">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
            {language === 'bn' ? '📋 বিস্তারিত:' : '📋 Details:'}
          </p>
          {/* Show unique issue types with counts */}
          {(() => {
            const typeCounts = new Map<string, { count: number; alert: SmartAlert }>();
            alert.childAlerts!.forEach(child => {
              const existing = typeCounts.get(child.type);
              if (existing) {
                existing.count++;
              } else {
                typeCounts.set(child.type, { count: 1, alert: child });
              }
            });
            return Array.from(typeCounts.entries()).map(([type, { count, alert: childAlert }]) => {
              const ChildIcon = alertIcons[type] || alertIcons.default;
              const systemAction = getSystemAction(childAlert, language);
              return (
                <div key={type} className="flex items-start gap-2 text-xs">
                  <ChildIcon size={12} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">
                      {language === 'bn' ? childAlert.titleBn : childAlert.title}
                      {count > 1 && (
                        <span className="text-muted-foreground font-normal"> ({count}×)</span>
                      )}
                    </span>
                    <span className="text-muted-foreground"> → {systemAction}</span>
                  </div>
                  <span className="flex-shrink-0 text-emerald-600 dark:text-emerald-400 text-[10px]">
                    ✓ {language === 'bn' ? 'সামলানো হয়েছে' : 'Handled'}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Footer: Action indicator + Time */}
      <div className="mt-3 flex items-center justify-between">
        <span className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
          actionIndicator.color
        )}>
          <ActionIcon size={12} />
          {actionIndicator.label[language]}
        </span>

        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={12} />
          {timeStatus}
        </span>
      </div>

      {/* Acknowledge button */}
      {!alert.acknowledged && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="mt-3 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          {language === 'bn' ? '✓ দেখেছি' : '✓ Got it'}
        </button>
      )}
    </motion.div>
  );
}

export default IndustrialAlertCard;
