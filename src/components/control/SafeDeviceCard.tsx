import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Timer, 
  Play, 
  Square, 
  Lock, 
  Zap,
  LucideIcon 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type DeviceMode = 'auto' | 'temporary' | 'safety_lock';

interface SafeDeviceCardProps {
  deviceKey: string;
  icon: LucideIcon;
  name: { bn: string; en: string };
  description: { bn: string; en: string };
  isActive: boolean;
  mode: DeviceMode;
  remainingTime?: string | null;
  isSafetyLocked?: boolean;
  safetyReason?: { bn: string; en: string };
  onRunTemporarily: () => void;
  onStopTemporarily: () => void;
  disabled?: boolean;
  /** True only when the user placed a temporary override on this device. */
  hasOverride?: boolean;
  /** True when the farm is in AUTO mode (affects Stop button semantics). */
  isAutoMode?: boolean;
}

export function SafeDeviceCard({
  deviceKey,
  icon: Icon,
  name,
  description,
  isActive,
  mode,
  remainingTime,
  isSafetyLocked,
  safetyReason,
  onRunTemporarily,
  onStopTemporarily,
  disabled,
  hasOverride,
  isAutoMode,
}: SafeDeviceCardProps) {
  const { language } = useAuth();

  const getModeLabel = () => {
    switch (mode) {
      case 'temporary':
        return { bn: 'সাময়িক', en: 'TEMPORARY', color: 'bg-amber-500' };
      case 'safety_lock':
        return { bn: 'সুরক্ষা লক', en: 'SAFETY LOCK', color: 'bg-red-500' };
      default:
        return { bn: 'অটো', en: 'AUTO', color: 'bg-emerald-500' };
    }
  };

  const modeInfo = getModeLabel();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 transition-all ${
        isActive 
          ? 'bg-primary/5 border-primary/30 shadow-lg' 
          : 'bg-card border-border'
      } ${isSafetyLocked ? 'border-red-500/30 bg-red-500/5' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${
            isActive 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          } ${isSafetyLocked ? 'bg-red-500/20 text-red-500' : ''}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{name[language]}</h4>
            <p className="text-xs text-muted-foreground">{description[language]}</p>
          </div>
        </div>
        
        <Badge className={`${modeInfo.color} text-white text-[10px]`}>
          {modeInfo[language]}
        </Badge>
      </div>

      {/* Timer Display */}
      {remainingTime && mode === 'temporary' && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2">
          <Timer className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
            {remainingTime}
          </span>
          <span className="text-xs text-muted-foreground">
            {language === 'bn' ? 'বাকি আছে' : 'remaining'}
          </span>
        </div>
      )}

      {/* Safety Lock Message */}
      {isSafetyLocked && safetyReason && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-2">
          <Lock className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-600 dark:text-red-400">
            {safetyReason[language]}
          </span>
        </div>
      )}

      {/* Status Indicator */}
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
        <span className="text-sm text-muted-foreground">
          {isActive 
            ? (language === 'bn' ? 'চলছে' : 'Running')
            : (language === 'bn' ? 'বন্ধ' : 'Off')
          }
        </span>
      </div>

      {/* Action Buttons */}
      {isSafetyLocked ? (
        <div className="flex items-center justify-center gap-2 py-2 text-red-500">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium">
            {language === 'bn' ? 'সুরক্ষা সক্রিয় — বন্ধ করা যাবে না' : 'Safety active — cannot stop'}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={isActive ? 'outline' : 'default'}
            size="sm"
            onClick={onRunTemporarily}
            disabled={disabled || isActive}
            className="gap-1"
          >
            <Play className="h-4 w-4" />
            {language === 'bn' ? 'সাময়িক চালু' : 'Run Temp'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onStopTemporarily}
            disabled={disabled || !isActive}
            className="gap-1"
          >
            <Square className="h-4 w-4" />
            {language === 'bn' ? 'বন্ধ করুন' : 'Stop'}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
