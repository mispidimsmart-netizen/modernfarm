import { motion } from 'framer-motion';
import { Warehouse, Thermometer, Droplets, ShieldAlert, Shield, WifiOff, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSelectedShed } from '@/hooks/useSheds';
import { useMultiShedData, getHSIEmoji, getModeColorClass, ShedOverview } from '@/hooks/useMultiShedData';
import { cn } from '@/lib/utils';

interface ShedCardProps {
  shed: ShedOverview;
  isSelected: boolean;
  onSelect: () => void;
  language: 'bn' | 'en';
}

function ShedCard({ shed, isSelected, onSelect, language }: ShedCardProps) {
  const modeLabels = {
    AUTO: { bn: 'অটো', en: 'AUTO' },
    MANUAL: { bn: 'ম্যানুয়াল', en: 'MANUAL' },
    FAIL_SAFE: { bn: 'ফেইল-সেফ', en: 'FAIL-SAFE' },
    OFFLINE: { bn: 'অফলাইন', en: 'OFFLINE' },
  };

  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative w-full rounded-xl border p-3 text-left transition-all',
        isSelected 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-border/50 bg-card hover:border-primary/30 hover:bg-card/80',
        !shed.is_active && 'opacity-60'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -left-px top-3 bottom-3 w-1 rounded-r-full bg-primary" />
      )}

      {/* Header: Shed name + Mode badge */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">
            {language === 'bn' ? shed.name : shed.name_en}
          </span>
        </div>
        <span className={cn(
          'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
          getModeColorClass(shed.mode)
        )}>
          {shed.mode === 'FAIL_SAFE' ? (
            <ShieldAlert className="h-3 w-3" />
          ) : shed.mode === 'OFFLINE' ? (
            <WifiOff className="h-3 w-3" />
          ) : (
            <Shield className="h-3 w-3" />
          )}
          {modeLabels[shed.mode][language]}
        </span>
      </div>

      {/* Sensor readings grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Temperature */}
        <div className="flex flex-col items-center rounded-lg bg-muted/50 p-1.5">
          <Thermometer className="h-3.5 w-3.5 text-sensor-temperature mb-0.5" />
          <span className="text-xs font-bold">
            {shed.temperature !== null ? `${shed.temperature.toFixed(1)}°` : '--'}
          </span>
        </div>

        {/* Humidity */}
        <div className="flex flex-col items-center rounded-lg bg-muted/50 p-1.5">
          <Droplets className="h-3.5 w-3.5 text-sensor-humidity mb-0.5" />
          <span className="text-xs font-bold">
            {shed.humidity !== null ? `${shed.humidity.toFixed(0)}%` : '--'}
          </span>
        </div>

        {/* HSI with color indicator */}
        <div className="flex flex-col items-center rounded-lg bg-muted/50 p-1.5">
          <span className="text-sm mb-0.5">{getHSIEmoji(shed.hsiLevel)}</span>
          <span className="text-xs font-bold">
            {shed.hsi !== null ? shed.hsi.toFixed(0) : '--'}
          </span>
        </div>
      </div>

      {/* Online indicator */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className={cn(
            'h-1.5 w-1.5 rounded-full',
            shed.isOnline ? 'bg-status-normal animate-pulse' : 'bg-muted-foreground'
          )} />
          <span className="text-[10px] text-muted-foreground">
            {shed.isOnline 
              ? (language === 'bn' ? 'অনলাইন' : 'Online')
              : (language === 'bn' ? 'অফলাইন' : 'Offline')
            }
          </span>
        </div>
        <ChevronRight className={cn(
          'h-4 w-4 transition-colors',
          isSelected ? 'text-primary' : 'text-muted-foreground'
        )} />
      </div>
    </motion.button>
  );
}

export function BigFarmOverview() {
  const { language } = useAuth();
  const { data: shedsData, isLoading } = useMultiShedData();
  const { selectedShedId, setSelectedShedId } = useSelectedShed();

  if (isLoading) {
    return (
      <div className="mb-4 grid grid-cols-2 gap-3">
        {[1, 2].map(i => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!shedsData || shedsData.length === 0) {
    return null;
  }

  // If only one shed, don't show the overview grid
  if (shedsData.length === 1) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Warehouse className="h-4 w-4" />
        {language === 'bn' ? 'সকল শেড' : 'All Sheds'}
        <span className="ml-auto text-xs font-normal">
          {shedsData.filter(s => s.isOnline).length}/{shedsData.length} {language === 'bn' ? 'অনলাইন' : 'online'}
        </span>
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {shedsData.map(shed => (
          <ShedCard
            key={shed.id}
            shed={shed}
            isSelected={selectedShedId === shed.id}
            onSelect={() => setSelectedShedId(shed.id)}
            language={language}
          />
        ))}
      </div>
    </motion.div>
  );
}
