import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lightbulb, Save, Sunrise, Sunset, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLightingCurve, useUpdateLightingSchedule } from '@/hooks/useLightingCurve';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { generateCurveData, LightingCurveSettings as CurveSettings } from '@/lib/lightingCurve';

export function LightingCurveSettings() {
  const { language } = useAuth();
  const { schedule, isLoading } = useLightingCurve();
  const updateSchedule = useUpdateLightingSchedule();

  const [gradualEnabled, setGradualEnabled] = useState(true);
  const [fadeInMinutes, setFadeInMinutes] = useState(30);
  const [fadeOutMinutes, setFadeOutMinutes] = useState(30);
  const [minBrightness, setMinBrightness] = useState(0);
  const [maxBrightness, setMaxBrightness] = useState(100);
  const [startTime, setStartTime] = useState('05:00');
  const [endTime, setEndTime] = useState('21:00');

  useEffect(() => {
    if (schedule) {
      setGradualEnabled(schedule.gradual_enabled ?? true);
      setFadeInMinutes(schedule.fade_in_minutes ?? 30);
      setFadeOutMinutes(schedule.fade_out_minutes ?? 30);
      setMinBrightness(schedule.min_brightness ?? 0);
      setMaxBrightness(schedule.max_brightness ?? 100);
      setStartTime(typeof schedule.start_time === 'string' ? schedule.start_time.slice(0, 5) : '05:00');
      setEndTime(typeof schedule.end_time === 'string' ? schedule.end_time.slice(0, 5) : '21:00');
    }
  }, [schedule]);

  const previewSettings: CurveSettings = {
    gradualEnabled,
    fadeInMinutes,
    fadeOutMinutes,
    minBrightness,
    maxBrightness,
    startTime,
    endTime,
  };

  const previewData = generateCurveData(previewSettings);

  const handleSave = () => {
    updateSchedule.mutate({
      start_time: startTime,
      end_time: endTime,
      gradual_enabled: gradualEnabled,
      fade_in_minutes: fadeInMinutes,
      fade_out_minutes: fadeOutMinutes,
      min_brightness: minBrightness,
      max_brightness: maxBrightness,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          {language === 'bn' ? 'স্মার্ট লাইটিং কার্ভ সেটিংস' : 'Smart Lighting Curve Settings'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gradual Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">
              {language === 'bn' ? 'গ্র্যাজুয়াল মোড' : 'Gradual Mode'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {language === 'bn' 
                ? 'ধীরে ধীরে আলো বাড়ানো/কমানো' 
                : 'Gradually increase/decrease light'
              }
            </p>
          </div>
          <Switch
            checked={gradualEnabled}
            onCheckedChange={setGradualEnabled}
          />
        </div>

        {/* Time Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Sunrise className="h-4 w-4 text-orange-500" />
              {language === 'bn' ? 'শুরুর সময়' : 'Start Time'}
            </Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Sunset className="h-4 w-4 text-purple-500" />
              {language === 'bn' ? 'শেষের সময়' : 'End Time'}
            </Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Fade Settings (only when gradual enabled) */}
        {gradualEnabled && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-orange-500" />
                    {language === 'bn' ? 'ফেড ইন সময়' : 'Fade In Duration'}
                  </Label>
                  <span className="text-sm font-medium">{fadeInMinutes} min</span>
                </div>
                <Slider
                  value={[fadeInMinutes]}
                  onValueChange={([v]) => setFadeInMinutes(v)}
                  min={10}
                  max={60}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? `সকালে 0% → 100% (${fadeInMinutes} মিনিট)` 
                    : `Morning 0% → 100% (${fadeInMinutes} min)`
                  }
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-purple-500" />
                    {language === 'bn' ? 'ফেড আউট সময়' : 'Fade Out Duration'}
                  </Label>
                  <span className="text-sm font-medium">{fadeOutMinutes} min</span>
                </div>
                <Slider
                  value={[fadeOutMinutes]}
                  onValueChange={([v]) => setFadeOutMinutes(v)}
                  min={10}
                  max={60}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? `সন্ধ্যায় 100% → 0% (${fadeOutMinutes} মিনিট)` 
                    : `Evening 100% → 0% (${fadeOutMinutes} min)`
                  }
                </p>
              </div>
            </div>

            {/* Brightness Range */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{language === 'bn' ? 'সর্বনিম্ন উজ্জ্বলতা' : 'Min Brightness'}</Label>
                  <span className="text-sm font-medium">{minBrightness}%</span>
                </div>
                <Slider
                  value={[minBrightness]}
                  onValueChange={([v]) => setMinBrightness(v)}
                  min={0}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{language === 'bn' ? 'সর্বোচ্চ উজ্জ্বলতা' : 'Max Brightness'}</Label>
                  <span className="text-sm font-medium">{maxBrightness}%</span>
                </div>
                <Slider
                  value={[maxBrightness]}
                  onValueChange={([v]) => setMaxBrightness(v)}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          </>
        )}

        {/* Preview Chart */}
        <div className="space-y-2">
          <Label>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</Label>
          <div className="h-32 w-full rounded-lg border bg-muted/30 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={previewData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="previewGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => val.slice(0, 2)}
                  interval={7}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Area
                  type="monotone"
                  dataKey="brightness"
                  stroke="hsl(var(--primary))"
                  fill="url(#previewGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Benefits Info */}
        {gradualEnabled && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm">
            <p className="font-medium text-green-700 dark:text-green-300 mb-1">
              {language === 'bn' ? '📈 সুবিধা' : '📈 Benefits'}
            </p>
            <ul className="space-y-1 text-green-600 dark:text-green-400 text-xs">
              <li>• {language === 'bn' ? 'মুরগির স্ট্রেস কম' : 'Less stress for chickens'}</li>
              <li>• {language === 'bn' ? 'ডিম পাড়ার ধারাবাহিকতা বাড়ে' : 'Better egg laying consistency'}</li>
              <li>• {language === 'bn' ? 'প্রাকৃতিক আলোর অনুকরণ' : 'Mimics natural daylight'}</li>
            </ul>
          </div>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          className="w-full"
          disabled={updateSchedule.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {updateSchedule.isPending 
            ? (language === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...') 
            : (language === 'bn' ? 'সেভ করুন' : 'Save Settings')
          }
        </Button>
      </CardContent>
    </Card>
  );
}
