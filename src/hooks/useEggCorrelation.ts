import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { subDays, format, parseISO, differenceInDays } from 'date-fns';

export interface CorrelationInsight {
  id: string;
  type: 'temperature' | 'humidity' | 'ammonia' | 'weather' | 'trend';
  severity: 'info' | 'warning' | 'success';
  title: {
    bn: string;
    en: string;
  };
  description: {
    bn: string;
    en: string;
  };
  dataPoints: {
    date: string;
    eggs: number;
    avgTemp?: number;
    avgHumidity?: number;
    avgAmmonia?: number;
  }[];
  correlation: number; // -1 to 1
  confidence: 'low' | 'medium' | 'high';
}

interface DailyData {
  date: string;
  eggs: number;
  avgTemp: number;
  avgHumidity: number;
  avgAmmonia: number;
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Get confidence level based on data points
 */
function getConfidence(dataPoints: number): 'low' | 'medium' | 'high' {
  if (dataPoints >= 14) return 'high';
  if (dataPoints >= 7) return 'medium';
  return 'low';
}

export function useEggCorrelation() {
  const { user } = useAuth();

  // Fetch last 30 days of egg production
  const { data: eggData } = useQuery({
    queryKey: ['egg-correlation-eggs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('egg_production')
        .select('production_date, total_eggs')
        .eq('user_id', user.id)
        .gte('production_date', startDate)
        .order('production_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch sensor readings for same period
  const { data: sensorData } = useQuery({
    queryKey: ['egg-correlation-sensors', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const startDate = subDays(new Date(), 30);
      
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('recorded_at, temperature, humidity, ammonia')
        .eq('user_id', user.id)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const insights = useMemo<CorrelationInsight[]>(() => {
    if (!eggData?.length || !sensorData?.length) return [];

    // Group sensor data by date and calculate daily averages
    const sensorByDate: Record<string, { temps: number[]; humidities: number[]; ammonias: number[] }> = {};
    
    sensorData.forEach(reading => {
      const date = format(parseISO(reading.recorded_at), 'yyyy-MM-dd');
      if (!sensorByDate[date]) {
        sensorByDate[date] = { temps: [], humidities: [], ammonias: [] };
      }
      sensorByDate[date].temps.push(Number(reading.temperature));
      sensorByDate[date].humidities.push(Number(reading.humidity));
      sensorByDate[date].ammonias.push(Number(reading.ammonia));
    });

    // Create daily data combining eggs and sensor averages
    const dailyData: DailyData[] = eggData.map(egg => {
      const date = egg.production_date;
      const sensors = sensorByDate[date];
      
      return {
        date,
        eggs: egg.total_eggs,
        avgTemp: sensors?.temps.length 
          ? sensors.temps.reduce((a, b) => a + b, 0) / sensors.temps.length 
          : 0,
        avgHumidity: sensors?.humidities.length 
          ? sensors.humidities.reduce((a, b) => a + b, 0) / sensors.humidities.length 
          : 0,
        avgAmmonia: sensors?.ammonias.length 
          ? sensors.ammonias.reduce((a, b) => a + b, 0) / sensors.ammonias.length 
          : 0,
      };
    }).filter(d => d.avgTemp > 0); // Only include days with sensor data

    if (dailyData.length < 3) return [];

    const eggs = dailyData.map(d => d.eggs);
    const temps = dailyData.map(d => d.avgTemp);
    const humidities = dailyData.map(d => d.avgHumidity);
    const ammonias = dailyData.map(d => d.avgAmmonia);

    const allInsights: CorrelationInsight[] = [];
    const confidence = getConfidence(dailyData.length);

    // 1. Temperature correlation
    const tempCorrelation = calculateCorrelation(temps, eggs);
    if (Math.abs(tempCorrelation) > 0.3) {
      const isNegative = tempCorrelation < 0;
      allInsights.push({
        id: 'temp-correlation',
        type: 'temperature',
        severity: isNegative ? 'warning' : 'info',
        title: isNegative 
          ? { bn: '🔴 উচ্চ তাপমাত্রায় ডিম কমে', en: '🔴 High Temperature = Egg Drop' }
          : { bn: '🟢 তাপমাত্রা ঠিক থাকলে ডিম বাড়ে', en: '🟢 Optimal Temp = More Eggs' },
        description: isNegative
          ? { 
              bn: `তাপমাত্রা বেশি থাকলে ডিম উৎপাদন ${Math.abs(tempCorrelation * 100).toFixed(0)}% কমে যাচ্ছে`,
              en: `Egg production drops ${Math.abs(tempCorrelation * 100).toFixed(0)}% with high temperatures`
            }
          : {
              bn: `সঠিক তাপমাত্রায় ডিম উৎপাদন ${Math.abs(tempCorrelation * 100).toFixed(0)}% ভালো`,
              en: `Egg production ${Math.abs(tempCorrelation * 100).toFixed(0)}% better at optimal temps`
            },
        dataPoints: dailyData.map(d => ({
          date: d.date,
          eggs: d.eggs,
          avgTemp: d.avgTemp,
        })),
        correlation: tempCorrelation,
        confidence,
      });
    }

    // 2. Humidity correlation
    const humidityCorrelation = calculateCorrelation(humidities, eggs);
    if (Math.abs(humidityCorrelation) > 0.3) {
      const isNegative = humidityCorrelation < 0;
      allInsights.push({
        id: 'humidity-correlation',
        type: 'humidity',
        severity: isNegative ? 'warning' : 'info',
        title: isNegative
          ? { bn: '💧 উচ্চ আর্দ্রতায় সমস্যা', en: '💧 High Humidity Issue' }
          : { bn: '✅ আর্দ্রতা ঠিক আছে', en: '✅ Humidity Optimal' },
        description: {
          bn: `আর্দ্রতা এবং ডিম উৎপাদনের মধ্যে ${Math.abs(humidityCorrelation * 100).toFixed(0)}% সম্পর্ক পাওয়া গেছে`,
          en: `${Math.abs(humidityCorrelation * 100).toFixed(0)}% correlation found between humidity and egg production`
        },
        dataPoints: dailyData.map(d => ({
          date: d.date,
          eggs: d.eggs,
          avgHumidity: d.avgHumidity,
        })),
        correlation: humidityCorrelation,
        confidence,
      });
    }

    // 3. Ammonia correlation
    const ammoniaCorrelation = calculateCorrelation(ammonias, eggs);
    if (Math.abs(ammoniaCorrelation) > 0.25) {
      allInsights.push({
        id: 'ammonia-correlation',
        type: 'ammonia',
        severity: 'warning',
        title: { bn: '⚠️ অ্যামোনিয়া প্রভাব', en: '⚠️ Ammonia Impact' },
        description: {
          bn: `অ্যামোনিয়া বাড়লে ডিম ${Math.abs(ammoniaCorrelation * 100).toFixed(0)}% কমে`,
          en: `Eggs drop ${Math.abs(ammoniaCorrelation * 100).toFixed(0)}% when ammonia rises`
        },
        dataPoints: dailyData.map(d => ({
          date: d.date,
          eggs: d.eggs,
          avgAmmonia: d.avgAmmonia,
        })),
        correlation: ammoniaCorrelation,
        confidence,
      });
    }

    // 4. Trend analysis
    if (dailyData.length >= 7) {
      const lastWeek = eggs.slice(-7);
      const prevWeek = eggs.slice(-14, -7);
      
      if (prevWeek.length >= 7) {
        const lastAvg = lastWeek.reduce((a, b) => a + b, 0) / lastWeek.length;
        const prevAvg = prevWeek.reduce((a, b) => a + b, 0) / prevWeek.length;
        const change = ((lastAvg - prevAvg) / prevAvg) * 100;

        if (Math.abs(change) > 5) {
          allInsights.push({
            id: 'weekly-trend',
            type: 'trend',
            severity: change > 0 ? 'success' : 'warning',
            title: change > 0
              ? { bn: '📈 সাপ্তাহিক উন্নতি', en: '📈 Weekly Improvement' }
              : { bn: '📉 সাপ্তাহিক হ্রাস', en: '📉 Weekly Decline' },
            description: {
              bn: `গত সপ্তাহে ডিম উৎপাদন ${change > 0 ? 'বেড়েছে' : 'কমেছে'} ${Math.abs(change).toFixed(1)}%`,
              en: `Egg production ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% this week`
            },
            dataPoints: dailyData.slice(-14).map(d => ({
              date: d.date,
              eggs: d.eggs,
            })),
            correlation: change / 100,
            confidence,
          });
        }
      }
    }

    return allInsights;
  }, [eggData, sensorData]);

  const summary = useMemo(() => {
    const warnings = insights.filter(i => i.severity === 'warning').length;
    const positives = insights.filter(i => i.severity === 'success').length;
    const totalDays = eggData?.length || 0;

    return { warnings, positives, totalDays, totalInsights: insights.length };
  }, [insights, eggData]);

  return { insights, summary, isLoading: !eggData };
}
