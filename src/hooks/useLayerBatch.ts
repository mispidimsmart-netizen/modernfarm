import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';

export interface LayerBatch {
  id: string;
  user_id: string;
  farm_id: string | null;
  shed_id: string | null;
  batch_name: string;
  batch_name_bn: string | null;
  breed: string | null;
  start_date: string;
  expected_end_date: string | null;
  actual_end_date: string | null;
  initial_bird_count: number;
  current_bird_count: number;
  chick_cost_per_bird: number;
  age_at_start_weeks: number;
  status: 'active' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LayerBatchSummary {
  id: string;
  batch_id: string;
  user_id: string;
  farm_id: string | null;
  total_eggs: number;
  peak_production_percent: number;
  peak_age_weeks: number | null;
  total_mortality: number;
  mortality_percent: number;
  total_feed_kg: number;
  total_feed_cost: number;
  fcr: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  duration_days: number | null;
  notes: string | null;
  created_at: string;
}

// Active layer batch
export function useActiveLayerBatch() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['layer-batch-active', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return null;
      let q = supabase
        .from('layer_batches' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as unknown as LayerBatch | null;
    },
    enabled: !!user,
  });
}

// All layer batches (history)
export function useLayerBatches() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['layer-batches', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('layer_batches' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as LayerBatch[];
    },
    enabled: !!user,
  });
}

// Create new layer batch
export function useCreateLayerBatch() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { selectedFarmId, farms } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batch: Partial<LayerBatch>) => {
      if (!user) throw new Error('Not authenticated');
      const farmId = selectedFarmId || farms[0]?.id;
      if (!farmId) throw new Error('No farm available.');

      const { data, error } = await supabase
        .from('layer_batches' as any)
        .insert({
          user_id: user.id,
          farm_id: farmId,
          shed_id: batch.shed_id || null,
          batch_name: batch.batch_name || 'Batch 1',
          batch_name_bn: batch.batch_name_bn || 'ব্যাচ ১',
          breed: batch.breed || 'Hy-Line Brown',
          start_date: batch.start_date || new Date().toISOString().split('T')[0],
          expected_end_date: batch.expected_end_date || null,
          initial_bird_count: batch.initial_bird_count || 0,
          current_bird_count: batch.initial_bird_count || 0,
          chick_cost_per_bird: batch.chick_cost_per_bird || 0,
          age_at_start_weeks: batch.age_at_start_weeks || 0,
          notes: batch.notes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'নতুন ব্যাচ শুরু হয়েছে' : 'New batch started',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update batch
export function useUpdateLayerBatch() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LayerBatch> & { id: string }) => {
      const { data, error } = await supabase
        .from('layer_batches' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'ব্যাচ আপডেট হয়েছে' : 'Batch updated',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Close batch + create summary snapshot
export function useCloseLayerBatch() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { selectedFarmId, farms } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      batchId,
      endDate,
      notes,
    }: {
      batchId: string;
      endDate?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const farmId = selectedFarmId || farms[0]?.id;

      // Fetch batch
      const { data: batchData, error: bErr } = await supabase
        .from('layer_batches' as any)
        .select('*')
        .eq('id', batchId)
        .single();
      if (bErr) throw bErr;
      const batch = batchData as unknown as LayerBatch;

      const start = new Date(batch.start_date);
      const end = new Date(endDate || new Date().toISOString().split('T')[0]);
      const durationDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      // Aggregate eggs
      const { data: eggs } = await supabase
        .from('egg_production')
        .select('production_date,total_eggs')
        .eq('user_id', user.id)
        .gte('production_date', batch.start_date)
        .lte('production_date', end.toISOString().split('T')[0]);

      const totalEggs = (eggs || []).reduce((s, e: any) => s + (e.total_eggs || 0), 0);

      // Peak production %: best daily eggs / current_bird_count * 100
      let peakPercent = 0;
      let peakAgeWeeks: number | null = null;
      if (batch.current_bird_count > 0 && eggs) {
        for (const e of eggs as any[]) {
          const pct = (e.total_eggs / batch.current_bird_count) * 100;
          if (pct > peakPercent) {
            peakPercent = pct;
            const dDays = Math.floor((new Date(e.production_date).getTime() - start.getTime()) / 86400000);
            peakAgeWeeks = batch.age_at_start_weeks + Math.floor(dDays / 7);
          }
        }
      }

      // Aggregate feed
      const { data: feed } = await supabase
        .from('feed_consumption')
        .select('quantity_kg,consumption_date')
        .eq('user_id', user.id)
        .gte('consumption_date', batch.start_date)
        .lte('consumption_date', end.toISOString().split('T')[0]);

      const totalFeedKg = (feed || []).reduce((s, f: any) => s + Number(f.quantity_kg || 0), 0);

      // Feed cost from inventory (avg unit price * total kg)
      const { data: inv } = await supabase
        .from('feed_inventory')
        .select('unit_price,quantity_kg')
        .eq('user_id', user.id);
      const totalInvKg = (inv || []).reduce((s, i: any) => s + Number(i.quantity_kg || 0), 0);
      const totalInvCost = (inv || []).reduce((s, i: any) => s + Number(i.unit_price || 0) * Number(i.quantity_kg || 0), 0);
      const avgPricePerKg = totalInvKg > 0 ? totalInvCost / totalInvKg : 0;
      const totalFeedCost = totalFeedKg * avgPricePerKg;

      // FCR for layers = feed (kg) / egg mass (kg) — assume 60g per egg
      const eggMassKg = (totalEggs * 60) / 1000;
      const fcr = eggMassKg > 0 ? totalFeedKg / eggMassKg : 0;

      // Mortality
      const mortality = Math.max(0, batch.initial_bird_count - batch.current_bird_count);
      const mortalityPct = batch.initial_bird_count > 0 ? (mortality / batch.initial_bird_count) * 100 : 0;

      // Revenue (egg sales not tracked — leave 0 unless expenses table has income)
      const { data: exp } = await supabase
        .from('expenses')
        .select('amount,category,expense_date')
        .eq('user_id', user.id)
        .gte('expense_date', batch.start_date)
        .lte('expense_date', end.toISOString().split('T')[0]);

      const totalExpenses = (exp || []).reduce((s, e: any) => s + Number(e.amount || 0), 0);
      const totalRevenue = 0; // placeholder until egg sales tracked
      const netProfit = totalRevenue - totalExpenses - totalFeedCost - (batch.initial_bird_count * batch.chick_cost_per_bird);

      // Insert summary
      const { error: sErr } = await supabase.from('layer_batch_summary' as any).insert({
        batch_id: batchId,
        user_id: user.id,
        farm_id: farmId,
        total_eggs: totalEggs,
        peak_production_percent: Math.round(peakPercent * 10) / 10,
        peak_age_weeks: peakAgeWeeks,
        total_mortality: mortality,
        mortality_percent: Math.round(mortalityPct * 10) / 10,
        total_feed_kg: Math.round(totalFeedKg * 10) / 10,
        total_feed_cost: Math.round(totalFeedCost),
        fcr: Math.round(fcr * 100) / 100,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        duration_days: durationDays,
        notes: notes || null,
      } as any);
      if (sErr) throw sErr;

      // Mark batch closed
      const { error: uErr } = await supabase
        .from('layer_batches' as any)
        .update({
          status: 'completed',
          actual_end_date: end.toISOString().split('T')[0],
        } as any)
        .eq('id', batchId);
      if (uErr) throw uErr;

      return { batchId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-summary'] });
      toast({
        title: language === 'bn' ? 'ব্যাচ সম্পন্ন' : 'Batch Closed',
        description: language === 'bn' ? 'সারাংশ সংরক্ষিত হয়েছে' : 'Summary saved',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Summary for a batch
export function useLayerBatchSummary(batchId: string | undefined) {
  return useQuery({
    queryKey: ['layer-batch-summary', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const { data, error } = await supabase
        .from('layer_batch_summary' as any)
        .select('*')
        .eq('batch_id', batchId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LayerBatchSummary | null;
    },
    enabled: !!batchId,
  });
}

// Daily egg + mortality trend for a batch (used by mini chart)
export interface BatchTrendPoint {
  date: string;
  eggs: number;
  mortality: number;
}

export function useLayerBatchTrend(batch: LayerBatch | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['layer-batch-trend', batch?.id],
    queryFn: async (): Promise<BatchTrendPoint[]> => {
      if (!user || !batch) return [];
      const start = batch.start_date;
      const end = batch.actual_end_date || new Date().toISOString().split('T')[0];

      const [eggsRes, mortRes] = await Promise.all([
        supabase
          .from('egg_production')
          .select('production_date,total_eggs')
          .eq('user_id', user.id)
          .gte('production_date', start)
          .lte('production_date', end)
          .order('production_date', { ascending: true }),
        supabase
          .from('daily_summary')
          .select('summary_date,mortality_count')
          .eq('user_id', user.id)
          .gte('summary_date', start)
          .lte('summary_date', end)
          .order('summary_date', { ascending: true }),
      ]);

      const map = new Map<string, BatchTrendPoint>();
      (eggsRes.data || []).forEach((e: any) => {
        map.set(e.production_date, {
          date: e.production_date,
          eggs: e.total_eggs || 0,
          mortality: 0,
        });
      });
      (mortRes.data || []).forEach((m: any) => {
        const existing = map.get(m.summary_date);
        if (existing) existing.mortality = m.mortality_count || 0;
        else
          map.set(m.summary_date, {
            date: m.summary_date,
            eggs: 0,
            mortality: m.mortality_count || 0,
          });
      });

      return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!user && !!batch,
  });
}

