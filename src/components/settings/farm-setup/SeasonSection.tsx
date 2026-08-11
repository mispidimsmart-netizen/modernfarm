import { motion } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SEASONS } from '@/data/farmSetupOptions';
import type { Season } from '@/lib/farmSetup';

interface SeasonSectionProps {
  language: 'bn' | 'en';
  activeSeason: Season;
  autoDetectedSeason: Season;
  isSeasonManual: boolean;
  setIsSeasonManual: (v: boolean) => void;
  clearSeasonOverride: () => void;
  temperature?: number | null;
  onChange: (s: Season) => void;
}

export function SeasonSection({
  language,
  activeSeason,
  autoDetectedSeason,
  isSeasonManual,
  setIsSeasonManual,
  clearSeasonOverride,
  temperature,
  onChange,
}: SeasonSectionProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          {language === 'bn'
            ? isSeasonManual
              ? 'ম্যানুয়ালি নির্বাচিত'
              : `Weather API থেকে স্বয়ংক্রিয় (${temperature ?? '--'}°C)`
            : isSeasonManual
              ? 'Manually selected'
              : `Auto from Weather API (${temperature ?? '--'}°C)`}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="season-manual" className="text-xs text-muted-foreground">
            {language === 'bn' ? 'ম্যানুয়াল' : 'Manual'}
          </Label>
          <Switch
            id="season-manual"
            checked={isSeasonManual}
            onCheckedChange={(checked) => {
              setIsSeasonManual(checked);
              if (!checked) clearSeasonOverride();
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SEASONS.map((s) => {
          const Icon = s.icon;
          const isSelected = activeSeason === s.id;
          const isAutoDetected = !isSeasonManual && autoDetectedSeason === s.id;
          return (
            <motion.button
              key={s.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (!isSeasonManual && isAutoDetected) return;
                onChange(s.id);
              }}
              disabled={!isSeasonManual && isAutoDetected}
              className={`relative rounded-xl p-3 text-center transition-all ${
                isSelected
                  ? `${s.bgColor} border-2 border-current ${s.color}`
                  : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
              } ${!isSeasonManual && !isAutoDetected ? 'opacity-50' : ''}`}
            >
              {isAutoDetected && !isSeasonManual && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Sparkles className="h-3 w-3" />
                </div>
              )}
              <Icon className={`h-6 w-6 mx-auto mb-1 ${isSelected ? s.color : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium">{s.name[language]}</p>
            </motion.button>
          );
        })}
      </div>
      {isSeasonManual && (
        <Button variant="ghost" size="sm" className="mt-3 w-full text-muted-foreground" onClick={clearSeasonOverride}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {language === 'bn' ? 'অটো ডিটেক্টে ফিরে যান' : 'Reset to Auto-detect'}
        </Button>
      )}
    </>
  );
}
