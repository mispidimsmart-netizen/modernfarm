import { motion } from 'framer-motion';
import { Check, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PROFILES } from '@/data/farmSetupOptions';
import type { ProfileType } from '@/lib/farmSetup';

interface ProfileSectionProps {
  language: 'bn' | 'en';
  activeProfile: ProfileType;
  autoDetectedProfile: ProfileType;
  isProfileManual: boolean;
  setIsProfileManual: (v: boolean) => void;
  clearProfileOverride: () => void;
  birdAge: number;
  onChange: (p: ProfileType) => void;
}

export function ProfileSection({
  language,
  activeProfile,
  autoDetectedProfile,
  isProfileManual,
  setIsProfileManual,
  clearProfileOverride,
  birdAge,
  onChange,
}: ProfileSectionProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          {language === 'bn'
            ? isProfileManual
              ? 'ম্যানুয়ালি নির্বাচিত'
              : `পাখির বয়স (${birdAge} দিন) থেকে স্বয়ংক্রিয়`
            : isProfileManual
              ? 'Manually selected'
              : `Auto from bird age (${birdAge} days)`}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="profile-manual" className="text-xs text-muted-foreground">
            {language === 'bn' ? 'ম্যানুয়াল' : 'Manual'}
          </Label>
          <Switch
            id="profile-manual"
            checked={isProfileManual}
            onCheckedChange={(checked) => {
              setIsProfileManual(checked);
              if (!checked) clearProfileOverride();
            }}
          />
        </div>
      </div>
      <div className="space-y-2">
        {PROFILES.map((p) => {
          const Icon = p.icon;
          const isSelected = activeProfile === p.id;
          const isAutoDetected = !isProfileManual && autoDetectedProfile === p.id;
          return (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                if (!isProfileManual && isAutoDetected) return;
                onChange(p.id);
              }}
              disabled={!isProfileManual && isAutoDetected}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all ${
                isSelected
                  ? `${p.bgColor} border-2 border-current ${p.color}`
                  : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
              } ${!isProfileManual && !isAutoDetected ? 'opacity-50' : ''}`}
            >
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-lg ${p.bgColor}`}>
                <Icon className={`h-5 w-5 ${p.color}`} />
                {isAutoDetected && !isProfileManual && (
                  <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Sparkles className="h-2.5 w-2.5" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{p.name[language]}</p>
                <p className="text-xs text-muted-foreground">{p.description[language]}</p>
              </div>
              {isSelected && <Check className="h-5 w-5 text-primary" />}
            </motion.button>
          );
        })}
      </div>
      {isProfileManual && (
        <Button variant="ghost" size="sm" className="mt-3 w-full text-muted-foreground" onClick={clearProfileOverride}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {language === 'bn' ? 'অটো ডিটেক্টে ফিরে যান' : 'Reset to Auto-detect'}
        </Button>
      )}
    </>
  );
}
