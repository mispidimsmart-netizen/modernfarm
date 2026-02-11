import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind, Save, RotateCcw, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings, useUpdateFarmSettings } from '@/hooks/useFarmData';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
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
import { differenceInDays, parseISO } from 'date-fns';

interface ThresholdValues {
  temperature_min: number;
  temperature_max: number;
  humidity_min: number;
  humidity_max: number;
  ammonia_max: number;
}

const LAYER_DEFAULTS: ThresholdValues = {
  temperature_min: 18,
  temperature_max: 32,
  humidity_min: 40,
  humidity_max: 80,
  ammonia_max: 25,
};

const BROILER_DEFAULTS: ThresholdValues = {
  temperature_min: 22,
  temperature_max: 34,
  humidity_min: 40,
  humidity_max: 75,
  ammonia_max: 20,
};

// Safe ranges - values outside trigger warnings
const SAFE_RANGES = {
  temperature_min: { min: 15, max: 28 },
  temperature_max: { min: 28, max: 38 },
  humidity_min: { min: 30, max: 55 },
  humidity_max: { min: 65, max: 95 },
  ammonia_max: { min: 15, max: 35 },
};

function isOutsideSafeRange(key: keyof ThresholdValues, value: number): boolean {
  const range = SAFE_RANGES[key];
  return value < range.min || value > range.max;
}

export function ThresholdSettingsCard() {
  const { language } = useAuth();
  const { data: settings, isLoading } = useFarmSettings();
  const updateSettings = useUpdateFarmSettings();
  const { isBroiler } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  
  const defaults = isBroiler ? BROILER_DEFAULTS : LAYER_DEFAULTS;
  const [values, setValues] = useState<ThresholdValues>(defaults);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Bird age for suggestion
  const birdAgeDays = useMemo(() => {
    if (!isBroiler || !activeBatch?.start_date) return 0;
    return differenceInDays(new Date(), parseISO(activeBatch.start_date));
  }, [isBroiler, activeBatch]);

  // Age-based suggestion for broiler
  const suggestedTemp = useMemo(() => {
    if (!isBroiler || birdAgeDays <= 0) return null;
    if (birdAgeDays <= 3) return 33;
    if (birdAgeDays <= 7) return 31;
    if (birdAgeDays <= 14) return 29;
    if (birdAgeDays <= 21) return 27;
    if (birdAgeDays <= 28) return 25;
    return 23;
  }, [isBroiler, birdAgeDays]);

  // Load current settings
  useEffect(() => {
    if (settings) {
      setValues({
        temperature_min: Number(settings.temperature_min),
        temperature_max: Number(settings.temperature_max),
        humidity_min: Number(settings.humidity_min),
        humidity_max: Number(settings.humidity_max),
        ammonia_max: Number(settings.ammonia_max),
      });
    }
  }, [settings]);

  // Check for changes
  useEffect(() => {
    if (settings) {
      const changed = 
        values.temperature_min !== Number(settings.temperature_min) ||
        values.temperature_max !== Number(settings.temperature_max) ||
        values.humidity_min !== Number(settings.humidity_min) ||
        values.humidity_max !== Number(settings.humidity_max) ||
        values.ammonia_max !== Number(settings.ammonia_max);
      setHasChanges(changed);
    }
  }, [values, settings]);

  // Check if any values are outside safe range
  const hasUnsafeValues = useMemo(() => {
    return (Object.keys(values) as (keyof ThresholdValues)[]).some(
      key => isOutsideSafeRange(key, values[key])
    );
  }, [values]);

  const handleSave = async () => {
    // If values are outside safe range, require confirmation
    if (hasUnsafeValues) {
      setShowSaveConfirm(true);
      return;
    }
    await doSave();
  };

  const doSave = async () => {
    try {
      await updateSettings.mutateAsync(values);
      toast.success(
        language === 'bn' ? 'থ্রেশহোল্ড সেভ হয়েছে!' : 'Thresholds saved!'
      );
      setHasChanges(false);
      setShowSaveConfirm(false);
    } catch (error) {
      toast.error(
        language === 'bn' ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save'
      );
    }
  };

  const handleReset = () => {
    if (settings) {
      setValues({
        temperature_min: Number(settings.temperature_min),
        temperature_max: Number(settings.temperature_max),
        humidity_min: Number(settings.humidity_min),
        humidity_max: Number(settings.humidity_max),
        ammonia_max: Number(settings.ammonia_max),
      });
    }
  };

  const handleResetToSafeDefaults = () => {
    setValues(defaults);
    toast.success(
      language === 'bn' ? '🔄 নিরাপদ ডিফল্ট সেটিং লোড হয়েছে' : '🔄 Safe defaults loaded'
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="space-y-4">
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <Thermometer size={18} className="text-orange-500" />
          {language === 'bn' ? 'সেন্সর থ্রেশহোল্ড' : 'Sensor Thresholds'}
        </h3>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-amber-500 font-medium">
              {language === 'bn' ? 'অসংরক্ষিত' : 'Unsaved'}
            </span>
          )}
          {!hasUnsafeValues && !hasChanges && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck size={14} />
              {language === 'bn' ? 'নিরাপদ' : 'Safe'}
            </span>
          )}
        </div>
      </div>

      {/* Age-based suggestion for broiler */}
      {isBroiler && suggestedTemp && (
        <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {language === 'bn' 
                  ? `পাখির বয়স ${birdAgeDays} দিন — টার্গেট তাপমাত্রা ${suggestedTemp}°C`
                  : `Bird age ${birdAgeDays} days — Target temp ${suggestedTemp}°C`}
              </p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                {language === 'bn' 
                  ? 'বয়স অনুযায়ী স্বয়ংক্রিয় তাপমাত্রা ব্যবহার করা উত্তম'
                  : 'Using age-based automatic temperature is recommended'}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="mb-6 text-sm text-muted-foreground">
        {language === 'bn' 
          ? 'এই সীমা অতিক্রম করলে অ্যালার্ট ও অটোমেশন কাজ করবে।'
          : 'Alerts and automation activate when these limits are exceeded.'}
      </p>

      <div className="space-y-6">
        {/* Temperature Range */}
        <div className="rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4">
          <div className="mb-1 flex items-center gap-2">
            <Thermometer size={16} className="text-orange-500" />
            <Label className="font-medium">
              {language === 'bn' ? 'তাপমাত্রা সীমা' : 'Temperature Range'}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {language === 'bn' 
              ? '💡 সঠিক তাপমাত্রা মুরগির স্বাস্থ্য ও উৎপাদন নিশ্চিত করে'
              : '💡 Correct temperature ensures bird health and production'}
          </p>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {language === 'bn' ? 'সর্বনিম্ন' : 'Minimum'}
                </span>
                <span className="font-mono font-semibold text-blue-500">
                  {values.temperature_min}°C
                </span>
              </div>
              <Slider
                value={[values.temperature_min]}
                onValueChange={([val]) => setValues(v => ({ ...v, temperature_min: val }))}
                min={10}
                max={30}
                step={1}
                className="[&_[role=slider]]:bg-blue-500"
              />
              {isOutsideSafeRange('temperature_min', values.temperature_min) && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {language === 'bn' ? 'এই মান মুরগির জন্য ঝুঁকিপূর্ণ হতে পারে' : 'This value may be risky for birds'}
                </p>
              )}
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {language === 'bn' ? 'সর্বোচ্চ' : 'Maximum'}
                </span>
                <span className="font-mono font-semibold text-red-500">
                  {values.temperature_max}°C
                </span>
              </div>
              <Slider
                value={[values.temperature_max]}
                onValueChange={([val]) => setValues(v => ({ ...v, temperature_max: val }))}
                min={25}
                max={45}
                step={1}
                className="[&_[role=slider]]:bg-red-500"
              />
              {isOutsideSafeRange('temperature_max', values.temperature_max) && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {language === 'bn' ? 'এই মান মুরগির জন্য ঝুঁকিপূর্ণ হতে পারে' : 'This value may be risky for birds'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Humidity Range */}
        <div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-4">
          <div className="mb-1 flex items-center gap-2">
            <Droplets size={16} className="text-blue-500" />
            <Label className="font-medium">
              {language === 'bn' ? 'আর্দ্রতা সীমা' : 'Humidity Range'}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {language === 'bn' 
              ? '💡 কম আর্দ্রতায় ধুলা বাড়ে, বেশিতে ব্যাকটেরিয়া জন্মায়'
              : '💡 Low humidity increases dust, high humidity grows bacteria'}
          </p>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{language === 'bn' ? 'সর্বনিম্ন' : 'Minimum'}</span>
                <span className="font-mono font-semibold text-cyan-500">{values.humidity_min}%</span>
              </div>
              <Slider
                value={[values.humidity_min]}
                onValueChange={([val]) => setValues(v => ({ ...v, humidity_min: val }))}
                min={20}
                max={60}
                step={5}
                className="[&_[role=slider]]:bg-cyan-500"
              />
              {isOutsideSafeRange('humidity_min', values.humidity_min) && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {language === 'bn' ? 'এই মান মুরগির জন্য ঝুঁকিপূর্ণ হতে পারে' : 'This value may be risky for birds'}
                </p>
              )}
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{language === 'bn' ? 'সর্বোচ্চ' : 'Maximum'}</span>
                <span className="font-mono font-semibold text-blue-500">{values.humidity_max}%</span>
              </div>
              <Slider
                value={[values.humidity_max]}
                onValueChange={([val]) => setValues(v => ({ ...v, humidity_max: val }))}
                min={60}
                max={100}
                step={5}
                className="[&_[role=slider]]:bg-blue-500"
              />
              {isOutsideSafeRange('humidity_max', values.humidity_max) && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {language === 'bn' ? 'এই মান মুরগির জন্য ঝুঁকিপূর্ণ হতে পারে' : 'This value may be risky for birds'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ammonia Max */}
        <div className="rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-4">
          <div className="mb-1 flex items-center gap-2">
            <Wind size={16} className="text-yellow-600" />
            <Label className="font-medium">
              {language === 'bn' ? 'অ্যামোনিয়া সর্বোচ্চ সীমা' : 'Ammonia Maximum Limit'}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {language === 'bn' 
              ? '💡 বেশি হলে শ্বাসকষ্ট হতে পারে — ২৫ ppm এর নিচে রাখুন'
              : '💡 High levels cause respiratory problems — keep below 25 ppm'}
          </p>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{language === 'bn' ? 'সর্বোচ্চ অনুমোদিত' : 'Maximum Allowed'}</span>
              <span className="font-mono font-semibold text-amber-500">{values.ammonia_max} ppm</span>
            </div>
            <Slider
              value={[values.ammonia_max]}
              onValueChange={([val]) => setValues(v => ({ ...v, ammonia_max: val }))}
              min={10}
              max={50}
              step={5}
              className="[&_[role=slider]]:bg-amber-500"
            />
            {isOutsideSafeRange('ammonia_max', values.ammonia_max) && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                {language === 'bn' ? 'এই মান মুরগির জন্য ঝুঁকিপূর্ণ হতে পারে' : 'This value may be risky for birds'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          onClick={handleResetToSafeDefaults}
          className="flex-1"
          size="sm"
        >
          <ShieldCheck size={16} className="mr-2" />
          {language === 'bn' ? 'নিরাপদ সেটিং' : 'Safe Defaults'}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges}
          className="flex-1"
          size="sm"
        >
          <RotateCcw size={16} className="mr-2" />
          {language === 'bn' ? 'রিসেট' : 'Reset'}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
          className="flex-1"
          size="sm"
        >
          <Save size={16} className="mr-2" />
          {updateSettings.isPending 
            ? (language === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...')
            : (language === 'bn' ? 'সেভ' : 'Save')}
        </Button>
      </div>

      {/* Safe status footer */}
      <div className="mt-4 rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground text-center">
          {language === 'bn' 
            ? '💡 এই সেটিংস অটোমেশন রুল এবং অ্যালার্ট সিস্টেমে ব্যবহৃত হয়'
            : '💡 These settings are used by automation rules and alert system'}
        </p>
      </div>

      {/* Unsafe value confirmation dialog */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {language === 'bn' ? 'ঝুঁকিপূর্ণ মান সনাক্ত হয়েছে' : 'Risky Values Detected'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn' 
                ? 'কিছু মান নিরাপদ সীমার বাইরে আছে। এতে মুরগির ক্ষতি হতে পারে। আপনি কি নিশ্চিত?'
                : 'Some values are outside the safe range. This could harm the birds. Are you sure?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={doSave} className="bg-amber-600 hover:bg-amber-700">
              {language === 'bn' ? 'হ্যাঁ, সেভ করুন' : 'Yes, Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
