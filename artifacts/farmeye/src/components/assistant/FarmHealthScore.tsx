import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useWeatherCache } from '@/hooks/useWeather';
import { useSensorValidation } from '@/hooks/useSensorValidation';
import { Card, CardContent } from '@/components/ui/card';

interface ScoreBreakdown {
  temperature: number;
  humidity: number;
  ammonia: number;
  sensors: number;
  devices: number;
}

function FarmHealthScoreImpl() {
  const { language } = useAuth();
  const { sensorData, isConnected, hasRealData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { data: settings } = useFarmSettings();
  const { data: weather } = useWeatherCache();
  const { issues: sensorIssues } = useSensorValidation(sensorData);

  // Calculate score 0-100
  const { score, breakdown, trend, label } = useMemo(() => {
    // No fresh sensor data → don't fabricate a score; show neutral "unknown".
    if (!hasRealData) {
      return {
        score: 0,
        breakdown: { temperature: 0, humidity: 0, ammonia: 0, sensors: 0, devices: 0 },
        trend: 'stable' as const,
        label: { bn: 'সেন্সর ডেটা নেই 📡', en: 'No sensor data 📡' },
      };
    }

    let tempScore = 100;
    let humScore = 100;
    let ammoniaScore = 100;
    let sensorScore = 100;
    let deviceScore = 100;

    const temp = sensorData.temperature;
    const hum = sensorData.humidity;
    const ammonia = sensorData.ammonia;

    // Temperature scoring (ideal: 22-28°C)
    if (temp < 18 || temp > 35) tempScore = 20;
    else if (temp < 20 || temp > 32) tempScore = 50;
    else if (temp < 22 || temp > 30) tempScore = 75;
    else tempScore = 100;

    // Humidity scoring (ideal: 50-70%)
    if (hum < 30 || hum > 90) humScore = 20;
    else if (hum < 40 || hum > 80) humScore = 50;
    else if (hum < 50 || hum > 70) humScore = 75;
    else humScore = 100;

    // Ammonia scoring (ideal: < 10 ppm)
    if (ammonia > 25) ammoniaScore = 10;
    else if (ammonia > 20) ammoniaScore = 30;
    else if (ammonia > 15) ammoniaScore = 60;
    else if (ammonia > 10) ammoniaScore = 80;
    else ammoniaScore = 100;

    // Sensor health scoring
    if (sensorIssues.length > 2) sensorScore = 30;
    else if (sensorIssues.length > 0) sensorScore = 70;
    else sensorScore = 100;

    // Device connectivity scoring
    if (!isConnected) deviceScore = 20;
    else {
      const activeDevices = [deviceStatus.power, deviceStatus.fan, deviceStatus.light].filter(Boolean).length;
      deviceScore = activeDevices > 0 ? 100 : 70;
    }

    // Weighted average
    const totalScore = Math.round(
      (tempScore * 0.30) +
      (humScore * 0.20) +
      (ammoniaScore * 0.25) +
      (sensorScore * 0.15) +
      (deviceScore * 0.10)
    );

    // Determine trend (simplified - could compare to previous)
    let scoreTrend: 'up' | 'down' | 'stable' = 'stable';
    if (totalScore > 80) scoreTrend = 'up';
    else if (totalScore < 50) scoreTrend = 'down';

    // Label
    let scoreLabel: { bn: string; en: string };
    if (totalScore >= 90) scoreLabel = { bn: 'চমৎকার! 🌟', en: 'Excellent! 🌟' };
    else if (totalScore >= 75) scoreLabel = { bn: 'ভালো 👍', en: 'Good 👍' };
    else if (totalScore >= 50) scoreLabel = { bn: 'মোটামুটি ⚠️', en: 'Fair ⚠️' };
    else scoreLabel = { bn: 'সমস্যা আছে 🚨', en: 'Needs Attention 🚨' };

    return {
      score: totalScore,
      breakdown: { temperature: tempScore, humidity: humScore, ammonia: ammoniaScore, sensors: sensorScore, devices: deviceScore },
      trend: scoreTrend,
      label: scoreLabel,
    };
  }, [sensorData, deviceStatus, sensorIssues, isConnected, hasRealData]);

  // Gradient based on score
  const getGradient = () => {
    if (score >= 80) return 'from-emerald-500 via-green-500 to-teal-500';
    if (score >= 60) return 'from-amber-500 via-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 via-red-400 to-rose-500';
    return 'from-red-600 via-rose-600 to-pink-600';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card className="overflow-hidden border-0 shadow-xl">
      <CardContent className="p-0">
        <div className={`relative bg-gradient-to-br ${getGradient()} p-5`}>
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-black/10 blur-xl" />
          </div>

          <div className="relative z-10 flex items-center gap-4">
            {/* Score Circle */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 shadow-xl">
                <div className="text-center">
                  <motion.span
                    key={score}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-black text-white drop-shadow-lg"
                  >
                    {score}
                  </motion.span>
                  <span className="text-xs text-white/80 block -mt-1">/100</span>
                </div>
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full animate-ping bg-white/20 opacity-50" style={{ animationDuration: '2s' }} />
            </motion.div>

            {/* Score Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/70 font-medium uppercase tracking-wider">
                  {language === 'bn' ? 'ফার্ম স্কোর' : 'Farm Score'}
                </span>
              </div>
              
              <p className="text-xl font-bold text-white mb-2">
                {label[language]}
              </p>

              {/* Trend indicator */}
              <div className="flex items-center gap-1.5 text-white/90">
                <TrendIcon className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {trend === 'up' 
                    ? (language === 'bn' ? 'উন্নতি হচ্ছে' : 'Improving')
                    : trend === 'down'
                    ? (language === 'bn' ? 'নিচে নামছে' : 'Declining')
                    : (language === 'bn' ? 'স্থিতিশীল' : 'Stable')
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="relative z-10 mt-4 grid grid-cols-5 gap-2">
            {[
              { key: 'temperature', icon: '🌡️', value: breakdown.temperature },
              { key: 'humidity', icon: '💧', value: breakdown.humidity },
              { key: 'ammonia', icon: '💨', value: breakdown.ammonia },
              { key: 'sensors', icon: '📡', value: breakdown.sensors },
              { key: 'devices', icon: '⚡', value: breakdown.devices },
            ].map(({ key, icon, value }) => (
              <div key={key} className="text-center">
                <span className="text-lg">{icon}</span>
                <div className="h-1.5 rounded-full bg-white/20 mt-1 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export const FarmHealthScore = memo(FarmHealthScoreImpl);
