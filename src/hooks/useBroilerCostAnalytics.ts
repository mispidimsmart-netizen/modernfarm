import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { calculateFCR, evaluateFCR, getBroilerTargetWeight } from './useFarmType';

export interface BroilerCostAnalytics {
  // Active Batch Info
  activeBatch: {
    id: string;
    name: string;
    nameBn: string;
    startDate: string;
    ageDays: number;
    initialBirds: number;
    currentBirds: number;
    mortalityCount: number;
    mortalityPercent: number;
  } | null;
  
  // Feed Analytics
  feedAnalytics: {
    totalFeedKg: number;
    totalFeedCost: number;
    feedPerBird: number;
    feedCostPerBird: number;
    dailyFeedAvg: number;
  };
  
  // Weight & FCR
  weightAnalytics: {
    currentWeight: number;
    targetWeight: number;
    weightGap: number;
    fcr: number;
    fcrRating: 'excellent' | 'good' | 'average' | 'poor' | 'none';
    totalWeightKg: number;
  };
  
  // Cost Per Kg Meat
  costPerKg: {
    chickCost: number;
    feedCost: number;
    electricityCost: number;
    waterCost: number;
    otherCost: number;
    totalCostPerKg: number;
    estimatedSalePrice: number;
    profitPerKg: number;
  };
  
  // Batch Totals
  batchTotals: {
    totalChickCost: number;
    totalFeedCost: number;
    totalOtherExpenses: number;
    totalInvestment: number;
    estimatedRevenue: number;
    estimatedProfit: number;
    profitMargin: number;
  };
  
  // Daily Trends (last 7 days)
  dailyTrends: {
    date: string;
    feedKg: number;
    mortality: number;
    weight: number;
  }[];

  // Weight history (all samples) — for weight gain graph
  weightHistory: {
    date: string;
    ageDays: number;
    weight: number;       // grams (actual)
    targetWeight: number; // grams (Cobb 500 target at that age)
  }[];

  // FCR trend over batch lifetime (calculated at each weight sample point)
  fcrTrend: {
    date: string;
    ageDays: number;
    fcr: number;
    target: number; // industry target FCR at that age
  }[];
}

// Default market rates
const DEFAULT_RATES = {
  salePerKg: 180, // BDT per kg live weight
  electricityPerKwh: 8.0,
  waterPerLiter: 0.5,
};

export function useBroilerCostAnalytics() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  // Fetch active batch with all related data
  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ['broiler-batch-analytics', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return null;
      // Get active batch — scoped to user + selected farm
      let batchQ = supabase
        .from('broiler_batches')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      if (selectedFarmId) batchQ = batchQ.eq('farm_id', selectedFarmId);
      const { data: batch, error: batchError } = await batchQ.single();

      if (batchError && batchError.code !== 'PGRST116') throw batchError;
      if (!batch) return null;

      // Calculate age in days
      const startDate = new Date(batch.start_date);
      const today = new Date();
      const ageDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Fetch related data in parallel (all scoped by batch_id which is itself farm-scoped)
      const [feedResult, mortalityResult, weightsResult, salesResult] = await Promise.all([
        supabase
          .from('broiler_feed')
          .select('*')
          .eq('batch_id', batch.id)
          .order('feed_date', { ascending: true }),
        supabase
          .from('broiler_mortality')
          .select('*')
          .eq('batch_id', batch.id)
          .order('record_date', { ascending: true }),
        supabase
          .from('broiler_weights')
          .select('*')
          .eq('batch_id', batch.id)
          .order('record_date', { ascending: false }),
        supabase
          .from('broiler_sales')
          .select('*')
          .eq('batch_id', batch.id),
      ]);

      return {
        batch: {
          ...batch,
          ageDays,
        },
        feed: feedResult.data || [],
        mortality: mortalityResult.data || [],
        weights: weightsResult.data || [],
        sales: salesResult.data || [],
      };
    },
    enabled: !!user,
  });

  // Fetch expenses for electricity/water — scoped by user + farm
  const { data: expenses } = useQuery({
    queryKey: ['broiler-expenses', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let q = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', thirtyDaysAgo.toISOString().split('T')[0]);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q;

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate analytics
  const analytics: BroilerCostAnalytics = calculateBroilerAnalytics(batchData, expenses);

  return {
    analytics,
    isLoading: batchLoading,
    hasActiveBatch: !!batchData?.batch,
  };
}

function calculateBroilerAnalytics(
  batchData: any | null,
  expenses: any[] | undefined
): BroilerCostAnalytics {
  // Default empty analytics
  if (!batchData?.batch) {
    return getEmptyAnalytics();
  }

  const { batch, feed, mortality, weights, sales } = batchData;
  
  // Active Batch Info
  const totalMortality = mortality.reduce((sum: number, m: any) => sum + m.count, 0);
  const currentBirds = batch.initial_bird_count - totalMortality;
  const mortalityPercent = batch.initial_bird_count > 0 
    ? (totalMortality / batch.initial_bird_count) * 100 
    : 0;
  
  const activeBatch = {
    id: batch.id,
    name: batch.batch_name,
    nameBn: batch.batch_name_bn || batch.batch_name,
    startDate: batch.start_date,
    ageDays: batch.ageDays,
    initialBirds: batch.initial_bird_count,
    currentBirds: currentBirds,
    mortalityCount: totalMortality,
    mortalityPercent: Math.round(mortalityPercent * 10) / 10,
  };

  // Feed Analytics
  const totalFeedKg = feed.reduce((sum: number, f: any) => sum + Number(f.quantity_kg || 0), 0);
  const totalFeedCost = feed.reduce((sum: number, f: any) => {
    const qty = Number(f.quantity_kg || 0);
    const price = Number(f.cost_per_kg || 45); // Default 45 BDT/kg
    return sum + (qty * price);
  }, 0);
  const feedPerBird = currentBirds > 0 ? totalFeedKg / currentBirds : 0;
  const feedCostPerBird = currentBirds > 0 ? totalFeedCost / currentBirds : 0;
  const dailyFeedAvg = batch.ageDays > 0 ? totalFeedKg / batch.ageDays : 0;

  const feedAnalytics = {
    totalFeedKg: Math.round(totalFeedKg * 10) / 10,
    totalFeedCost: Math.round(totalFeedCost),
    feedPerBird: Math.round(feedPerBird * 100) / 100,
    feedCostPerBird: Math.round(feedCostPerBird * 10) / 10,
    dailyFeedAvg: Math.round(dailyFeedAvg * 10) / 10,
  };

  // Weight & FCR
  const latestWeight = weights.length > 0 ? weights[0].average_weight_grams : 0;
  const targetWeight = getBroilerTargetWeight(batch.ageDays);
  const weightGap = latestWeight - targetWeight;

  // Calculate FCR: Total Feed (kg) / Total Weight Gain (kg)
  // Account for dead birds — they consumed feed too. Estimate their average
  // weight at time of death using the closest weight sample on/before that date,
  // falling back to half of the latest sample (rough mid-life estimate).
  const sortedWeightsAsc = [...weights].sort((a: any, b: any) =>
    a.record_date.localeCompare(b.record_date)
  );
  function weightAtDate(dateIso: string): number {
    let chosen = 0;
    for (const w of sortedWeightsAsc as any[]) {
      if (w.record_date <= dateIso) chosen = w.average_weight_grams || 0;
      else break;
    }
    if (chosen > 0) return chosen;
    // Fallback: half of latest known sample, otherwise 42g chick weight
    return latestWeight > 0 ? latestWeight / 2 : 42;
  }
  const deadBirdsWeightKg =
    mortality.reduce(
      (s: number, m: any) =>
        s + ((m.count || 0) * weightAtDate(m.record_date)) / 1000,
      0
    ) || 0;

  const liveWeightKg = (currentBirds * latestWeight) / 1000;
  const totalWeightKg = liveWeightKg; // for cost/kg of saleable meat (live birds only)
  const initialWeightKg = (batch.initial_bird_count * 42) / 1000; // 42g chick weight
  // Effective weight gain across the whole flock (alive + dead at death weight)
  const weightGainKg = Math.max(0, liveWeightKg + deadBirdsWeightKg - initialWeightKg);
  const fcr = calculateFCR(totalFeedKg, weightGainKg);
  const ageWeeks = Math.ceil(batch.ageDays / 7);
  const fcrRating: 'excellent' | 'good' | 'average' | 'poor' | 'none' =
    fcr > 0 ? evaluateFCR(fcr, ageWeeks) : 'none';

  const weightAnalytics = {
    currentWeight: latestWeight as number,
    targetWeight: Math.round(targetWeight),
    weightGap: Math.round(weightGap),
    fcr: Math.round(fcr * 100) / 100,
    fcrRating,
    totalWeightKg: Math.round(totalWeightKg),
  };

  // Cost Per Kg Meat
  const chickCostTotal = batch.initial_bird_count * (batch.chick_cost_per_bird || 0);
  
  const electricityExpenses = expenses?.filter(e => 
    e.category === 'electricity' || e.category === 'utilities'
  ).reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  
  const waterExpenses = expenses?.filter(e => 
    e.category === 'water'
  ).reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  
  const otherExpenses = expenses?.filter(e => 
    !['electricity', 'utilities', 'water', 'feed'].includes(e.category)
  ).reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  const totalInvestment = chickCostTotal + totalFeedCost + electricityExpenses + waterExpenses + otherExpenses;
  
  // Cost per kg (only if we have weight data)
  const costPerKgMeat = totalWeightKg > 0 ? totalInvestment / totalWeightKg : 0;
  const chickCostPerKg = totalWeightKg > 0 ? chickCostTotal / totalWeightKg : 0;
  const feedCostPerKg = totalWeightKg > 0 ? totalFeedCost / totalWeightKg : 0;
  const electricityCostPerKg = totalWeightKg > 0 ? electricityExpenses / totalWeightKg : 0;
  const waterCostPerKg = totalWeightKg > 0 ? waterExpenses / totalWeightKg : 0;
  const otherCostPerKg = totalWeightKg > 0 ? otherExpenses / totalWeightKg : 0;
  
  const profitPerKg = DEFAULT_RATES.salePerKg - costPerKgMeat;

  const costPerKg = {
    chickCost: Math.round(chickCostPerKg * 10) / 10,
    feedCost: Math.round(feedCostPerKg * 10) / 10,
    electricityCost: Math.round(electricityCostPerKg * 10) / 10,
    waterCost: Math.round(waterCostPerKg * 10) / 10,
    otherCost: Math.round(otherCostPerKg * 10) / 10,
    totalCostPerKg: Math.round(costPerKgMeat * 10) / 10,
    estimatedSalePrice: DEFAULT_RATES.salePerKg,
    profitPerKg: Math.round(profitPerKg * 10) / 10,
  };

  // Batch Totals
  const estimatedRevenue = totalWeightKg * DEFAULT_RATES.salePerKg;
  const estimatedProfit = estimatedRevenue - totalInvestment;
  const profitMargin = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0;

  const batchTotals = {
    totalChickCost: Math.round(chickCostTotal),
    totalFeedCost: Math.round(totalFeedCost),
    totalOtherExpenses: Math.round(electricityExpenses + waterExpenses + otherExpenses),
    totalInvestment: Math.round(totalInvestment),
    estimatedRevenue: Math.round(estimatedRevenue),
    estimatedProfit: Math.round(estimatedProfit),
    profitMargin: Math.round(profitMargin * 10) / 10,
  };

  // Daily Trends (last 7 days)
  const dailyTrends = calculateDailyTrends(feed, mortality, weights);

  return {
    activeBatch,
    feedAnalytics,
    weightAnalytics,
    costPerKg,
    batchTotals,
    dailyTrends,
  };
}

function calculateDailyTrends(
  feed: any[],
  mortality: any[],
  weights: any[]
): BroilerCostAnalytics['dailyTrends'] {
  const trends: BroilerCostAnalytics['dailyTrends'] = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Get feed for this day
    const dayFeed = feed
      .filter(f => f.feed_date === dateStr)
      .reduce((sum, f) => sum + Number(f.quantity_kg || 0), 0);
    
    // Get mortality for this day
    const dayMortality = mortality
      .filter(m => m.record_date === dateStr)
      .reduce((sum, m) => sum + m.count, 0);
    
    // Get weight for this day (or nearest previous)
    const dayWeight = weights.find(w => w.record_date <= dateStr);
    
    trends.push({
      date: dateStr,
      feedKg: Math.round(dayFeed * 10) / 10,
      mortality: dayMortality,
      weight: dayWeight?.average_weight_grams || 0,
    });
  }
  
  return trends;
}

function getEmptyAnalytics(): BroilerCostAnalytics {
  return {
    activeBatch: null,
    feedAnalytics: {
      totalFeedKg: 0,
      totalFeedCost: 0,
      feedPerBird: 0,
      feedCostPerBird: 0,
      dailyFeedAvg: 0,
    },
    weightAnalytics: {
      currentWeight: 0,
      targetWeight: 0,
      weightGap: 0,
      fcr: 0,
      fcrRating: 'none',
      totalWeightKg: 0,
    },
    costPerKg: {
      chickCost: 0,
      feedCost: 0,
      electricityCost: 0,
      waterCost: 0,
      otherCost: 0,
      totalCostPerKg: 0,
      estimatedSalePrice: 180,
      profitPerKg: 0,
    },
    batchTotals: {
      totalChickCost: 0,
      totalFeedCost: 0,
      totalOtherExpenses: 0,
      totalInvestment: 0,
      estimatedRevenue: 0,
      estimatedProfit: 0,
      profitMargin: 0,
    },
    dailyTrends: [],
  };
}
