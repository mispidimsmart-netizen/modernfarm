import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Droplets } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings, useUpdateFarmSettings } from '@/hooks/useFarmData';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

const DEFAULT_WATER_ANOMALY_THRESHOLD = 15;

export function WaterAnomalySettingsCard() {
  const { language } = useAuth();
  const { data: settings, isLoading } = useFarmSettings();
  const updateSettings = useUpdateFarmSettings();
  const { toast } = useToast();

  const [threshold, setThreshold] = useState(DEFAULT_WATER_ANOMALY_THRESHOLD);

  useEffect(() => {
    if (settings) {
      setThreshold(Number(settings.water_anomaly_threshold) || DEFAULT_WATER_ANOMALY_THRESHOLD);
    }
  }, [settings]);

  const handleSave = (value: number) => {
    updateSettings.mutate(
      { water_anomaly_threshold: value },
      {
        onSuccess: () => {
          toast({
            title: language === 'bn' ? 'সেটিংস সেভ হয়েছে' : 'Settings saved',
            description: language === 'bn' 
              ? `পানি অ্যানোমালি থ্রেশহোল্ড ${value}% সেট করা হয়েছে` 
              : `Water anomaly threshold set to ${value}%`,
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-lg">
            {language === 'bn' ? 'পানি ব্যবহার সতর্কতা' : 'Water Usage Alert'}
          </CardTitle>
        </div>
        <CardDescription>
          {language === 'bn' 
            ? 'পানি ব্যবহার কত শতাংশ কমলে স্বাস্থ্য সতর্কতা দেখাবে' 
            : 'Health alert threshold when water usage drops'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <Label>
              {language === 'bn' ? 'হ্রাস থ্রেশহোল্ড' : 'Drop Threshold'}
            </Label>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {threshold}%
            </span>
          </div>
          <Slider
            value={[threshold]}
            min={5}
            max={50}
            step={1}
            onValueChange={([value]) => setThreshold(value)}
            onValueCommit={([value]) => handleSave(value)}
          />
          <p className="text-xs text-muted-foreground">
            {language === 'bn' 
              ? `পানি ব্যবহার ৩ দিনের গড় থেকে ${threshold}% কমলে সতর্কতা` 
              : `Alert when usage drops ${threshold}% below 3-day average`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
