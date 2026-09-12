import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LightingCurveSettings } from '@/components/lighting/LightingCurveSettings';
import { SmartLightingProfileCard } from '@/components/lighting/SmartLightingProfileCard';
import { AgeLightingSuggestionCard } from '@/components/lighting/AgeLightingSuggestionCard';
import { LDRSettingsCard } from '@/components/lighting/LDRSettingsCard';
import { LDRInstallationGuide } from '@/components/lighting/LDRInstallationGuide';
import { BirdAgeCard } from '@/components/farm/BirdAgeCard';

export function LightingTab() {
  const { language } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
          <Lightbulb size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold">
            {language === 'bn' ? '💡 লাইটিং ব্যবস্থাপনা' : '💡 Lighting Management'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {language === 'bn'
              ? 'সময়সূচী, কার্ভ, প্রোফাইল ও LDR সেন্সর সেটিংস'
              : 'Schedule, curve, profile and LDR sensor settings'}
          </p>
        </div>
      </div>

      {/* 🐔 Unified Bird Age (single source of truth — used by lighting suggestion below) */}
      <BirdAgeCard />

      {/* Smart Lighting Profile (flock + dark hours) */}
      <SmartLightingProfileCard />

      {/* Age-Based Suggestion (reads bird age above) */}
      <AgeLightingSuggestionCard />

      {/* Lighting Curve Settings (start/end time, fade, brightness) */}
      <LightingCurveSettings />

      {/* LDR Sensor Settings */}
      <LDRSettingsCard />

      {/* LDR Installation Guide */}
      <LDRInstallationGuide />

      {/* Info Footer */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <h4 className="mb-2 font-medium text-primary">
          {language === 'bn' ? '💡 লেয়ার মুরগির জন্য আলো' : '💡 Light for Layer Hens'}
        </h4>
        <p className="text-sm text-muted-foreground">
          {language === 'bn'
            ? 'সর্বোত্তম ডিম উৎপাদনের জন্য লেয়ার মুরগির দৈনিক ১৪-১৬ ঘন্টা আলো প্রয়োজন। গ্র্যাজুয়াল মোড স্ট্রেস কমায় এবং ডিম পাড়ার ধারাবাহিকতা বাড়ায়।'
            : 'Layer hens require 14-16 hours of light daily for optimal egg production. Gradual mode reduces stress and improves egg laying consistency.'}
        </p>
      </div>
    </motion.div>
  );
}
