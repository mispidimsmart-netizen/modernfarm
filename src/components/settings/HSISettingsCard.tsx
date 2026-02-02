import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Save, RotateCcw, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings, useUpdateFarmSettings } from '@/hooks/useFarmData';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface HSIValues {
  hsi_mild_threshold: number;
  hsi_moderate_threshold: number;
  hsi_severe_threshold: number;
  hsi_emergency_threshold: number;
  hsi_automation_enabled: boolean;
}

const defaultValues: HSIValues = {
  hsi_mild_threshold: 70,
  hsi_moderate_threshold: 75,
  hsi_severe_threshold: 80,
  hsi_emergency_threshold: 85,
  hsi_automation_enabled: true,
};

export function HSISettingsCard() {
  const { language } = useAuth();
  const { data: settings, isLoading } = useFarmSettings();
  const updateSettings = useUpdateFarmSettings();
  const { toast } = useToast();
  
  const [values, setValues] = useState<HSIValues>(defaultValues);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      const newValues: HSIValues = {
        hsi_mild_threshold: Number(settings.hsi_mild_threshold) || defaultValues.hsi_mild_threshold,
        hsi_moderate_threshold: Number(settings.hsi_moderate_threshold) || defaultValues.hsi_moderate_threshold,
        hsi_severe_threshold: Number(settings.hsi_severe_threshold) || defaultValues.hsi_severe_threshold,
        hsi_emergency_threshold: Number(settings.hsi_emergency_threshold) || defaultValues.hsi_emergency_threshold,
        hsi_automation_enabled: settings.hsi_automation_enabled ?? defaultValues.hsi_automation_enabled,
      };
      setValues(newValues);
    }
  }, [settings]);

  useEffect(() => {
    if (settings) {
      const changed = 
        values.hsi_mild_threshold !== (Number(settings.hsi_mild_threshold) || defaultValues.hsi_mild_threshold) ||
        values.hsi_moderate_threshold !== (Number(settings.hsi_moderate_threshold) || defaultValues.hsi_moderate_threshold) ||
        values.hsi_severe_threshold !== (Number(settings.hsi_severe_threshold) || defaultValues.hsi_severe_threshold) ||
        values.hsi_emergency_threshold !== (Number(settings.hsi_emergency_threshold) || defaultValues.hsi_emergency_threshold) ||
        values.hsi_automation_enabled !== (settings.hsi_automation_enabled ?? defaultValues.hsi_automation_enabled);
      setHasChanges(changed);
    }
  }, [values, settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(values);
      toast({
        title: language === 'bn' ? 'সেভ হয়েছে' : 'Saved',
        description: language === 'bn' ? 'HSI সেটিংস আপডেট হয়েছে' : 'HSI settings updated',
      });
    } catch (error) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    setValues(defaultValues);
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHSIColor = (level: string) => {
    switch (level) {
      case 'mild': return 'text-yellow-600';
      case 'moderate': return 'text-orange-500';
      case 'severe': return 'text-red-500';
      case 'emergency': return 'text-red-700';
      default: return 'text-muted-foreground';
    }
  };

  const getSliderColor = (level: string) => {
    switch (level) {
      case 'mild': return '[&_[role=slider]]:bg-yellow-500';
      case 'moderate': return '[&_[role=slider]]:bg-orange-500';
      case 'severe': return '[&_[role=slider]]:bg-red-500';
      case 'emergency': return '[&_[role=slider]]:bg-red-700';
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Thermometer className="h-5 w-5 text-primary" />
              {language === 'bn' ? 'হিট স্ট্রেস ইনডেক্স (HSI) সেটিংস' : 'Heat Stress Index (HSI) Settings'}
            </CardTitle>
            {hasChanges && (
              <span className="text-xs text-amber-600">
                {language === 'bn' ? 'অসংরক্ষিত পরিবর্তন' : 'Unsaved changes'}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Automation Toggle */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  {language === 'bn' ? 'HSI অটোমেশন' : 'HSI Automation'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? 'HSI বেশি হলে স্বয়ংক্রিয়ভাবে ফ্যান চালু' : 'Auto turn on fan when HSI is high'}
                </p>
              </div>
            </div>
            <Switch
              checked={values.hsi_automation_enabled}
              onCheckedChange={(checked) => setValues(v => ({ ...v, hsi_automation_enabled: checked }))}
            />
          </div>

          {/* HSI Formula Info */}
          <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">HSI = 0.8×T + (H/100)×(T-14.4) + 46.4</p>
            <p>{language === 'bn' ? 'T = তাপমাত্রা (°C), H = আর্দ্রতা (%)' : 'T = Temperature (°C), H = Humidity (%)'}</p>
          </div>

          {/* Threshold Sliders */}
          <div className="space-y-5">
            {/* Mild Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={`text-sm ${getHSIColor('mild')}`}>
                  {language === 'bn' ? 'হালকা চাপ থ্রেশহোল্ড' : 'Mild Stress Threshold'}
                </Label>
                <span className={`text-lg font-bold ${getHSIColor('mild')}`}>
                  {values.hsi_mild_threshold}
                </span>
              </div>
              <Slider
                value={[values.hsi_mild_threshold]}
                onValueChange={([val]) => setValues(v => ({ ...v, hsi_mild_threshold: val }))}
                min={60}
                max={75}
                step={1}
                className={getSliderColor('mild')}
              />
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'এর উপরে ফ্যান চালু হবে' : 'Fan turns ON above this'}
              </p>
            </div>

            {/* Moderate Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={`text-sm ${getHSIColor('moderate')}`}>
                  {language === 'bn' ? 'মাঝারি চাপ থ্রেশহোল্ড' : 'Moderate Stress Threshold'}
                </Label>
                <span className={`text-lg font-bold ${getHSIColor('moderate')}`}>
                  {values.hsi_moderate_threshold}
                </span>
              </div>
              <Slider
                value={[values.hsi_moderate_threshold]}
                onValueChange={([val]) => setValues(v => ({ ...v, hsi_moderate_threshold: val }))}
                min={70}
                max={82}
                step={1}
                className={getSliderColor('moderate')}
              />
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'এর উপরে সতর্কতা অ্যালার্ট' : 'Warning alert above this'}
              </p>
            </div>

            {/* Severe Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={`text-sm ${getHSIColor('severe')}`}>
                  {language === 'bn' ? 'গুরুতর চাপ থ্রেশহোল্ড' : 'Severe Stress Threshold'}
                </Label>
                <span className={`text-lg font-bold ${getHSIColor('severe')}`}>
                  {values.hsi_severe_threshold}
                </span>
              </div>
              <Slider
                value={[values.hsi_severe_threshold]}
                onValueChange={([val]) => setValues(v => ({ ...v, hsi_severe_threshold: val }))}
                min={75}
                max={88}
                step={1}
                className={getSliderColor('severe')}
              />
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'এর উপরে বিপদ অ্যালার্ট' : 'Danger alert above this'}
              </p>
            </div>

            {/* Emergency Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={`text-sm ${getHSIColor('emergency')}`}>
                  {language === 'bn' ? 'জরুরি থ্রেশহোল্ড' : 'Emergency Threshold'}
                </Label>
                <span className={`text-lg font-bold ${getHSIColor('emergency')}`}>
                  {values.hsi_emergency_threshold}
                </span>
              </div>
              <Slider
                value={[values.hsi_emergency_threshold]}
                onValueChange={([val]) => setValues(v => ({ ...v, hsi_emergency_threshold: val }))}
                min={80}
                max={95}
                step={1}
                className={getSliderColor('emergency')}
              />
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'জরুরি অবস্থা - তাৎক্ষণিক পদক্ষেপ প্রয়োজন' : 'Emergency - immediate action required'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {language === 'bn' ? 'ডিফল্ট' : 'Reset'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateSettings.isPending}
              className="flex-1 gap-2"
            >
              <Save className="h-4 w-4" />
              {updateSettings.isPending 
                ? (language === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...')
                : (language === 'bn' ? 'সেভ করুন' : 'Save')
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
