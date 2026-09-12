import { motion } from 'framer-motion';
import { Clock, CheckCircle2, AlertTriangle, AlertCircle, Info, LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { SmartAlert, AlertLevel } from '@/hooks/useSmartAlerts';

interface AlertTimelineProps {
  alerts: SmartAlert[];
}

const levelIcons: Record<AlertLevel, LucideIcon> = {
  danger: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const levelColors: Record<AlertLevel, string> = {
  danger: 'text-destructive bg-destructive/10',
  warning: 'text-amber-500 bg-amber-100 dark:bg-amber-900/50',
  info: 'text-primary bg-primary/10',
};

export function AlertTimeline({ alerts }: AlertTimelineProps) {
  const { language } = useAuth();

  const formatDateTime = (date: Date) => {
    return date.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const diff = endTime.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (language === 'bn') {
      if (minutes < 60) return `${minutes} মিনিট`;
      return `${hours} ঘন্টা ${minutes % 60} মিনিট`;
    }

    if (minutes < 60) return `${minutes}m`;
    return `${hours}h ${minutes % 60}m`;
  };

  // Group alerts by date
  const groupedAlerts: Record<string, SmartAlert[]> = {};
  alerts.forEach(alert => {
    const dateKey = alert.timestamp.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US');
    if (!groupedAlerts[dateKey]) {
      groupedAlerts[dateKey] = [];
    }
    groupedAlerts[dateKey].push(alert);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedAlerts).map(([date, dateAlerts]) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {date}
          </h3>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 h-full w-0.5 bg-border" />

            <div className="space-y-4">
              {dateAlerts.map((alert, index) => {
                const Icon = levelIcons[alert.level];
                const isResolved = alert.acknowledged;

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-10"
                  >
                    {/* Timeline dot */}
                    <div className={cn(
                      'absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full',
                      levelColors[alert.level]
                    )}>
                      <Icon size={12} />
                    </div>

                    {/* Alert content */}
                    <div className={cn(
                      'rounded-lg border bg-card p-3',
                      isResolved && 'opacity-60'
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">
                            {language === 'bn' ? alert.titleBn : alert.title}
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {language === 'bn' ? alert.messageBn : alert.message}
                          </p>
                        </div>

                        {isResolved && (
                          <CheckCircle2 size={16} className="flex-shrink-0 text-green-500" />
                        )}
                      </div>

                      {/* Time info */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateTime(alert.timestamp)}
                        </span>
                        {isResolved && alert.resolvedAt && (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 size={12} />
                            {language === 'bn' ? 'সমাধান: ' : 'Resolved: '}
                            {calculateDuration(alert.timestamp, alert.resolvedAt)}
                          </span>
                        )}
                        {!isResolved && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            {language === 'bn' ? 'চলমান: ' : 'Ongoing: '}
                            {calculateDuration(alert.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {alerts.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          {language === 'bn' ? 'কোনো ইতিহাস নেই' : 'No history available'}
        </div>
      )}
    </div>
  );
}

export default AlertTimeline;
