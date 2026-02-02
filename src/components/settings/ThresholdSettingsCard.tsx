import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings, useUpdateFarmSettings } from '@/hooks/useFarmData';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface ThresholdValues {
  temperature_min: number;
  temperature_max: number;
  humidity_min: number;
  humidity_max: number;
  ammonia_max: number;
}

const defaultValues: ThresholdValues = {
  temperature_min: 18,
  temperature_max: 32,
  humidity_min: 40,
  humidity_max: 80,
  ammonia_max: 25,
};

export function ThresholdSettingsCard() {
  const { language } = useAuth();
  const { data: settings, isLoading } = useFarmSettings();
  const updateSettings = useUpdateFarmSettings();
  
  const [values, setValues] = useState<ThresholdValues>(defaultValues);
  const [hasChanges, setHasChanges] = useState(false);

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

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(values);
      toast.success(
        language === 'bn' ? 'থ্রেশহোল্ড সেভ হয়েছে!' : 'Thresholds saved!'
      );
      setHasChanges(false);
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
        {hasChanges && (
          <span className="text-xs text-amber-500 font-medium">
            {language === 'bn' ? 'অসংরক্ষিত পরিবর্তন' : 'Unsaved changes'}
          </span>
        )}
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        {language === 'bn' 
          ? 'এই সীমা অতিক্রম করলে অ্যালার্ট পাঠানো হবে এবং অটোমেশন কাজ করবে।'
          : 'Alerts will be triggered and automation will activate when these limits are exceeded.'}
      </p>

      <div className="space-y-6">
        {/* Temperature Range */}
        <div className="rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Thermometer size={16} className="text-orange-500" />
            <Label className="font-medium">
              {language === 'bn' ? 'তাপমাত্রা সীমা' : 'Temperature Range'}
            </Label>
          </div>
          
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
            </div>
          </div>
          
          <p className="mt-2 text-xs text-muted-foreground">
            {language === 'bn' 
              ? `স্বাভাবিক পরিসীমা: ${values.temperature_min}°C - ${values.temperature_max}°C`
              : `Normal range: ${values.temperature_min}°C - ${values.temperature_max}°C`}
          </p>
        </div>

        {/* Humidity Range */}
        <div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Droplets size={16} className="text-blue-500" />
            <Label className="font-medium">
              {language === 'bn' ? 'আর্দ্রতা সীমা' : 'Humidity Range'}
            </Label>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {language === 'bn' ? 'সর্বনিম্ন' : 'Minimum'}
                </span>
                <span className="font-mono font-semibold text-cyan-500">
                  {values.humidity_min}%
                </span>
              </div>
              <Slider
                value={[values.humidity_min]}
                onValueChange={([val]) => setValues(v => ({ ...v, humidity_min: val }))}
                min={20}
                max={60}
                step={5}
                className="[&_[role=slider]]:bg-cyan-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {language === 'bn' ? 'সর্বোচ্চ' : 'Maximum'}
                </span>
                <span className="font-mono font-semibold text-blue-500">
                  {values.humidity_max}%
                </span>
              </div>
              <Slider
                value={[values.humidity_max]}
                onValueChange={([val]) => setValues(v => ({ ...v, humidity_max: val }))}
                min={60}
                max={100}
                step={5}
                className="[&_[role=slider]]:bg-blue-500"
              />
            </div>
          </div>
          
          <p className="mt-2 text-xs text-muted-foreground">
            {language === 'bn' 
              ? `স্বাভাবিক পরিসীমা: ${values.humidity_min}% - ${values.humidity_max}%`
              : `Normal range: ${values.humidity_min}% - ${values.humidity_max}%`}
          </p>
        </div>

        {/* Ammonia Max */}
        <div className="rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Wind size={16} className="text-yellow-600" />
            <Label className="font-medium">
              {language === 'bn' ? 'অ্যামোনিয়া সর্বোচ্চ সীমা' : 'Ammonia Maximum Limit'}
            </Label>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {language === 'bn' ? 'সর্বোচ্চ অনুমোদিত' : 'Maximum Allowed'}
              </span>
              <span className="font-mono font-semibold text-amber-500">
                {values.ammonia_max} ppm
              </span>
            </div>
            <Slider
              value={[values.ammonia_max]}
              onValueChange={([val]) => setValues(v => ({ ...v, ammonia_max: val }))}
              min={10}
              max={50}
              step={5}
              className="[&_[role=slider]]:bg-amber-500"
            />
          </div>
          
          <p className="mt-2 text-xs text-muted-foreground">
            {language === 'bn' 
              ? `⚠️ ${values.ammonia_max} ppm এর বেশি হলে অ্যালার্ট হবে`
              : `⚠️ Alert when above ${values.ammonia_max} ppm`}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges}
          className="flex-1"
        >
          <RotateCcw size={16} className="mr-2" />
          {language === 'bn' ? 'রিসেট' : 'Reset'}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
          className="flex-1"
        >
          <Save size={16} className="mr-2" />
          {updateSettings.isPending 
            ? (language === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...')
            : (language === 'bn' ? 'সেভ করুন' : 'Save')}
        </Button>
      </div>

      {/* Quick Info */}
      <div className="mt-4 rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground text-center">
          {language === 'bn' 
            ? '💡 এই সেটিংস অটোমেশন রুল এবং অ্যালার্ট সিস্টেমে ব্যবহৃত হয়'
            : '💡 These settings are used by automation rules and alert system'}
        </p>
      </div>
    </motion.div>
  );
}
