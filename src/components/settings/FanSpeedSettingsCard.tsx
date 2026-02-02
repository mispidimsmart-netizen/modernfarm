import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Fan } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings, useUpdateFarmSettings } from '@/hooks/useFarmData';
import { DEFAULT_FAN_SPEED_THRESHOLDS } from '@/hooks/useFanSpeedAutomation';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export function FanSpeedSettingsCard() {
  const { language } = useAuth();
  const { data: settings, isLoading } = useFarmSettings();
  const updateSettings = useUpdateFarmSettings();
  const { toast } = useToast();

  const [localSettings, setLocalSettings] = useState({
    fanLowTempMin: DEFAULT_FAN_SPEED_THRESHOLDS.fanLowTempMin,
    fanLowTempMax: DEFAULT_FAN_SPEED_THRESHOLDS.fanLowTempMax,
    fanMediumTempMin: DEFAULT_FAN_SPEED_THRESHOLDS.fanMediumTempMin,
    fanMediumTempMax: DEFAULT_FAN_SPEED_THRESHOLDS.fanMediumTempMax,
    fanHighTempMin: DEFAULT_FAN_SPEED_THRESHOLDS.fanHighTempMin,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        fanLowTempMin: Number(settings.fan_low_temp_min) || DEFAULT_FAN_SPEED_THRESHOLDS.fanLowTempMin,
        fanLowTempMax: Number(settings.fan_low_temp_max) || DEFAULT_FAN_SPEED_THRESHOLDS.fanLowTempMax,
        fanMediumTempMin: Number(settings.fan_medium_temp_min) || DEFAULT_FAN_SPEED_THRESHOLDS.fanMediumTempMin,
        fanMediumTempMax: Number(settings.fan_medium_temp_max) || DEFAULT_FAN_SPEED_THRESHOLDS.fanMediumTempMax,
        fanHighTempMin: Number(settings.fan_high_temp_min) || DEFAULT_FAN_SPEED_THRESHOLDS.fanHighTempMin,
      });
    }
  }, [settings]);

  const handleSave = (field: string, value: number) => {
    const fieldMap: Record<string, string> = {
      fanLowTempMin: 'fan_low_temp_min',
      fanLowTempMax: 'fan_low_temp_max',
      fanMediumTempMin: 'fan_medium_temp_min',
      fanMediumTempMax: 'fan_medium_temp_max',
      fanHighTempMin: 'fan_high_temp_min',
    };

    updateSettings.mutate(
      { [fieldMap[field]]: value },
      {
        onSuccess: () => {
          toast({
            title: language === 'bn' ? 'সেটিংস সেভ হয়েছে' : 'Settings saved',
            description: language === 'bn' ? 'ফ্যান স্পিড থ্রেশহোল্ড আপডেট হয়েছে' : 'Fan speed threshold updated',
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse h-40 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Fan className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">
            {language === 'bn' ? 'ফ্যান স্পিড সেটিংস' : 'Fan Speed Settings'}
          </CardTitle>
        </div>
        <CardDescription>
          {language === 'bn' 
            ? 'তাপমাত্রা অনুযায়ী স্বয়ংক্রিয় ফ্যান গতি নিয়ন্ত্রণ' 
            : 'Automatic fan speed control based on temperature'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* LOW Speed Range */}
        <div className="space-y-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                LOW
              </Badge>
              {language === 'bn' ? 'নিম্ন গতি' : 'Low Speed'}
            </Label>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {localSettings.fanLowTempMin}°C - {localSettings.fanLowTempMax}°C
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {language === 'bn' ? 'শুরু' : 'Start'}
              </Label>
              <Slider
                value={[localSettings.fanLowTempMin]}
                min={20}
                max={35}
                step={0.5}
                onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, fanLowTempMin: value }))}
                onValueCommit={([value]) => handleSave('fanLowTempMin', value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {language === 'bn' ? 'শেষ' : 'End'}
              </Label>
              <Slider
                value={[localSettings.fanLowTempMax]}
                min={20}
                max={35}
                step={0.5}
                onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, fanLowTempMax: value }))}
                onValueCommit={([value]) => handleSave('fanLowTempMax', value)}
              />
            </div>
          </div>
        </div>

        {/* MEDIUM Speed Range */}
        <div className="space-y-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                MEDIUM
              </Badge>
              {language === 'bn' ? 'মাঝারি গতি' : 'Medium Speed'}
            </Label>
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              {localSettings.fanMediumTempMin}°C - {localSettings.fanMediumTempMax}°C
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {language === 'bn' ? 'শুরু' : 'Start'}
              </Label>
              <Slider
                value={[localSettings.fanMediumTempMin]}
                min={25}
                max={40}
                step={0.5}
                onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, fanMediumTempMin: value }))}
                onValueCommit={([value]) => handleSave('fanMediumTempMin', value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {language === 'bn' ? 'শেষ' : 'End'}
              </Label>
              <Slider
                value={[localSettings.fanMediumTempMax]}
                min={25}
                max={40}
                step={0.5}
                onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, fanMediumTempMax: value }))}
                onValueCommit={([value]) => handleSave('fanMediumTempMax', value)}
              />
            </div>
          </div>
        </div>

        {/* HIGH Speed Threshold */}
        <div className="space-y-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                HIGH
              </Badge>
              {language === 'bn' ? 'সর্বোচ্চ গতি' : 'High Speed'}
            </Label>
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              ≥ {localSettings.fanHighTempMin}°C
            </span>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {language === 'bn' ? 'শুরু তাপমাত্রা' : 'Start Temperature'}
            </Label>
            <Slider
              value={[localSettings.fanHighTempMin]}
              min={28}
              max={45}
              step={0.5}
              onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, fanHighTempMin: value }))}
              onValueCommit={([value]) => handleSave('fanHighTempMin', value)}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {language === 'bn' 
            ? 'তাপমাত্রা পরিবর্তনের সাথে সাথে ফ্যানের গতি স্বয়ংক্রিয়ভাবে সামঞ্জস্য হবে'
            : 'Fan speed will automatically adjust as temperature changes'}
        </p>
      </CardContent>
    </Card>
  );
}
