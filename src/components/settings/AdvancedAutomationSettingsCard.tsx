import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wind, Thermometer, Droplets, Fan, Sun, AlertTriangle, 
  ChevronDown, ChevronUp, Settings2, Zap, Gauge, ShieldCheck, ShieldAlert, Info, RotateCcw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRawAdvancedAutomationSettings as useAdvancedAutomationSettings, useUpdateAdvancedAutomationSettings } from '@/hooks/useAdvancedAutomation';
import { useFarmType } from '@/hooks/useFarmType';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// Critical (dangerous) settings that need double confirmation
const CRITICAL_SETTINGS = ['min_vent', 'heater'];

// Explanation text for each module
const MODULE_EXPLANATIONS: Record<string, { bn: string; en: string }> = {
  min_vent: {
    bn: 'অক্সিজেনের জন্য সবসময় কিছু বাতাস প্রয়োজন — এটি বন্ধ করলে গ্যাস জমে শ্বাসকষ্ট হতে পারে',
    en: 'Fresh air is always needed for oxygen — disabling can cause gas buildup and respiratory issues',
  },
  heater: {
    bn: 'বাচ্চা মুরগির জন্য হিটার অত্যন্ত গুরুত্বপূর্ণ — ঠান্ডায় মৃত্যু হতে পারে',
    en: 'Heater is critical for chicks — cold can be fatal',
  },
  fogger: {
    bn: 'অতিরিক্ত গরমে তাপমাত্রা কমায় — খামারে ফগার থাকলে চালু করুন',
    en: 'Reduces temperature during extreme heat — enable if fogger is installed',
  },
  airflow: {
    bn: 'বয়স অনুযায়ী বাতাস চলাচল নিয়ন্ত্রণ করে — বাচ্চাদের জন্য কম, বড়দের জন্য বেশি',
    en: 'Controls ventilation by age — less for chicks, more for adults',
  },
  curtain: {
    bn: 'বাইরের তাপমাত্রা অনুযায়ী পর্দা খোলা/বন্ধের পরামর্শ দেয়',
    en: 'Suggests curtain open/close based on outside temperature',
  },
  water: {
    bn: 'পানির ব্যবহার হঠাৎ কমে গেলে স্বাস্থ্য সমস্যার ইঙ্গিত হতে পারে',
    en: 'Sudden drop in water usage can indicate health problems',
  },
};

export function AdvancedAutomationSettingsCard() {
  const { language } = useAuth();
  const { data: settings, isLoading } = useAdvancedAutomationSettings();
  const updateSettings = useUpdateAdvancedAutomationSettings();
  const { isLayer, isBroiler } = useFarmType();
  
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [criticalConfirm, setCriticalConfirm] = useState<{ id: string; newValue: boolean } | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  // Handle critical setting toggle with double confirmation
  const handleCriticalToggle = (sectionId: string, newValue: boolean, onToggle: (v: boolean) => void) => {
    // Only confirm when DISABLING a critical setting
    if (!newValue && CRITICAL_SETTINGS.includes(sectionId)) {
      setCriticalConfirm({ id: sectionId, newValue });
      return;
    }
    onToggle(newValue);
  };

  const handleConfirmCritical = () => {
    if (!criticalConfirm) return;
    const section = sections.find(s => s.id === criticalConfirm.id);
    section?.onToggle?.(criticalConfirm.newValue);
    setCriticalConfirm(null);
  };

  // Reset all to safe defaults
  const handleResetDefaults = () => {
    updateSettings.mutate({
      min_vent_enabled: true,
      min_vent_temp_threshold: 26,
      min_vent_cycle_seconds: 40,
      min_vent_interval_minutes: 5,
      min_vent_ceiling_fan_always_on: true,
      heater_enabled: true,
      heater_on_temp: 20,
      heater_off_temp: 24,
      heater_tolerance: 0.7,
      fogger_enabled: false,
      fogger_start_temp: 32,
      fogger_start_humidity_max: 85,
      fogger_on_seconds: 40,
      fogger_pause_seconds: 120,
      fogger_stop_temp: 30,
      fogger_stop_humidity: 90,
      airflow_enabled: true,
      curtain_advisory_enabled: true,
      water_drop_threshold_percent: 30,
      water_night_spike_enabled: true,
      water_zero_flow_alert: true,
    });
    toast.success(
      language === 'bn' ? '🔄 নিরাপদ ডিফল্ট সেটিং ফিরিয়ে আনা হয়েছে' : '🔄 Safe defaults restored'
    );
  };

  // Check if all critical settings are enabled (safe)
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

  const sections = [
    {
      id: 'min_vent',
      icon: Wind,
      title: language === 'bn' ? 'মিনিমাম ভেন্টিলেশন' : 'Minimum Ventilation',
      description: language === 'bn' ? 'শীতে গ্যাস জমা প্রতিরোধ' : 'Prevent gas accumulation in winter',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      isCritical: true,
      enabled: settings?.min_vent_enabled ?? true,
      onToggle: (v: boolean) => updateSettings.mutate({ min_vent_enabled: v }),
      content: (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'তাপমাত্রা থ্রেশহোল্ড' : 'Temperature Threshold'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.min_vent_temp_threshold ?? 26}
                onChange={(e) => updateSettings.mutate({ min_vent_temp_threshold: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'সাইকেল সময়' : 'Cycle Duration'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.min_vent_cycle_seconds ?? 40}
                onChange={(e) => updateSettings.mutate({ min_vent_cycle_seconds: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">{language === 'bn' ? 'সেকেন্ড' : 'sec'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'ইন্টারভাল' : 'Interval'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.min_vent_interval_minutes ?? 5}
                onChange={(e) => updateSettings.mutate({ min_vent_interval_minutes: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">{language === 'bn' ? 'মিনিট' : 'min'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'সিলিং ফ্যান সবসময় চালু' : 'Ceiling Fan Always On'}</Label>
            <Switch
              checked={settings?.min_vent_ceiling_fan_always_on ?? true}
              onCheckedChange={(v) => updateSettings.mutate({ min_vent_ceiling_fan_always_on: v })}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'heater',
      icon: Thermometer,
      title: language === 'bn' ? 'হিটার কন্ট্রোল' : 'Heater Control',
      description: isBroiler 
        ? (language === 'bn' ? 'বয়স-ভিত্তিক তাপমাত্রা কার্ভ' : 'Age-based temperature curve')
        : (language === 'bn' ? 'থ্রেশহোল্ড-ভিত্তিক নিয়ন্ত্রণ' : 'Threshold-based control'),
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      isCritical: true,
      enabled: settings?.heater_enabled ?? true,
      onToggle: (v: boolean) => updateSettings.mutate({ heater_enabled: v }),
      content: isLayer ? (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'হিটার চালু হবে' : 'Heater ON temp'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.heater_on_temp ?? 20}
                onChange={(e) => updateSettings.mutate({ heater_on_temp: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'হিটার বন্ধ হবে' : 'Heater OFF temp'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.heater_off_temp ?? 24}
                onChange={(e) => updateSettings.mutate({ heater_off_temp: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            {language === 'bn' 
              ? 'ব্রয়লারের জন্য বয়স অনুযায়ী তাপমাত্রা নিয়ন্ত্রিত হয়:' 
              : 'For broilers, temperature is controlled by age:'}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="font-medium">Day 1-3:</span> 33°C
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="font-medium">Day 4-7:</span> 31°C
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="font-medium">Day 8-14:</span> 29°C
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="font-medium">Day 15-21:</span> 26°C
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="font-medium">Day 22-28:</span> 24°C
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="font-medium">Day 29+:</span> 22°C
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label>{language === 'bn' ? 'টলারেন্স' : 'Tolerance'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                value={settings?.heater_tolerance ?? 0.7}
                onChange={(e) => updateSettings.mutate({ heater_tolerance: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'fogger',
      icon: Droplets,
      title: language === 'bn' ? 'ফগার কুলিং' : 'Fogger Cooling',
      description: language === 'bn' ? 'বুদ্ধিমান কুলিং সিস্টেম' : 'Intelligent cooling system',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      isCritical: false,
      enabled: settings?.fogger_enabled ?? false,
      onToggle: (v: boolean) => updateSettings.mutate({ fogger_enabled: v }),
      content: (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'শুরুর তাপমাত্রা' : 'Start Temperature'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.fogger_start_temp ?? 32}
                onChange={(e) => updateSettings.mutate({ fogger_start_temp: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'সর্বোচ্চ আর্দ্রতা' : 'Max Humidity to Start'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.fogger_start_humidity_max ?? 85}
                onChange={(e) => updateSettings.mutate({ fogger_start_humidity_max: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'স্প্রে সময়' : 'Spray Duration'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.fogger_on_seconds ?? 40}
                onChange={(e) => updateSettings.mutate({ fogger_on_seconds: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">{language === 'bn' ? 'সেকেন্ড' : 'sec'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'বিরতি সময়' : 'Pause Duration'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.fogger_pause_seconds ?? 120}
                onChange={(e) => updateSettings.mutate({ fogger_pause_seconds: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">{language === 'bn' ? 'সেকেন্ড' : 'sec'}</span>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'বন্ধ হওয়ার তাপমাত্রা' : 'Stop Temperature'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.fogger_stop_temp ?? 30}
                onChange={(e) => updateSettings.mutate({ fogger_stop_temp: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'বন্ধ হওয়ার আর্দ্রতা' : 'Stop Humidity'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.fogger_stop_humidity ?? 90}
                onChange={(e) => updateSettings.mutate({ fogger_stop_humidity: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'airflow',
      icon: Fan,
      title: language === 'bn' ? 'ব্রয়লার এয়ারফ্লো' : 'Broiler Airflow',
      description: language === 'bn' ? 'বয়স-ভিত্তিক সার্কুলেশন' : 'Age-based circulation control',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      isCritical: false,
      enabled: settings?.airflow_enabled ?? true,
      onToggle: (v: boolean) => updateSettings.mutate({ airflow_enabled: v }),
      hidden: isLayer,
      content: (
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            {language === 'bn' 
              ? 'বয়স অনুযায়ী সার্কুলেশন ফ্যান নিয়ন্ত্রণ:' 
              : 'Circulation fan control by age:'}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-muted/50 rounded-lg p-2">
              <span>{'< 10 days'}</span>
              <span className="text-muted-foreground">{language === 'bn' ? 'বন্ধ' : 'OFF'}</span>
            </div>
            <div className="flex justify-between bg-muted/50 rounded-lg p-2">
              <span>10-20 days</span>
              <span className="text-muted-foreground">30s ON / 3min interval</span>
            </div>
            <div className="flex justify-between bg-muted/50 rounded-lg p-2">
              <span>21+ days (day)</span>
              <span className="text-muted-foreground">{language === 'bn' ? 'সবসময় চালু' : 'Always ON'}</span>
            </div>
            <div className="flex justify-between bg-muted/50 rounded-lg p-2">
              <span>21+ days (night)</span>
              <span className="text-muted-foreground">1min ON / 5min interval</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'curtain',
      icon: AlertTriangle,
      title: language === 'bn' ? 'কার্টেন পরামর্শ' : 'Curtain Advisory',
      description: language === 'bn' ? 'AI-ভিত্তিক পরামর্শ' : 'AI-based recommendations',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      isCritical: false,
      enabled: settings?.curtain_advisory_enabled ?? true,
      onToggle: (v: boolean) => updateSettings.mutate({ curtain_advisory_enabled: v }),
      content: (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'তাপমাত্রা পার্থক্য' : 'Temp Difference'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.curtain_open_temp_diff ?? 3}
                onChange={(e) => updateSettings.mutate({ curtain_open_temp_diff: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'ঠান্ডায় বন্ধ করার পরামর্শ' : 'Close on Cold'}</Label>
            <Switch
              checked={settings?.curtain_close_on_cold ?? true}
              onCheckedChange={(v) => updateSettings.mutate({ curtain_close_on_cold: v })}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'water',
      icon: Gauge,
      title: language === 'bn' ? 'পানি বিশ্লেষণ' : 'Water Analytics',
      description: language === 'bn' ? 'স্বাস্থ্য মনিটরিং' : 'Health monitoring',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      isCritical: false,
      enabled: true,
      content: (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'ড্রপ থ্রেশহোল্ড' : 'Drop Threshold'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.water_drop_threshold_percent ?? 30}
                onChange={(e) => updateSettings.mutate({ water_drop_threshold_percent: Number(e.target.value) })}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'রাতে স্পাইক সতর্কতা' : 'Night Spike Alert'}</Label>
            <Switch
              checked={settings?.water_night_spike_enabled ?? true}
              onCheckedChange={(v) => updateSettings.mutate({ water_night_spike_enabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>{language === 'bn' ? 'শূন্য প্রবাহ সতর্কতা' : 'Zero Flow Alert'}</Label>
            <Switch
              checked={settings?.water_zero_flow_alert ?? true}
              onCheckedChange={(v) => updateSettings.mutate({ water_zero_flow_alert: v })}
            />
          </div>
        </div>
      ),
    },
  ];

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
        {/* Lock/Safe indicator */}
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

      {/* Reset to safe defaults button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mb-4 gap-2"
        onClick={handleResetDefaults}
      >
        <RotateCcw size={14} />
        {language === 'bn' ? 'নিরাপদ সেটিং ফিরিয়ে আনুন' : 'Reset to Safe Defaults'}
      </Button>

      <div className="space-y-2">
        {sections.filter(s => !s.hidden).map((section) => (
          <Collapsible
            key={section.id}
            open={openSection === section.id}
            onOpenChange={() => toggleSection(section.id)}
          >
            <div className="flex items-center gap-3 py-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${section.bgColor}`}>
                <section.icon className={`h-4 w-4 ${section.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{section.title}</p>
                  {section.isCritical && (
                    <ShieldAlert size={12} className="text-amber-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{section.description}</p>
              </div>
              {section.onToggle && (
                <Switch
                  checked={section.enabled}
                  onCheckedChange={(v) => handleCriticalToggle(section.id, v, section.onToggle!)}
                />
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {openSection === section.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="pl-12">
              {/* Explanation text */}
              {MODULE_EXPLANATIONS[section.id] && (
                <div className="flex items-start gap-2 mb-3 rounded-lg bg-muted/50 p-2.5">
                  <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {MODULE_EXPLANATIONS[section.id][language]}
                  </p>
                </div>
              )}
              {section.content}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Critical setting confirmation dialog */}
      <AlertDialog open={!!criticalConfirm} onOpenChange={(open) => !open && setCriticalConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              {language === 'bn' ? 'বিপদজনক পরিবর্তন!' : 'Dangerous Change!'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-medium text-foreground">
                {language === 'bn' 
                  ? 'এতে মুরগির ক্ষতি হতে পারে — আপনি কি নিশ্চিত?'
                  : 'This could harm the birds — are you sure?'}
              </p>
              {criticalConfirm?.id === 'min_vent' && (
                <p className="text-sm">
                  {language === 'bn'
                    ? '⚠️ ভেন্টিলেশন বন্ধ করলে গ্যাস জমে মুরগির শ্বাসকষ্ট হতে পারে এবং মৃত্যুও ঘটতে পারে।'
                    : '⚠️ Disabling ventilation can cause gas buildup leading to respiratory distress and death.'}
                </p>
              )}
              {criticalConfirm?.id === 'heater' && (
                <p className="text-sm">
                  {language === 'bn'
                    ? '⚠️ হিটার বন্ধ করলে শীতকালে বাচ্চা মুরগি মারা যেতে পারে।'
                    : '⚠️ Disabling heater can kill chicks during cold weather.'}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCritical}
              className="bg-red-600 hover:bg-red-700"
            >
              {language === 'bn' ? 'হ্যাঁ, বন্ধ করুন' : 'Yes, Disable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
