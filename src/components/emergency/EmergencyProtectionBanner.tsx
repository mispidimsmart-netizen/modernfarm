import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEmergencyProtection, EmergencyPriority } from '@/hooks/useEmergencyProtection';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// localStorage so dismiss persists across reloads and works offline.
// Key encodes the active-event signature → if a new emergency arrives,
// or priority escalates, the banner auto-resurfaces.
const DISMISS_KEY = 'emergency-banner-dismissed-sig';

const PRIORITY_CONFIG: Record<EmergencyPriority, {
  gradient: string;
  border: string;
  icon: React.ElementType;
  label: { en: string; bn: string };
  dot: string;
}> = {
  INFO: {
    gradient: 'from-blue-600 via-blue-500 to-blue-600',
    border: 'border-blue-400/50',
    icon: ShieldCheck,
    label: { en: 'INFO', bn: 'তথ্য' },
    dot: 'bg-blue-400',
  },
  WARNING: {
    gradient: 'from-amber-600 via-yellow-500 to-amber-600',
    border: 'border-amber-400/50',
    icon: AlertTriangle,
    label: { en: 'WARNING', bn: 'সতর্কতা' },
    dot: 'bg-amber-400',
  },
  CRITICAL: {
    gradient: 'from-orange-600 via-red-500 to-orange-600',
    border: 'border-orange-400/50',
    icon: ShieldAlert,
    label: { en: 'CRITICAL', bn: 'সংকটপূর্ণ' },
    dot: 'bg-orange-400',
  },
  LIFE_THREATENING: {
    gradient: 'from-red-700 via-red-600 to-rose-700',
    border: 'border-red-500/60',
    icon: ShieldAlert,
    label: { en: 'LIFE THREATENING', bn: 'জীবন হুমকি' },
    dot: 'bg-red-400',
  },
};

export function EmergencyProtectionBanner() {
  const { language } = useAuth();
  const { activeEvents, highestPriority, acknowledgeEvent, resolveEvent, isEmergency } = useEmergencyProtection();
  const [expanded, setExpanded] = useState(false);
  const [dismissedSig, setDismissedSig] = useState<string | null>(null);

  // Signature = priority + sorted active event ids. New event / escalation → new sig → re-show.
  const signature = useMemo(() => {
    if (!highestPriority || activeEvents.length === 0) return '';
    const ids = activeEvents.map(e => e.id).sort().join(',');
    return `${highestPriority}:${ids}`;
  }, [activeEvents, highestPriority]);

  // Load persisted dismiss
  useEffect(() => {
    try {
      setDismissedSig(localStorage.getItem(DISMISS_KEY));
    } catch {
      // ignore
    }
  }, []);

  const hasBanner = activeEvents.length > 0 && !!highestPriority;

  const config = PRIORITY_CONFIG[highestPriority];
  const Icon = config.icon;
  const isLifeThreatening = highestPriority === 'LIFE_THREATENING';

  // Safety guard: never allow dismissal of LIFE_THREATENING — too dangerous to hide.
  const canDismiss = !isLifeThreatening;
  if (canDismiss && dismissedSig && dismissedSig === signature) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, signature);
    } catch {
      // ignore
    }
    setDismissedSig(signature);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-r shadow-lg border h-full flex flex-col',
        config.gradient,
        config.border,
      )}
    >
      {/* Pulse overlay for life-threatening */}
      {isLifeThreatening && (
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 bg-white/10"
        />
      )}

      <div className="relative z-10 px-4 py-3">
        {/* Header row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: isEmergency ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.8, repeat: isEmergency ? Infinity : 0 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"
            >
              <Icon className="h-6 w-6 text-white" />
            </motion.div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full animate-pulse', config.dot)} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                  {config.label[language]}
                </span>
              </div>
              <p className="text-sm font-bold text-white leading-tight mt-0.5">
                {language === 'bn'
                  ? `${activeEvents.length}টি ইমার্জেন্সি সক্রিয়`
                  : `${activeEvents.length} Emergency Event${activeEvents.length > 1 ? 's' : ''} Active`
                }
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-white/70" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/70" />
          )}
        </button>

        {canDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={language === 'bn' ? 'ব্যানার বন্ধ করুন' : 'Dismiss banner'}
            className="absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-md bg-white/15 hover:bg-white/30 transition-colors text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Expanded event list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              {activeEvents.slice(0, 5).map((event) => {
                const eventConfig = PRIORITY_CONFIG[event.priority as EmergencyPriority] || PRIORITY_CONFIG.WARNING;
                return (
                  <div
                    key={event.id}
                    className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2.5 border border-white/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={cn('h-1.5 w-1.5 rounded-full', eventConfig.dot)} />
                          <span className="text-[9px] font-bold uppercase text-white/60">
                            {event.priority} • {event.trigger_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white leading-tight">
                          {language === 'bn' ? event.title_bn : event.title}
                        </p>
                        {(event.description || event.description_bn) && (
                          <p className="text-[10px] text-white/70 mt-0.5">
                            {language === 'bn' ? event.description_bn : event.description}
                          </p>
                        )}
                        {/* Actions taken */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(event.actions_taken as string[])?.map((action) => (
                            <span key={action} className="rounded-full bg-white/15 px-2 py-0.5 text-[8px] font-medium text-white/80">
                              {action.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {event.status === 'active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              acknowledgeEvent(event.id);
                            }}
                            className="h-7 w-7 p-0 text-white/70 hover:bg-white/20 hover:text-white"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveEvent(event.id);
                          }}
                          className="h-7 w-7 p-0 text-white/70 hover:bg-white/20 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[9px] text-white/40 mt-1">
                      {new Date(event.created_at).toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US')}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
