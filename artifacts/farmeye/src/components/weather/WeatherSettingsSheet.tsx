import { useState, useEffect } from 'react';
import { Settings2, MapPin, ThermometerSun, CloudRain, Flame } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWeatherSettings, useUpdateWeatherSettings, useFetchWeather, useCurrentLocation } from '@/hooks/useWeather';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface WeatherSettingsSheetProps {
  trigger: React.ReactNode;
}

export function WeatherSettingsSheet({ trigger }: WeatherSettingsSheetProps) {
  const { language } = useAuth();
  const { data: settings } = useWeatherSettings();
  const updateSettings = useUpdateWeatherSettings();
  const fetchWeather = useFetchWeather();
  const getLocation = useCurrentLocation();

  const [localSettings, setLocalSettings] = useState({
    location_name: '',
    auto_fan_adjustment: true,
    rain_alert_enabled: true,
    heat_wave_protection: true,
    heat_wave_threshold: 35,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        location_name: settings.location_name || '',
        auto_fan_adjustment: settings.auto_fan_adjustment,
        rain_alert_enabled: settings.rain_alert_enabled,
        heat_wave_protection: settings.heat_wave_protection,
        heat_wave_threshold: settings.heat_wave_threshold,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(localSettings);
      toast.success(language === 'bn' ? 'সেটিংস সংরক্ষিত' : 'Settings saved');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSetLocation = async () => {
    try {
      const location = await getLocation.mutateAsync();
      await fetchWeather.mutateAsync({
        lat: location.lat,
        lng: location.lng,
        location_name: localSettings.location_name,
      });
      toast.success(language === 'bn' ? 'লোকেশন আপডেট হয়েছে' : 'Location updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get location');
    }
  };

  const isLoading = updateSettings.isPending || fetchWeather.isPending || getLocation.isPending;

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {language === 'bn' ? 'আবহাওয়া সেটিংস' : 'Weather Settings'}
          </SheetTitle>
          <SheetDescription>
            {language === 'bn' ? 'আবহাওয়া এবং স্মার্ট অটোমেশন সেটিংস কনফিগার করুন' : 'Configure weather and smart automation settings'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Location */}
          <div className="space-y-3 rounded-xl bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin size={16} className="text-primary" />
              {language === 'bn' ? 'লোকেশন' : 'Location'}
            </div>
            
            <Input
              placeholder={language === 'bn' ? 'এলাকার নাম (যেমন: ঢাকা)' : 'Location name (e.g. Dhaka)'}
              value={localSettings.location_name}
              onChange={(e) => setLocalSettings({ ...localSettings, location_name: e.target.value })}
            />

            <Button
              variant="outline"
              onClick={handleSetLocation}
              disabled={isLoading}
              className="w-full gap-2"
            >
              <MapPin size={16} />
              {language === 'bn' ? 'বর্তমান লোকেশন সেট করুন' : 'Set Current Location'}
            </Button>

            {settings?.location_lat && (
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'সংরক্ষিত' : 'Saved'}: {settings.location_lat?.toFixed(4)}, {settings.location_lng?.toFixed(4)}
              </p>
            )}
          </div>

          {/* Smart Automation Settings */}
          <div className="space-y-4 rounded-xl bg-muted/50 p-4">
            <p className="text-sm font-medium">
              {language === 'bn' ? 'স্মার্ট অটোমেশন' : 'Smart Automation'}
            </p>

            {/* Auto Fan Adjustment */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThermometerSun size={18} className="text-orange-500" />
                <div>
                  <p className="text-sm font-medium">
                    {language === 'bn' ? 'তাপমাত্রা অ্যাডজাস্টমেন্ট' : 'Temperature Adjustment'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'বাইরের তাপমাত্রা অনুযায়ী ফ্যান নিয়ন্ত্রণ' : 'Control fan based on outside temperature'}
                  </p>
                </div>
              </div>
              <Switch
                checked={localSettings.auto_fan_adjustment}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, auto_fan_adjustment: checked })}
              />
            </div>

            {/* Rain Alert */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudRain size={18} className="text-blue-500" />
                <div>
                  <p className="text-sm font-medium">
                    {language === 'bn' ? 'বৃষ্টির সতর্কতা' : 'Rain Alert'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'বৃষ্টি আসলে নোটিফিকেশন পান' : 'Get notified when rain is expected'}
                  </p>
                </div>
              </div>
              <Switch
                checked={localSettings.rain_alert_enabled}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, rain_alert_enabled: checked })}
              />
            </div>

            {/* Heat Wave Protection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-red-500" />
                <div>
                  <p className="text-sm font-medium">
                    {language === 'bn' ? 'হিট ওয়েভ প্রোটেকশন' : 'Heat Wave Protection'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'অতিরিক্ত গরমে বিশেষ সতর্কতা' : 'Special alert for extreme heat'}
                  </p>
                </div>
              </div>
              <Switch
                checked={localSettings.heat_wave_protection}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, heat_wave_protection: checked })}
              />
            </div>

            {localSettings.heat_wave_protection && (
              <div className="flex items-center justify-between pl-6">
                <span className="text-sm text-muted-foreground">
                  {language === 'bn' ? 'থ্রেশহোল্ড তাপমাত্রা' : 'Threshold Temperature'}
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={localSettings.heat_wave_threshold}
                    onChange={(e) => setLocalSettings({ ...localSettings, heat_wave_threshold: Number(e.target.value) })}
                    className="h-8 w-16 text-center"
                  />
                  <span className="text-sm">°C</span>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading
              ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
              : (language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Settings')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
