import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useEggProduction, useFeedConsumption, useFeedInventory, useExpenses } from './useFarmManagement';

export interface CostAnalytics {
  // Fan Power Usage
  fanRuntime: {
    totalHours: number;
    lowSpeedHours: number;
    mediumSpeedHours: number;
    highSpeedHours: number;
    estimatedKwh: number;
    estimatedCost: number;
  };
  // Water Usage
  waterUsage: {
    totalLiters: number;
    dailyAverage: number;
    estimatedCost: number;
  };
  // Cost Per Egg
  costPerEgg: {
    feedCostPerEgg: number;
    electricityCostPerEgg: number;
    waterCostPerEgg: number;
    totalCostPerEgg: number;
    totalEggs: number;
    totalFeedCost: number;
  };
  // Trends (last 7 days)
  dailyTrends: {
    date: string;
    fanKwh: number;
    waterLiters: number;
    eggs: number;
    feedKg: number;
  }[];
}

// Fan power consumption per speed (in Watts)
const FAN_POWER = {
  LOW: 50,
  MEDIUM: 100,
  HIGH: 200,
  OFF: 0,
};

// Default rates (can be made configurable later)
const DEFAULT_RATES = {
  electricityPerKwh: 8.0, // BDT per kWh
  waterPerLiter: 0.5, // BDT per liter
};

export function useCostAnalytics(days: number = 30) {
  const { user } = useAuth();
  const { data: eggProduction } = useEggProduction(days);
  const { data: feedConsumption } = useFeedConsumption(days);
  const { data: feedInventory } = useFeedInventory();
  const { data: expenses } = useExpenses(days);

  // Fetch sensor logs for water usage
  const { data: sensorLogs } = useQuery({
    queryKey: ['sensor-logs-analytics', user?.id, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('recorded_at, water_usage')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch device status history for fan runtime
  const { data: deviceStatusLogs } = useQuery({
    queryKey: ['device-status-analytics', user?.id, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('recorded_at, device_id')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch current device status for fan speed
  const { data: deviceStatus } = useQuery({
    queryKey: ['device-status-current', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('device_status')
        .select('fan_on, fan_speed, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate analytics
  const analytics: CostAnalytics = {
    fanRuntime: calculateFanRuntime(sensorLogs, deviceStatus, days),
    waterUsage: calculateWaterUsage(sensorLogs, days),
    costPerEgg: calculateCostPerEgg(eggProduction, feedConsumption, feedInventory, expenses, days),
    dailyTrends: calculateDailyTrends(sensorLogs, eggProduction, feedConsumption, days),
  };

  return analytics;
}

function calculateFanRuntime(
  sensorLogs: any[] | undefined,
  deviceStatus: any | undefined,
  days: number
) {
  // Estimate based on sensor log frequency and device status
  const logsPerDay = sensorLogs ? sensorLogs.length / days : 0;
  const samplingIntervalMinutes = logsPerDay > 0 ? (24 * 60) / logsPerDay : 5;
  
  // Assume fan runs during sensor readings (simplified)
  const totalReadings = sensorLogs?.length ?? 0;
  const fanSpeed = deviceStatus?.fan_speed ?? 'MEDIUM';
  const fanOn = deviceStatus?.fan_on ?? false;
  
  // Estimate hours based on readings
  const estimatedFanHours = fanOn ? (totalReadings * samplingIntervalMinutes) / 60 : 0;
  
  // Distribution by speed (simplified - assuming current speed applies)
  let lowHours = 0, mediumHours = 0, highHours = 0;
  if (fanSpeed === 'LOW') lowHours = estimatedFanHours;
  else if (fanSpeed === 'HIGH') highHours = estimatedFanHours;
  else mediumHours = estimatedFanHours;
  
  // Calculate power consumption
  const totalKwh = (
    (lowHours * FAN_POWER.LOW) +
    (mediumHours * FAN_POWER.MEDIUM) +
    (highHours * FAN_POWER.HIGH)
  ) / 1000;
  
  return {
    totalHours: Math.round(estimatedFanHours),
    lowSpeedHours: Math.round(lowHours),
    mediumSpeedHours: Math.round(mediumHours),
    highSpeedHours: Math.round(highHours),
    estimatedKwh: Math.round(totalKwh * 10) / 10,
    estimatedCost: Math.round(totalKwh * DEFAULT_RATES.electricityPerKwh),
  };
}

function calculateWaterUsage(sensorLogs: any[] | undefined, days: number) {
  if (!sensorLogs || sensorLogs.length === 0) {
    return {
      totalLiters: 0,
      dailyAverage: 0,
      estimatedCost: 0,
    };
  }
  
  // Sum up water flow readings (assuming L/min and 5-min intervals)
  const totalWaterFlow = sensorLogs.reduce((sum, log) => sum + Number(log.water_usage || 0), 0);
  const samplingIntervalMinutes = 5;
  const totalLiters = Math.round(totalWaterFlow * samplingIntervalMinutes);
  
  return {
    totalLiters,
    dailyAverage: Math.round(totalLiters / days),
    estimatedCost: Math.round(totalLiters * DEFAULT_RATES.waterPerLiter),
  };
}

function calculateCostPerEgg(
  eggProduction: any[] | undefined,
  feedConsumption: any[] | undefined,
  feedInventory: any[] | undefined,
  expenses: any[] | undefined,
  days: number
) {
  const totalEggs = eggProduction?.reduce((sum, e) => sum + e.total_eggs, 0) ?? 0;
  const totalFeedKg = feedConsumption?.reduce((sum, f) => sum + Number(f.quantity_kg), 0) ?? 0;
  
  // Quantity-weighted average feed price (matches useLayerBatch canonical logic)
  let avgFeedPrice = 45; // Default BDT per kg
  if (feedInventory && feedInventory.length > 0) {
    const totalKg = feedInventory.reduce((s, f) => s + Number(f.quantity_kg || 0), 0);
    const totalCost = feedInventory.reduce(
      (s, f) => s + Number(f.unit_price || 0) * Number(f.quantity_kg || 0),
      0
    );
    if (totalKg > 0) avgFeedPrice = totalCost / totalKg;
  }
  
  const totalFeedCost = totalFeedKg * avgFeedPrice;
  
  // Get electricity expenses
  const electricityExpenses = expenses?.filter(e => 
    e.category === 'electricity' || e.category === 'utilities'
  ).reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  
  // Get water expenses
  const waterExpenses = expenses?.filter(e => 
    e.category === 'water'
  ).reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  
  const feedCostPerEgg = totalEggs > 0 ? totalFeedCost / totalEggs : 0;
  const electricityCostPerEgg = totalEggs > 0 ? electricityExpenses / totalEggs : 0;
  const waterCostPerEgg = totalEggs > 0 ? waterExpenses / totalEggs : 0;
  
  return {
    feedCostPerEgg: Math.round(feedCostPerEgg * 100) / 100,
    electricityCostPerEgg: Math.round(electricityCostPerEgg * 100) / 100,
    waterCostPerEgg: Math.round(waterCostPerEgg * 100) / 100,
    totalCostPerEgg: Math.round((feedCostPerEgg + electricityCostPerEgg + waterCostPerEgg) * 100) / 100,
    totalEggs,
    totalFeedCost: Math.round(totalFeedCost),
  };
}

function calculateDailyTrends(
  sensorLogs: any[] | undefined,
  eggProduction: any[] | undefined,
  feedConsumption: any[] | undefined,
  days: number
) {
  const trends: CostAnalytics['dailyTrends'] = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Filter logs for this day
    const dayLogs = sensorLogs?.filter(log => 
      log.timestamp.startsWith(dateStr)
    ) ?? [];
    
    // Calculate daily water
    const dailyWater = dayLogs.reduce((sum, log) => sum + Number(log.water_flow || 0) * 5, 0);
    
    // Get egg production for this day
    const dayEggs = eggProduction?.find(e => e.production_date === dateStr);
    
    // Get feed consumption for this day
    const dayFeed = feedConsumption?.filter(f => f.consumption_date === dateStr)
      .reduce((sum, f) => sum + Number(f.quantity_kg), 0) ?? 0;
    
    // Estimate fan kWh (simplified)
    const fanKwh = (dayLogs.length * 5 * FAN_POWER.MEDIUM) / (60 * 1000);
    
    trends.push({
      date: dateStr,
      fanKwh: Math.round(fanKwh * 10) / 10,
      waterLiters: Math.round(dailyWater),
      eggs: dayEggs?.total_eggs ?? 0,
      feedKg: dayFeed,
    });
  }
  
  return trends;
}

// Hook for cost rates settings (can be extended to save to DB)
export function useCostRates() {
  const rates = {
    electricityPerKwh: DEFAULT_RATES.electricityPerKwh,
    waterPerLiter: DEFAULT_RATES.waterPerLiter,
  };
  
  return rates;
}
