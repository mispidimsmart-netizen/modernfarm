import { useMemo } from 'react';
import { useWeatherCache } from '@/hooks/useWeather';
import { useDeviceStatus } from '@/hooks/useFarmData';
import { useAuth } from '@/context/AuthContext';
import { differenceInHours } from 'date-fns';

export interface HeatStressRiskResult {
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: {
    weatherHot: boolean;
    humidityHigh: boolean;
    fanRunningLong: boolean;
    fanRunningHours: number;
  };
  tomorrowForecast: {
    maxTemp: number | null;
    avgHumidity: number | null;
  };
  message: {
    bn: string;
    en: string;
  };
  recommendations: {
    bn: string[];
    en: string[];
  };
}

const HOT_TEMP_THRESHOLD = 32; // °C
const HIGH_HUMIDITY_THRESHOLD = 75; // %
const LONG_FAN_RUNTIME_HOURS = 4;

/**
 * Parse tomorrow's forecast from weather cache
 */
function getTomorrowForecast(forecastJson: any): { maxTemp: number | null; avgHumidity: number | null } {
  if (!forecastJson?.daily) {
    return { maxTemp: null, avgHumidity: null };
  }

  try {
    const daily = forecastJson.daily;
    // Index 1 = tomorrow
    const maxTemp = daily.temperature_2m_max?.[1] ?? null;
    const avgHumidity = daily.relative_humidity_2m_mean?.[1] ?? null;
    
    return { maxTemp, avgHumidity };
  } catch {
    return { maxTemp: null, avgHumidity: null };
  }
}

/**
 * Calculate risk score based on conditions
 */
function calculateRiskScore(
  weatherHot: boolean,
  humidityHigh: boolean,
  fanRunningLong: boolean,
  tomorrowMaxTemp: number | null,
  tomorrowHumidity: number | null
): number {
  let score = 0;

  // Current conditions (40% weight)
  if (weatherHot) score += 15;
  if (humidityHigh) score += 15;
  if (fanRunningLong) score += 10;

  // Tomorrow's forecast (60% weight)
  if (tomorrowMaxTemp !== null) {
    if (tomorrowMaxTemp >= 40) score += 35;
    else if (tomorrowMaxTemp >= 36) score += 25;
    else if (tomorrowMaxTemp >= 32) score += 15;
  }

  if (tomorrowHumidity !== null) {
    if (tomorrowHumidity >= 85) score += 25;
    else if (tomorrowHumidity >= 75) score += 15;
    else if (tomorrowHumidity >= 65) score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Get risk level from score
 */
function getRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

/**
 * Get message based on risk level
 */
function getMessage(riskLevel: string, tomorrowMaxTemp: number | null): { bn: string; en: string } {
  switch (riskLevel) {
    case 'critical':
      return {
        bn: `⚠️ আগামীকাল গুরুতর তাপ চাপের ঝুঁকি! সর্বোচ্চ ${tomorrowMaxTemp ?? '--'}°C`,
        en: `⚠️ Critical heat stress risk tomorrow! Max ${tomorrowMaxTemp ?? '--'}°C`
      };
    case 'high':
      return {
        bn: `🔴 আগামীকাল উচ্চ তাপ চাপের সম্ভাবনা। প্রস্তুতি নিন`,
        en: `🔴 High heat stress risk tomorrow. Prepare now`
      };
    case 'moderate':
      return {
        bn: `🟡 আগামীকাল মাঝারি তাপ চাপের সম্ভাবনা`,
        en: `🟡 Moderate heat stress risk tomorrow`
      };
    default:
      return {
        bn: `✅ আগামীকাল স্বাভাবিক আবহাওয়া প্রত্যাশিত`,
        en: `✅ Normal weather expected tomorrow`
      };
  }
}

/**
 * Get recommendations based on risk
 */
function getRecommendations(riskLevel: string): { bn: string[]; en: string[] } {
  switch (riskLevel) {
    case 'critical':
      return {
        bn: [
          'অতিরিক্ত পানি সরবরাহ নিশ্চিত করুন',
          'সকাল থেকেই ফ্যান চালু রাখুন',
          'খাবার দেওয়ার সময় পরিবর্তন করুন',
          'জরুরি কুলিং সিস্টেম প্রস্তুত রাখুন',
        ],
        en: [
          'Ensure extra water supply',
          'Start fans early morning',
          'Adjust feeding schedule',
          'Keep emergency cooling ready',
        ],
      };
    case 'high':
      return {
        bn: [
          'পানির ট্যাংক পূর্ণ রাখুন',
          'বায়ু চলাচল বাড়ান',
          'দুপুরে খাবার দেওয়া এড়িয়ে চলুন',
        ],
        en: [
          'Keep water tanks full',
          'Increase ventilation',
          'Avoid feeding at noon',
        ],
      };
    case 'moderate':
      return {
        bn: [
          'পানির সরবরাহ পর্যবেক্ষণ করুন',
          'ফ্যান সেটিংস চেক করুন',
        ],
        en: [
          'Monitor water supply',
          'Check fan settings',
        ],
      };
    default:
      return {
        bn: ['স্বাভাবিক কার্যক্রম চালিয়ে যান'],
        en: ['Continue normal operations'],
      };
  }
}

export function useHeatStressRiskPrediction(): HeatStressRiskResult | null {
  const { user } = useAuth();
  const { data: weatherData } = useWeatherCache();
  const { data: deviceStatus } = useDeviceStatus();

  return useMemo(() => {
    if (!user || !weatherData) {
      return null;
    }

    // Current conditions
    const currentTemp = weatherData.temperature ?? 0;
    const currentHumidity = weatherData.humidity ?? 0;
    const weatherHot = currentTemp >= HOT_TEMP_THRESHOLD;
    const humidityHigh = currentHumidity >= HIGH_HUMIDITY_THRESHOLD;

    // Fan runtime calculation
    const fanOn = deviceStatus?.fan_on ?? false;
    const lastUpdated = deviceStatus?.updated_at 
      ? new Date(deviceStatus.updated_at)
      : new Date();
    const fanRunningHours = fanOn 
      ? differenceInHours(new Date(), lastUpdated)
      : 0;
    const fanRunningLong = fanRunningHours >= LONG_FAN_RUNTIME_HOURS;

    // Tomorrow's forecast
    const tomorrowForecast = getTomorrowForecast(weatherData.forecast_json);

    // Calculate risk
    const riskScore = calculateRiskScore(
      weatherHot,
      humidityHigh,
      fanRunningLong,
      tomorrowForecast.maxTemp,
      tomorrowForecast.avgHumidity
    );
    const riskLevel = getRiskLevel(riskScore);

    return {
      riskLevel,
      riskScore,
      factors: {
        weatherHot,
        humidityHigh,
        fanRunningLong,
        fanRunningHours: Math.max(fanRunningHours, 0),
      },
      tomorrowForecast,
      message: getMessage(riskLevel, tomorrowForecast.maxTemp),
      recommendations: getRecommendations(riskLevel),
    };
  }, [user, weatherData, deviceStatus]);
}
