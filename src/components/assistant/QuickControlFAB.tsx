import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Fan, Flame, Lightbulb, X, Loader2, Droplets, ArrowUpFromDot, Bot, Hand } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { useAutomationMode } from '@/hooks/useAutomationMode';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface QuickAction {
  key: 'fan' | 'heater' | 'light' | 'ceiling_fan' | 'sprinkler';
  icon: React.ElementType;
  label: { bn: string; en: string };
  activeColor: string;
  activeGlow: string;
}

const actions: QuickAction[] = [
  {
    key: 'fan',
    icon: Fan,
    label: { bn: 'ফ্যান', en: 'Fan' },
    activeColor: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    activeGlow: 'shadow-cyan-500/50',
  },
  {
    key: 'ceiling_fan',
    icon: Fan,
    label: { bn: 'সিলিং', en: 'Ceiling' },
    activeColor: 'bg-gradient-to-br from-violet-500 to-purple-600',
    activeGlow: 'shadow-violet-500/50',
  },
  {
    key: 'heater',
    icon: Flame,
    label: { bn: 'হিটার', en: 'Heater' },
    activeColor: 'bg-gradient-to-br from-orange-500 to-red-600',
    activeGlow: 'shadow-orange-500/50',
  },
  {
    key: 'light',
    icon: Lightbulb,
    label: { bn: 'লাইট', en: 'Light' },
    activeColor: 'bg-gradient-to-br from-amber-500 to-yellow-600',
    activeGlow: 'shadow-amber-500/50',
  },
  {
    key: 'sprinkler',
    icon: ArrowUpFromDot,
    label: { bn: 'স্প্রিংকলার', en: 'Sprinkler' },
    activeColor: 'bg-gradient-to-br from-sky-500 to-blue-600',
    activeGlow: 'shadow-sky-500/50',
  },
];

export function QuickControlFAB() {
  const { language } = useAuth();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { mutateAsync: sendCommand, isPending } = useSendDeviceCommand();
  const { data: automationMode } = useAutomationMode();
  const isManualMode = automationMode === 'MANUAL';
  const [isOpen, setIsOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleToggle = async (key: QuickAction['key']) => {
    setLoadingKey(key);
    
    const currentState = getDeviceState(key);
    const newState = !currentState;
    
    try {
      await sendCommand({
        commandType: key,
        commandValue: newState,
        deviceName: 'Shed A',
      });
    } catch (error) {
      toast.error(language === 'bn' ? 'কমান্ড পাঠাতে ব্যর্থ' : 'Failed to send command');
    } finally {
      setLoadingKey(null);
    }
  };

  const getDeviceState = (key: QuickAction['key']) => {
    switch (key) {
      case 'fan': return deviceStatus.fan;
      case 'heater': return deviceStatus.heater;
      case 'light': return deviceStatus.light;
      case 'ceiling_fan': return deviceStatus.ceilingFan;
      case 'sprinkler': return deviceStatus.sprinkler;
      default: return false;
    }
  };

  const activeCount = [deviceStatus.fan, deviceStatus.heater, deviceStatus.light, deviceStatus.ceilingFan, deviceStatus.sprinkler].filter(Boolean).length;

  return (
    <div className="fixed bottom-safe-dock right-safe z-50">{/* above SmartActionDock + BottomNav, respects safe-area */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-14 right-0 flex flex-col gap-2.5 items-end"
          >
            {actions.map((action, index) => {
              const Icon = action.icon;
              const isActive = getDeviceState(action.key);
              const isActionLoading = loadingKey === action.key;
              
              return (
                <motion.div
                  key={action.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <span className={cn(
                    'text-[11px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm whitespace-nowrap',
                    isActive
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-emerald-500/40'
                      : 'bg-muted/80 text-muted-foreground'
                  )}>
                    {action.label[language]}
                    {isActive && <span className="ml-1 text-emerald-500">●</span>}
                  </span>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isActionLoading || isPending}
                    onClick={() => handleToggle(action.key)}
                    aria-label={action.label[language]}
                    className={cn(
                      'h-10 w-10 rounded-full shadow-md transition-all',
                      isActive
                        ? `${action.activeColor} text-white ${action.activeGlow} ring-2 ring-white/40`
                        : 'bg-background border border-border hover:bg-muted'
                    )}
                  >
                    {isActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className={cn(
                        'h-4 w-4',
                        isActive && (action.key === 'fan' || action.key === 'ceiling_fan') && 'animate-spin'
                      )}
                        style={isActive && (action.key === 'fan' || action.key === 'ceiling_fan') ? { animationDuration: '1s' } : undefined}
                      />
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? (language === 'bn' ? 'বন্ধ করুন' : 'Close') : (language === 'bn' ? 'কুইক অ্যাকশন' : 'Quick actions')}
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all',
          isOpen
            ? 'bg-muted text-foreground rotate-45'
            : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/30'
        )}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Zap className="h-5 w-5" />
        )}
        
        {/* Pulse indicator when devices are active */}
        {!isOpen && activeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 items-center justify-center text-[8px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          </span>
        )}
        
        {/* Mode indicator badge */}
        {!isOpen && (
          <span className={`absolute -bottom-1 -left-1 flex items-center justify-center h-5 w-5 rounded-full text-[8px] font-bold ${
            isManualMode 
              ? 'bg-amber-500 text-white' 
              : 'bg-emerald-600 text-white'
          }`}>
            {isManualMode ? (
              <Hand className="h-3 w-3" />
            ) : (
              <Bot className="h-3 w-3" />
            )}
          </span>
        )}
      </motion.button>
    </div>
  );
}
