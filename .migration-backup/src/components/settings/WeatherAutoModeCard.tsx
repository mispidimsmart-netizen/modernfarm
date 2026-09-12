import { useState } from 'react';
import { Cloud, Thermometer, Droplets, AlertTriangle, Settings2, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  useWeatherAutoModeConfig, 
  useUpdateWeatherAutoModeConfig,
  useWeatherModeSuggestion 
} from '@/hooks/useWeatherAutoMode';
import { useWeatherCache } from '@/hooks/useWeather';
import { SMART_MODE_PROFILES } from '@/hooks/useSmartModeProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

export function WeatherAutoModeCard() {
  const { language } = useAuth();
  const { data: config, isLoading } = useWeatherAutoModeConfig();
  const { data: weather } = useWeatherCache();
  const updateConfig = useUpdateWeatherAutoModeConfig();
  const suggestion = useWeatherModeSuggestion();
  
  const [showSettings, setShowSettings] = useState(false);

  const t = {
    title: { bn: 'আবহাওয়া অটো-মোড', en: 'Weather Auto-Mode' },
    description: { 
      bn: 'আবহাওয়ার উপর ভিত্তি করে স্বয়ংক্রিয়ভাবে মোড পরিবর্তন', 
      en: 'Automatically switch modes based on weather' 
    },
    enabled: { bn: 'সক্রিয়', en: 'Enabled' },
    disabled: { bn: 'নিষ্ক্রিয়', en: 'Disabled' },
    currentWeather: { bn: 'বর্তমান আবহাওয়া', en: 'Current Weather' },
    suggestedMode: { bn: 'সাজেস্টেড মোড', en: 'Suggested Mode' },
    thresholds: { bn: 'থ্রেশহোল্ড সেটিংস', en: 'Threshold Settings' },
    summerTemp: { bn: 'গ্রীষ্ম মোড শুরু', en: 'Summer mode starts' },
    winterTemp: { bn: 'শীত মোড শুরু', en: 'Winter mode starts' },
    rainProb: { bn: 'বর্ষা মোড শুরু', en: 'Rainy mode starts' },
    emergencyTemp: { bn: 'জরুরি মোড শুরু', en: 'Emergency mode starts' },
    noWeather: { bn: 'আবহাওয়া তথ্য নেই', en: 'No weather data' },
    because: { bn: 'কারণ', en: 'because' },
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (enabled: boolean) => {
    updateConfig.mutate({ enabled });
  };

  const handleThresholdChange = (key: string, value: number) => {
    updateConfig.mutate({ [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="h-5 w-5 text-sky-500" />
            {t.title[language]}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-mode-toggle" className="text-sm text-muted-foreground">
              {config?.enabled ? t.enabled[language] : t.disabled[language]}
            </Label>
            <Switch
              id="auto-mode-toggle"
              checked={config?.enabled ?? false}
              onCheckedChange={handleToggle}
              disabled={updateConfig.isPending}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t.description[language]}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Weather Status */}
        {weather ? (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {weather.weather_icon || '🌤️'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{weather.temperature}°C</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Droplets className="h-3 w-3 text-blue-500" />
                  <span>{weather.rain_probability ?? 0}%</span>
                </div>
              </div>
            </div>

            {/* Suggested Mode */}
            {suggestion && config?.enabled && (
              <div className="text-right">
                <Badge className={suggestion.profile?.bgColor}>
                  {suggestion.profile?.icon} {suggestion.profile?.name[language]}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  {language === 'bn' ? suggestion.reason : suggestion.reasonEn}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
            {t.noWeather[language]}
          </div>
        )}

        {/* Mode Indicators */}
        {config?.enabled && (
          <div className="grid grid-cols-5 gap-1.5">
            {SMART_MODE_PROFILES.map((profile) => (
              <div
                key={profile.id}
                className={`rounded-lg p-2 text-center transition-all ${
                  suggestion?.mode === profile.id
                    ? `${profile.bgColor} ring-2 ring-primary`
                    : 'bg-muted/30 opacity-50'
                }`}
              >
                <div className="text-lg">{profile.icon}</div>
                <div className="text-[10px] font-medium truncate">
                  {profile.name[language].split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Threshold Settings (Collapsible) */}
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                {t.thresholds[language]}
              </span>
              <Zap className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Summer Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  🌞 {t.summerTemp[language]}
                </Label>
                <span className="text-sm font-medium">
                  {config?.summer_temp_threshold ?? 32}°C+
                </span>
              </div>
              <Slider
                value={[config?.summer_temp_threshold ?? 32]}
                min={25}
                max={40}
                step={1}
                onValueCommit={([v]) => handleThresholdChange('summer_temp_threshold', v)}
                className="py-2"
              />
            </div>

            {/* Winter Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  ❄️ {t.winterTemp[language]}
                </Label>
                <span className="text-sm font-medium">
                  {config?.winter_temp_threshold ?? 18}°C-
                </span>
              </div>
              <Slider
                value={[config?.winter_temp_threshold ?? 18]}
                min={10}
                max={25}
                step={1}
                onValueCommit={([v]) => handleThresholdChange('winter_temp_threshold', v)}
                className="py-2"
              />
            </div>

            {/* Rain Probability Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  🌧️ {t.rainProb[language]}
                </Label>
                <span className="text-sm font-medium">
                  {config?.rain_probability_threshold ?? 60}%+
                </span>
              </div>
              <Slider
                value={[config?.rain_probability_threshold ?? 60]}
                min={30}
                max={90}
                step={5}
                onValueCommit={([v]) => handleThresholdChange('rain_probability_threshold', v)}
                className="py-2"
              />
            </div>

            {/* Emergency Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  🚨 {t.emergencyTemp[language]}
                </Label>
                <span className="text-sm font-medium text-red-500">
                  {config?.emergency_temp_threshold ?? 38}°C+
                </span>
              </div>
              <Slider
                value={[config?.emergency_temp_threshold ?? 38]}
                min={35}
                max={45}
                step={1}
                onValueCommit={([v]) => handleThresholdChange('emergency_temp_threshold', v)}
                className="py-2"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Last Mode Change Info */}
        {config?.last_auto_mode && config?.last_mode_change && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            {language === 'bn' 
              ? `শেষ পরিবর্তন: ${SMART_MODE_PROFILES.find(p => p.id === config.last_auto_mode)?.name.bn}`
              : `Last change: ${SMART_MODE_PROFILES.find(p => p.id === config.last_auto_mode)?.name.en}`
            }
            {' - '}
            {new Date(config.last_mode_change).toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
