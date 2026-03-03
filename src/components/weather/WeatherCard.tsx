import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Droplets, Wind, MapPin, RefreshCw, ThermometerSun, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWeatherCache, useFetchWeather, useCurrentLocation, useWeatherSettings } from '@/hooks/useWeather';
import { useWeatherAutoMode } from '@/hooks/useWeatherAutoMode';
import { SMART_MODE_PROFILES } from '@/hooks/useSmartModeProfiles';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function WeatherCard() {
  const { language } = useAuth();
  const { data: weather, isLoading: weatherLoading } = useWeatherCache();
  const { data: settings } = useWeatherSettings();
  const { currentAutoMode, isEnabled: autoModeEnabled } = useWeatherAutoMode();
  const fetchWeather = useFetchWeather();
  const getLocation = useCurrentLocation();

  // Auto-refresh weather data
  useEffect(() => {
    if (!settings?.location_lat || !settings?.location_lng) return;
    
    const shouldRefresh = () => {
      if (!weather?.fetched_at) return true;
      const lastFetch = new Date(weather.fetched_at).getTime();
      return Date.now() - lastFetch > AUTO_REFRESH_INTERVAL;
    };

    // Initial check
    if (shouldRefresh()) {
      fetchWeather.mutate({
        lat: settings.location_lat,
        lng: settings.location_lng,
        location_name: settings.location_name || undefined,
      });
    }

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      if (shouldRefresh()) {
        fetchWeather.mutate({
          lat: settings.location_lat!,
          lng: settings.location_lng!,
          location_name: settings.location_name || undefined,
        });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [settings?.location_lat, settings?.location_lng, settings?.location_name, weather?.fetched_at]);

  const handleRefresh = async () => {
    try {
      let lat = settings?.location_lat;
      let lng = settings?.location_lng;

      // If no saved location, get current location
      if (!lat || !lng) {
        const location = await getLocation.mutateAsync();
        lat = location.lat;
        lng = location.lng;
      }

      await fetchWeather.mutateAsync({
        lat: lat!,
        lng: lng!,
        location_name: settings?.location_name || undefined,
      });

      toast.success(language === 'bn' ? 'আবহাওয়া আপডেট হয়েছে' : 'Weather updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch weather');
    }
  };

  const handleGetLocation = async () => {
    try {
      const location = await getLocation.mutateAsync();
      await fetchWeather.mutateAsync({
        lat: location.lat,
        lng: location.lng,
      });
      toast.success(language === 'bn' ? 'লোকেশন সেট হয়েছে' : 'Location set');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get location');
    }
  };

  const isRefreshing = fetchWeather.isPending || getLocation.isPending;

  if (weatherLoading) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!weather) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 p-4 shadow-card"
      >
        <div className="text-center">
          <Cloud className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
          <p className="mb-3 text-sm text-muted-foreground">
            {language === 'bn' ? 'আবহাওয়া দেখতে লোকেশন সেট করুন' : 'Set location to see weather'}
          </p>
          <Button
            size="sm"
            onClick={handleGetLocation}
            disabled={isRefreshing}
            className="gap-2"
          >
            <MapPin size={16} />
            {language === 'bn' ? 'বর্তমান লোকেশন' : 'Current Location'}
          </Button>
        </div>
      </motion.div>
    );
  }

  const isOld = weather.fetched_at && 
    new Date().getTime() - new Date(weather.fetched_at).getTime() > 30 * 60 * 1000;

  const autoModeProfile = currentAutoMode 
    ? SMART_MODE_PROFILES.find(p => p.id === currentAutoMode) 
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 p-4 shadow-card"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{weather.weather_icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {language === 'bn' ? '🌤️ বাইরের আবহাওয়া' : '🌤️ Outside Weather'}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {settings?.location_name || (language === 'bn' ? 'আপনার এলাকা' : 'Your Area')}
              {' · '}{weather.weather_condition}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <ThermometerSun className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-lg font-bold">{weather.temperature?.toFixed(1)}°C</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'অনুভূত' : 'Feels'} {weather.feels_like?.toFixed(1)}°
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-lg font-bold">{weather.humidity?.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'আর্দ্রতা' : 'Humidity'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Wind className="h-5 w-5 text-cyan-500" />
          <div>
            <p className="text-lg font-bold">{weather.wind_speed?.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">km/h</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-gray-500" />
          <div>
            <p className="text-lg font-bold">{weather.rain_probability?.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'বৃষ্টি' : 'Rain'}
            </p>
          </div>
        </div>
      </div>

      {/* Hourly Forecast Bar */}
      <HourlyForecastBar forecast={weather.forecast_json} language={language} />

      {/* Auto Mode Badge */}
      {autoModeEnabled && autoModeProfile && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Zap className="h-3 w-3 text-primary" />
          <Badge variant="outline" className={`${autoModeProfile.bgColor} ${autoModeProfile.color}`}>
            {autoModeProfile.icon} {autoModeProfile.name[language]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {language === 'bn' ? 'অটো-মোড' : 'Auto-Mode'}
          </span>
        </div>
      )}

      {isOld && (
        <p className="mt-2 text-center text-xs text-yellow-600">
          {language === 'bn' ? '⚠️ ডেটা পুরনো - রিফ্রেশ করুন' : '⚠️ Data is old - refresh'}
        </p>
      )}
    </motion.div>
  );
}

// ── Hourly Forecast Mini Bar ──
function HourlyForecastBar({ forecast, language }: { forecast: any; language: string }) {
  if (!forecast?.hourly?.time) return null;

  const now = new Date();
  const currentHourIndex = forecast.hourly.time.findIndex((t: string) => {
    const hour = new Date(t);
    return hour >= now;
  });

  if (currentHourIndex < 0) return null;

  const hours = [];
  for (let i = currentHourIndex; i < Math.min(currentHourIndex + 6, forecast.hourly.time.length); i++) {
    const time = new Date(forecast.hourly.time[i]);
    const temp = forecast.hourly.temperature_2m?.[i];
    const rain = forecast.hourly.precipitation_probability?.[i] ?? 0;
    hours.push({ time, temp, rain });
  }

  if (hours.length === 0) return null;

  const temps = hours.map(h => h.temp).filter((t): t is number => t != null);
  const minTemp = temps.length ? Math.min(...temps) : 0;
  const maxTemp = temps.length ? Math.max(...temps) : 1;
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className="mt-3 pt-3 border-t border-white/20">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {language === 'bn' ? 'পরবর্তী ৬ ঘণ্টা' : 'Next 6 Hours'}
      </p>
      <div className="flex items-end justify-between gap-1">
        {hours.map((h, i) => {
          const barHeight = h.temp != null ? 16 + ((h.temp - minTemp) / tempRange) * 24 : 20;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[9px] font-bold">
                {h.temp != null ? `${Math.round(h.temp)}°` : '--'}
              </span>
              <div
                className={`w-full rounded-sm ${h.rain > 50 ? 'bg-blue-400/60' : 'bg-orange-400/50'}`}
                style={{ height: `${barHeight}px` }}
              />
              {h.rain > 0 && (
                <span className="text-[8px] text-blue-400">💧{h.rain}%</span>
              )}
              <span className="text-[9px] text-muted-foreground">
                {h.time.getHours().toString().padStart(2, '0')}:00
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
