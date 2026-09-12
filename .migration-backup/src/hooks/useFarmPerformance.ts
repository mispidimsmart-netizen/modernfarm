import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { useFlockInfo } from '@/hooks/useFarmManagement';
export interface DailyMetrics {
  date: string;
  avgTemperature: number;
  tempStabilityScore: number; // 0-100
  heatStressMinutes: number;
  humidityStability: number; // 0-100
  waterConsumption: number;
  ventilationRuntime: number; // minutes
  alertsCount: number;
}

export interface PerformanceMetrics {
  // Common
  overallCondition: 'GOOD' | 'MODERATE' | 'POOR';
  heatStressAvoidedHours: number;
  /** Total hours in the period when temp entered the at-risk zone (>= threshold - 2°C). */
  heatRiskWindowHours: number;
  /** Hours when temp actually crossed the stress threshold (failed to control). */
  heatStressActualHours: number;
  tempStabilityIndex: number;
  
  // Layer specific
  eggProductionStabilityIndex?: number;
  stressReductionIndex?: number;
  estimatedFeedSavedKg?: number;
  
  // Broiler specific
  growthComfortScore?: number;
  estimatedWeightPreservedKg?: number;
  fcrImprovementEstimate?: number;
  
  // Economic
  estimatedExtraProfitBDT: number;
}

export interface WeeklyPerformance {
  weekStart: string;
  weekEnd: string;
  dailyMetrics: DailyMetrics[];
  metrics: PerformanceMetrics;
}

// Empirical constants for estimation
const POULTRY_CONSTANTS = {
  // Heat stress impact
  WEIGHT_LOSS_PER_STRESS_HOUR_GRAMS: 5, // Broiler loses ~5g per hour of heat stress
  EGG_DROP_PER_STRESS_HOUR_PERCENT: 0.5, // Layer egg production drops 0.5% per hour
  
  // Feed efficiency
  FEED_SAVING_STABLE_TEMP_PERCENT: 3, // 3% feed saved with stable temperature
  FEED_COST_PER_KG_BDT: 65, // Average feed cost
  
  // Broiler weights
  AVG_BROILER_WEIGHT_KG: 2.2,
  BROILER_PRICE_PER_KG_BDT: 180,
  
  // Layer economics
  EGG_PRICE_BDT: 12,
  DAILY_FEED_PER_BIRD_KG: 0.115,
};

export function useFarmPerformance(days: number = 7) {
  const { user } = useAuth();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  const { data: flockInfo } = useFlockInfo();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['farm-performance', user?.id, days, isLayer],
    queryFn: async (): Promise<WeeklyPerformance> => {
      if (!user) throw new Error('Not authenticated');
      
      // Fetch sensor readings for the period
      const { data: readings } = await supabase
        .from('sensor_readings')
        .select('recorded_at, temperature, humidity, ammonia, water_usage')
        .eq('user_id', user.id)
        .gte('recorded_at', startDateStr)
        .order('recorded_at', { ascending: true });
      
      // Fetch alerts count
      const { data: alerts } = await supabase
        .from('alerts')
        .select('created_at, severity')
        .eq('user_id', user.id)
        .gte('created_at', startDateStr);
      
      // Fetch daily summaries if available
      const { data: dailySummaries } = await supabase
        .from('daily_summary')
        .select('*')
        .eq('user_id', user.id)
        .gte('summary_date', startDateStr);
      
      // Aggregate readings by day
      const dailyData: Map<string, {
        temps: number[];
        humidities: number[];
        water: number[];
        alerts: number;
      }> = new Map();
      
      readings?.forEach(r => {
        const date = new Date(r.recorded_at).toISOString().split('T')[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, { temps: [], humidities: [], water: [], alerts: 0 });
        }
        const day = dailyData.get(date)!;
        if (r.temperature) day.temps.push(Number(r.temperature));
        if (r.humidity) day.humidities.push(Number(r.humidity));
        if (r.water_usage) day.water.push(Number(r.water_usage));
      });
      
      // Count alerts per day
      alerts?.forEach(a => {
        const date = new Date(a.created_at).toISOString().split('T')[0];
        if (dailyData.has(date)) {
          dailyData.get(date)!.alerts++;
        }
      });
      
      // Calculate daily metrics
      const dailyMetrics: DailyMetrics[] = [];
      let totalHeatStressMinutes = 0;
      let totalTempStability = 0;
      let totalHumidityStability = 0;
      let totalWater = 0;
      let totalAlerts = 0;
      // Reality-based heat stress avoidance:
      //   risk_sample      = a 15-min sample where temp got into the at-risk zone
      //                      (>= stressThreshold - riskBuffer)
      //   stress_sample    = a risk sample where temp actually exceeded stressThreshold
      //   managed_sample   = risk_sample - stress_sample (we kept it under control)
      // heatStressAvoidedHours = managed_sample * 15 / 60
      let totalRiskSamples = 0;
      let totalManagedSamples = 0;
      let totalStressSamples = 0;
      const SAMPLE_MINUTES = 15;
      const RISK_BUFFER = 2; // °C below threshold counts as "at risk"
      
      // Ideal temperature range (depends on farm type and bird age)
      const idealTempMin = isBroiler ? 24 : 18;
      const idealTempMax = isBroiler ? 32 : 28;
      const heatStressThreshold = isBroiler ? 32 : 30;
      const riskZoneStart = heatStressThreshold - RISK_BUFFER;
      
      dailyData.forEach((data, date) => {
        const avgTemp = data.temps.length > 0 
          ? data.temps.reduce((a, b) => a + b, 0) / data.temps.length 
          : 25;
        
        // Temperature stability: lower variance = higher score
        const tempVariance = data.temps.length > 1
          ? Math.sqrt(data.temps.reduce((sum, t) => sum + Math.pow(t - avgTemp, 2), 0) / data.temps.length)
          : 0;
        const tempStabilityScore = Math.max(0, 100 - (tempVariance * 10));
        
        // Heat stress minutes: count readings above threshold
        const stressReadings = data.temps.filter(t => t > heatStressThreshold).length;
        const heatStressMinutes = stressReadings * SAMPLE_MINUTES;
        
        // Reality-based: only count samples where temperature was actually at-risk
        const riskReadings = data.temps.filter(t => t >= riskZoneStart).length;
        const managedReadings = Math.max(0, riskReadings - stressReadings);
        totalRiskSamples += riskReadings;
        totalStressSamples += stressReadings;
        totalManagedSamples += managedReadings;
        
        // Humidity stability
        const avgHumidity = data.humidities.length > 0
          ? data.humidities.reduce((a, b) => a + b, 0) / data.humidities.length
          : 60;
        const humidityVariance = data.humidities.length > 1
          ? Math.sqrt(data.humidities.reduce((sum, h) => sum + Math.pow(h - avgHumidity, 2), 0) / data.humidities.length)
          : 0;
        const humidityStability = Math.max(0, 100 - (humidityVariance * 5));
        
        const waterConsumption = data.water.reduce((a, b) => a + b, 0);
        
        dailyMetrics.push({
          date,
          avgTemperature: Math.round(avgTemp * 10) / 10,
          tempStabilityScore: Math.round(tempStabilityScore),
          heatStressMinutes,
          humidityStability: Math.round(humidityStability),
          waterConsumption: Math.round(waterConsumption),
          ventilationRuntime: 0, // Would need device_status history
          alertsCount: data.alerts,
        });
        
        totalHeatStressMinutes += heatStressMinutes;
        totalTempStability += tempStabilityScore;
        totalHumidityStability += humidityStability;
        totalWater += waterConsumption;
        totalAlerts += data.alerts;
      });
      
      const numDays = Math.max(dailyMetrics.length, 1);
      const avgTempStability = totalTempStability / numDays;
      const avgHumidityStability = totalHumidityStability / numDays;
      // REAL metric: hours where temp was at-risk but we kept it under threshold.
      // No data → 0. No risk windows → 0. Honest baseline.
      const heatStressAvoidedHours = (totalManagedSamples * SAMPLE_MINUTES) / 60;
      
      // Determine overall condition
      let overallCondition: 'GOOD' | 'MODERATE' | 'POOR' = 'GOOD';
      if (avgTempStability < 60 || totalAlerts > days * 3) {
        overallCondition = 'POOR';
      } else if (avgTempStability < 80 || totalAlerts > days) {
        overallCondition = 'MODERATE';
      }
      
      // Bird count
      const birdCount = isBroiler 
        ? (activeBatch?.current_bird_count || 1000)
        : (flockInfo?.total_birds || 1000);
      
      // Calculate economic benefits
      let estimatedExtraProfitBDT = 0;
      let metrics: PerformanceMetrics;
      
      if (isLayer) {
        // Layer calculations
        const stressReductionIndex = Math.round((avgTempStability + avgHumidityStability) / 2);
        const eggProductionStabilityIndex = stressReductionIndex;
        
        // Feed saved from stable temperature
        const dailyFeedKg = birdCount * POULTRY_CONSTANTS.DAILY_FEED_PER_BIRD_KG;
        const stabilityGain = avgTempStability / 100 * POULTRY_CONSTANTS.FEED_SAVING_STABLE_TEMP_PERCENT / 100;
        const estimatedFeedSavedKg = dailyFeedKg * days * stabilityGain;
        
        // Economic benefit
        const feedSavingBDT = estimatedFeedSavedKg * POULTRY_CONSTANTS.FEED_COST_PER_KG_BDT;
        const eggProductionBenefit = heatStressAvoidedHours * POULTRY_CONSTANTS.EGG_DROP_PER_STRESS_HOUR_PERCENT / 100 * birdCount * POULTRY_CONSTANTS.EGG_PRICE_BDT / 100;
        
        estimatedExtraProfitBDT = Math.round(feedSavingBDT + eggProductionBenefit);
        
        metrics = {
          overallCondition,
          heatStressAvoidedHours: Math.round(heatStressAvoidedHours * 10) / 10,
          heatRiskWindowHours: Math.round((totalRiskSamples * SAMPLE_MINUTES) / 60 * 10) / 10,
          heatStressActualHours: Math.round((totalStressSamples * SAMPLE_MINUTES) / 60 * 10) / 10,
          tempStabilityIndex: Math.round(avgTempStability),
          eggProductionStabilityIndex,
          stressReductionIndex,
          estimatedFeedSavedKg: Math.round(estimatedFeedSavedKg * 10) / 10,
          estimatedExtraProfitBDT,
        };
      } else {
        // Broiler calculations
        const growthComfortScore = Math.round((avgTempStability + avgHumidityStability) / 2);
        
        // Weight preserved from avoiding heat stress
        const estimatedWeightPreservedKg = (birdCount * heatStressAvoidedHours * POULTRY_CONSTANTS.WEIGHT_LOSS_PER_STRESS_HOUR_GRAMS) / 1000;
        
        // FCR improvement estimate (better conditions = lower FCR)
        const fcrImprovementEstimate = avgTempStability > 80 ? 0.05 : avgTempStability > 60 ? 0.02 : 0;
        
        // Economic benefit from weight preservation
        const weightBenefit = estimatedWeightPreservedKg * POULTRY_CONSTANTS.BROILER_PRICE_PER_KG_BDT;
        
        // Feed saved from better FCR
        const totalFeedKg = birdCount * POULTRY_CONSTANTS.DAILY_FEED_PER_BIRD_KG * days;
        const feedSavedKg = totalFeedKg * fcrImprovementEstimate;
        const feedBenefit = feedSavedKg * POULTRY_CONSTANTS.FEED_COST_PER_KG_BDT;
        
        estimatedExtraProfitBDT = Math.round(weightBenefit + feedBenefit);
        
        metrics = {
          overallCondition,
          heatStressAvoidedHours: Math.round(heatStressAvoidedHours * 10) / 10,
          heatRiskWindowHours: Math.round((totalRiskSamples * SAMPLE_MINUTES) / 60 * 10) / 10,
          heatStressActualHours: Math.round((totalStressSamples * SAMPLE_MINUTES) / 60 * 10) / 10,
          tempStabilityIndex: Math.round(avgTempStability),
          growthComfortScore,
          estimatedWeightPreservedKg: Math.round(estimatedWeightPreservedKg * 10) / 10,
          fcrImprovementEstimate: Math.round(fcrImprovementEstimate * 100) / 100,
          estimatedExtraProfitBDT,
        };
      }
      
      const endDate = new Date();
      
      return {
        weekStart: startDateStr,
        weekEnd: endDate.toISOString().split('T')[0],
        dailyMetrics,
        metrics,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
