import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, Thermometer, Droplets, AlertTriangle, Wind, Sun, Cloud, CloudRain } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useWeatherCache } from '@/hooks/useWeather';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function HourlyForecastCard() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { data: weather } = useWeatherCache();
  const { data: history } = useSensorHistory(3);

  const forecast = useMemo(() => {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const formattedTime = nextHour.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    // Calculate temperature trend from history
    let tempTrend: 'rising' | 'falling' | 'stable' = 'stable';
    let tempChange = 0;
    
    if (history && history.length >= 2) {
      const recentTemp = history.slice(-6); // Last 30 mins if 5-min intervals
      const firstTemp = recentTemp[0]?.temperature || sensorData.temperature;
      const lastTemp = recentTemp[recentTemp.length - 1]?.temperature || sensorData.temperature;
      tempChange = lastTemp - firstTemp;
      
      if (tempChange > 0.5) tempTrend = 'rising';
      else if (tempChange < -0.5) tempTrend = 'falling';
    }

    // Predict next hour based on current trend and weather
    const outsideTemp = weather?.temperature || null;
    const currentHour = now.getHours();
    const isHeatingPeriod = currentHour >= 9 && currentHour <= 15; // Morning to afternoon
    const isCoolingPeriod = currentHour >= 17 || currentHour <= 6; // Evening to early morning

    let predictedChange = tempChange; // Continue current trend
    
    // Adjust based on time of day
    if (isHeatingPeriod) {
      predictedChange = Math.max(predictedChange, 0.3); // Likely to rise
    } else if (isCoolingPeriod) {
      predictedChange = Math.min(predictedChange, -0.2); // Likely to fall
    }

    // Adjust based on outside weather
    if (outsideTemp !== null) {
      const delta = outsideTemp - sensorData.temperature;
      if (delta > 5) predictedChange += 0.5; // Much hotter outside
      else if (delta < -5) predictedChange -= 0.3; // Much cooler outside
    }

    const predictedTemp = Math.round((sensorData.temperature + predictedChange) * 10) / 10;

    // Generate warnings
    const warnings: { icon: React.ElementType; text: { bn: string; en: string }; severity: 'info' | 'warning' | 'danger' }[] = [];

    if (predictedTemp > 32) {
      warnings.push({
        icon: Thermometer,
        text: { bn: 'তাপমাত্রা বাড়তে পারে', en: 'Temperature may rise' },
        severity: 'warning',
      });
    }

    if (predictedTemp > 35) {
      warnings.push({
        icon: AlertTriangle,
        text: { bn: 'হিট স্ট্রেস ঝুঁকি!', en: 'Heat stress risk!' },
        severity: 'danger',
      });
    }

    // Check weather condition
    const weatherCondition = weather?.weather_condition?.toLowerCase() || '';
    if (weatherCondition.includes('rain')) {
      warnings.push({
        icon: CloudRain,
        text: { bn: 'বৃষ্টির সম্ভাবনা', en: 'Rain expected' },
        severity: 'info',
      });
    }

    // Humidity forecast (simplified)
    let humTrend: 'up' | 'down' | 'stable' = 'stable';
    if (weather?.humidity && sensorData.humidity) {
      if (weather.humidity > sensorData.humidity + 10) humTrend = 'up';
      else if (weather.humidity < sensorData.humidity - 10) humTrend = 'down';
    }

    // Determine weather icon
    const getWeatherIcon = () => {
      if (weatherCondition.includes('cloud')) return Cloud;
      if (weatherCondition.includes('rain')) return CloudRain;
      return Sun;
    };

    return {
      nextHour: formattedTime,
      currentTemp: sensorData.temperature,
      predictedTemp,
      tempTrend,
      tempChange: Math.abs(tempChange).toFixed(1),
      humTrend,
      outsideTemp,
      warnings,
      weatherIcon: getWeatherIcon(),
    };
  }, [sensorData, weather, history, language]);

  const TempTrendIcon = forecast.tempTrend === 'rising' ? TrendingUp : forecast.tempTrend === 'falling' ? TrendingDown : Wind;
  const WeatherIcon = forecast.weatherIcon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Clock className="h-4 w-4" />
            </div>
            <span>{language === 'bn' ? 'পরবর্তী ঘন্টা' : 'Next Hour'}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {forecast.nextHour}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {/* Main prediction */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">
                {language === 'bn' ? 'এখন' : 'Now'}
              </p>
              <p className="text-2xl font-bold">{forecast.currentTemp.toFixed(1)}°</p>
            </div>
            
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <TempTrendIcon className={`h-5 w-5 ${
                forecast.tempTrend === 'rising' ? 'text-orange-500' 
                : forecast.tempTrend === 'falling' ? 'text-blue-500' 
                : 'text-muted-foreground'
              }`} />
            </motion.div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">
                {language === 'bn' ? 'পূর্বাভাস' : 'Predicted'}
              </p>
              <p className={`text-2xl font-bold ${
                forecast.predictedTemp > 32 ? 'text-orange-500' 
                : forecast.predictedTemp < 20 ? 'text-blue-500'
                : 'text-emerald-500'
              }`}>
                {forecast.predictedTemp.toFixed(1)}°
              </p>
            </div>
          </div>

          {/* Weather */}
          {forecast.outsideTemp !== null && (
            <div className="text-right">
              <WeatherIcon className="h-8 w-8 text-amber-400 mb-1 mx-auto" />
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'বাইরে' : 'Outside'}: {forecast.outsideTemp.toFixed(0)}°
              </p>
            </div>
          )}
        </div>

        {/* Trend info */}
        <div className="flex items-center gap-4 text-xs mb-3 p-2 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1.5">
            <Thermometer className="h-3.5 w-3.5 text-orange-400" />
            <span>
              {forecast.tempTrend === 'rising' 
                ? (language === 'bn' ? `↑ ${forecast.tempChange}° বাড়ছে` : `↑ ${forecast.tempChange}° rising`)
                : forecast.tempTrend === 'falling'
                ? (language === 'bn' ? `↓ ${forecast.tempChange}° কমছে` : `↓ ${forecast.tempChange}° falling`)
                : (language === 'bn' ? '→ স্থিতিশীল' : '→ Stable')
              }
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-cyan-400" />
            <span>
              {forecast.humTrend === 'up'
                ? (language === 'bn' ? '↑ আর্দ্রতা বাড়বে' : '↑ Humidity rising')
                : forecast.humTrend === 'down'
                ? (language === 'bn' ? '↓ আর্দ্রতা কমবে' : '↓ Humidity falling')
                : (language === 'bn' ? '→ স্থিতিশীল' : '→ Stable')
              }
            </span>
          </div>
        </div>

        {/* Warnings */}
        {forecast.warnings.length > 0 && (
          <div className="space-y-2">
            {forecast.warnings.map(({ icon: Icon, text, severity }, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                  severity === 'danger' ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : severity === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{text[language]}</span>
              </motion.div>
            ))}
          </div>
        )}

        {forecast.warnings.length === 0 && (
          <div className="text-center text-xs text-emerald-600 dark:text-emerald-400 p-2 rounded-lg bg-emerald-500/10">
            ✨ {language === 'bn' ? 'পরবর্তী ঘন্টা ভালো থাকবে!' : 'Next hour looks good!'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
