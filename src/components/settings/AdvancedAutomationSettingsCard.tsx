import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, ShieldAlert, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  useRawAdvancedAutomationSettings as useAdvancedAutomationSettings,
  useUpdateAdvancedAutomationSettings,
} from '@/hooks/useAdvancedAutomation';
import { useFarmType } from '@/hooks/useFarmType';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  CRITICAL_SETTINGS,
  SAFE_AUTOMATION_DEFAULTS,
} from './automation-advanced/automationSettingsConstants';
import { buildAutomationSections } from './automation-advanced/buildAutomationSections';
import { AutomationSectionRow } from './automation-advanced/AutomationSectionRow';
import { CriticalToggleDialog } from './automation-advanced/CriticalToggleDialog';

export function AdvancedAutomationSettingsCard() {
  const { language } = useAuth();
  const { data: settings, isLoading } = useAdvancedAutomationSettings();
  const updateSettings = useUpdateAdvancedAutomationSettings();
  const { isLayer, isBroiler } = useFarmType();

  const [openSection, setOpenSection] = useState<string | null>(null);
  const [criticalConfirm, setCriticalConfirm] = useState<{ id: string; newValue: boolean } | null>(null);

  const sections = buildAutomationSections({
    language,
    settings,
    isLayer,
    isBroiler,
    update: (patch) => updateSettings.mutate(patch),
  });

  // Only confirm when DISABLING a critical setting
  const handleCriticalToggle = (sectionId: string, newValue: boolean, onToggle: (v: boolean) => void) => {
    if (!newValue && CRITICAL_SETTINGS.includes(sectionId)) {
      setCriticalConfirm({ id: sectionId, newValue });
      return;
    }
    onToggle(newValue);
  };

  const handleConfirmCritical = () => {
    if (!criticalConfirm) return;
    const section = sections.find((s) => s.id === criticalConfirm.id);
    section?.onToggle?.(criticalConfirm.newValue);
    setCriticalConfirm(null);
  };

  const handleResetDefaults = () => {
    updateSettings.mutate(SAFE_AUTOMATION_DEFAULTS);
    toast.success(
      language === 'bn' ? '🔄 নিরাপদ ডিফল্ট সেটিং ফিরিয়ে আনা হয়েছে' : '🔄 Safe defaults restored'
    );
  };

  const allCriticalSafe = (settings?.min_vent_enabled ?? true) && (settings?.heater_enabled ?? true);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-4 shadow-card"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">
            {language === 'bn' ? 'অ্যাডভান্সড অটোমেশন' : 'Advanced Automation'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'bn' ? '৭টি স্মার্ট মডিউল' : '7 Smart Modules'}
          </p>
        </div>
        {allCriticalSafe ? (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1">
            <ShieldCheck size={14} />
            {language === 'bn' ? 'নিরাপদ' : 'Safe'}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium rounded-full bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1">
            <ShieldAlert size={14} />
            {language === 'bn' ? 'সতর্ক' : 'Warning'}
          </span>
        )}
      </div>

      <Button variant="outline" size="sm" className="w-full mb-4 gap-2" onClick={handleResetDefaults}>
        <RotateCcw size={14} />
        {language === 'bn' ? 'নিরাপদ সেটিং ফিরিয়ে আনুন' : 'Reset to Safe Defaults'}
      </Button>

      <div className="space-y-2">
        {sections
          .filter((s) => !s.hidden)
          .map((section) => (
            <AutomationSectionRow
              key={section.id}
              section={section}
              language={language}
              isOpen={openSection === section.id}
              onOpenChange={() => setOpenSection(openSection === section.id ? null : section.id)}
              onToggle={(v) => handleCriticalToggle(section.id, v, section.onToggle!)}
            />
          ))}
      </div>

      <CriticalToggleDialog
        language={language}
        pendingId={criticalConfirm?.id ?? null}
        onOpenChange={(open) => !open && setCriticalConfirm(null)}
        onConfirm={handleConfirmCritical}
      />
    </motion.div>
  );
}
