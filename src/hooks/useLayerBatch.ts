import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { enqueueBatchEdit } from '@/hooks/useBatchEditQueue';

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

// Delete batch (and its summary if exists)
export function useDeleteLayerBatch() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      // Delete summary first (no FK cascade guaranteed)
      await supabase.from('layer_batch_summary' as any).delete().eq('batch_id', batchId);
      const { error } = await supabase
        .from('layer_batches' as any)
        .delete()
        .eq('id', batchId);
      if (error) throw error;
      return { batchId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-summary'] });
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      toast({
        title: language === 'bn' ? 'ব্যাচ মুছে ফেলা হয়েছে' : 'Batch deleted',
      });
    },
    onError: (error: any) => {
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

// Shared recompute logic — returns summary fields for a batch given its dates & bird count.
// Exported so the offline queue (useBatchEditQueue) can use the SAME logic on sync.
export async function computeBatchSummary(
  userId: string,
  batch: LayerBatch,
  startDate: string,
  endDate: string
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationDays = Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / 86400000)
  );

  // Eggs (filter by farm too if known)
  let eggsQ = supabase
    .from('egg_production')
    .select('production_date,total_eggs')
    .eq('user_id', userId)
    .gte('production_date', startDate)
    .lte('production_date', endDate);
  if (batch.farm_id) eggsQ = eggsQ.eq('farm_id', batch.farm_id);
  const { data: eggs } = await eggsQ;

  const totalEggs = (eggs || []).reduce((s, e: any) => s + (e.total_eggs || 0), 0);

  // Real mortality from daily_summary (preferred) — fall back to initial-current diff.
  let mortalityQ = supabase
    .from('daily_summary')
    .select('summary_date,mortality_count')
    .eq('user_id', userId)
    .gte('summary_date', startDate)
    .lte('summary_date', endDate);
  if (batch.farm_id) mortalityQ = mortalityQ.eq('farm_id', batch.farm_id);
  const { data: mortRows } = await mortalityQ;

  const recordedMortality = (mortRows || []).reduce(
    (s, r: any) => s + (r.mortality_count || 0),
    0
  );
  const diffMortality = Math.max(
    0,
    batch.initial_bird_count - batch.current_bird_count
  );
  // Use the higher of recorded vs derived to avoid undercount when records are missing.
  const mortality = Math.max(recordedMortality, diffMortality);
  const mortalityPct =
    batch.initial_bird_count > 0 ? (mortality / batch.initial_bird_count) * 100 : 0;

  // Build cumulative-mortality-by-date index for accurate live-bird count when computing peak %
  const sortedMort = [...(mortRows || [])].sort((a: any, b: any) =>
    a.summary_date.localeCompare(b.summary_date)
  );
  function liveBirdsOn(dateIso: string): number {
    let cum = 0;
    for (const r of sortedMort as any[]) {
      if (r.summary_date <= dateIso) cum += r.mortality_count || 0;
      else break;
    }
    // Cap so we never exceed initial flock.
    const live = batch.initial_bird_count - cum;
    return live > 0 ? live : Math.max(batch.current_bird_count, 1);
  }

  // Peak production using LIVE birds on each date (not final current_bird_count)
  let peakPercent = 0;
  let peakAgeWeeks: number | null = null;
  if (eggs) {
    for (const e of eggs as any[]) {
      const live = liveBirdsOn(e.production_date);
      const pct = (e.total_eggs / live) * 100;
      // Cap at 100% to ignore obvious data-entry errors.
      const safePct = Math.min(pct, 100);
      if (safePct > peakPercent) {
        peakPercent = safePct;
        const dDays = Math.floor(
          (new Date(e.production_date).getTime() - start.getTime()) / 86400000
        );
        peakAgeWeeks = batch.age_at_start_weeks + Math.floor(dDays / 7);
      }
    }
  }

  // Feed
  let feedQ = supabase
    .from('feed_consumption')
    .select('quantity_kg,consumption_date')
    .eq('user_id', userId)
    .gte('consumption_date', startDate)
    .lte('consumption_date', endDate);
  if (batch.farm_id) feedQ = feedQ.eq('farm_id', batch.farm_id);
  const { data: feed } = await feedQ;

  const totalFeedKg = (feed || []).reduce((s, f: any) => s + Number(f.quantity_kg || 0), 0);

  // Quantity-weighted feed price (canonical)
  let invQ = supabase
    .from('feed_inventory')
    .select('unit_price,quantity_kg')
    .eq('user_id', userId);
  if (batch.farm_id) invQ = invQ.eq('farm_id', batch.farm_id);
  const { data: inv } = await invQ;
  const totalInvKg = (inv || []).reduce((s, i: any) => s + Number(i.quantity_kg || 0), 0);
  const totalInvCost = (inv || []).reduce(
    (s, i: any) => s + Number(i.unit_price || 0) * Number(i.quantity_kg || 0),
    0
  );
  const avgPricePerKg = totalInvKg > 0 ? totalInvCost / totalInvKg : 0;
  const totalFeedCost = totalFeedKg * avgPricePerKg;

  // FCR (layer): feed kg / egg mass kg, assume 60g/egg
  const eggMassKg = (totalEggs * 60) / 1000;
  const fcr = eggMassKg > 0 ? totalFeedKg / eggMassKg : 0;

  // Expenses
  let expQ = supabase
    .from('expenses')
    .select('amount,expense_date')
    .eq('user_id', userId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);
  if (batch.farm_id) expQ = expQ.eq('farm_id', batch.farm_id);
  const { data: exp } = await expQ;

  const totalExpenses = (exp || []).reduce((s, e: any) => s + Number(e.amount || 0), 0);
  const totalRevenue = 0;
  const netProfit =
    totalRevenue -
    totalExpenses -
    totalFeedCost -
    batch.initial_bird_count * (batch.chick_cost_per_bird || 0);

  return {
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
  };
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

      const { data: batchData, error: bErr } = await supabase
        .from('layer_batches' as any)
        .select('*')
        .eq('id', batchId)
        .single();
      if (bErr) throw bErr;
      const batch = batchData as unknown as LayerBatch;

      const endIso = endDate || new Date().toISOString().split('T')[0];
      const summary = await computeBatchSummary(user.id, batch, batch.start_date, endIso);

      const { error: sErr } = await supabase.from('layer_batch_summary' as any).insert({
        batch_id: batchId,
        user_id: user.id,
        farm_id: farmId,
        ...summary,
        notes: notes || null,
      } as any);
      if (sErr) throw sErr;

      const { error: uErr } = await supabase
        .from('layer_batches' as any)
        .update({
          status: 'completed',
          actual_end_date: endIso,
        } as any)
        .eq('id', batchId);
      if (uErr) throw uErr;

      // Auto-reset flock_info so stale "মোট মুরগি" doesn't linger after batch closes.
      // Only reset if no other ACTIVE batch exists for this farm.
      if (farmId) {
        const { data: stillActive } = await supabase
          .from('layer_batches' as any)
          .select('id')
          .eq('farm_id', farmId)
          .eq('status', 'active')
          .limit(1);

        if (!stillActive || stillActive.length === 0) {
          await supabase
            .from('flock_info')
            .update({
              total_birds: 0,
              purchase_date: null,
            })
            .eq('farm_id', farmId);
        }
      }

      return { batchId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-summary'] });
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
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

// Edit a completed batch (start/end date, bird counts) and recalc summary
export function useEditCompletedLayerBatch() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      batchId,
      batch_name_bn,
      breed,
      age_at_start_weeks,
      start_date,
      actual_end_date,
      initial_bird_count,
      current_bird_count,
      chick_cost_per_bird,
      notes,
      expectedUpdatedAt,
      force,
    }: {
      batchId: string;
      batch_name_bn?: string;
      breed?: string;
      age_at_start_weeks?: number;
      start_date: string;
      actual_end_date: string;
      initial_bird_count: number;
      current_bird_count: number;
      chick_cost_per_bird?: number;
      notes?: string;
      expectedUpdatedAt?: string;
      force?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // OFFLINE PATH: queue the edit and resolve optimistically.
      // The queue auto-syncs when connectivity returns.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (new Date(actual_end_date) < new Date(start_date)) {
          throw new Error(
            language === 'bn'
              ? 'শেষের তারিখ শুরুর তারিখের আগে হতে পারে না'
              : 'End date cannot be before start date'
          );
        }
        if (current_bird_count > initial_bird_count) {
          throw new Error(
            language === 'bn'
              ? 'চূড়ান্ত পাখি প্রাথমিকের চেয়ে বেশি হতে পারে না'
              : 'Final bird count cannot exceed initial'
          );
        }
        enqueueBatchEdit(batchId, {
          start_date,
          actual_end_date,
          initial_bird_count,
          current_bird_count,
          chick_cost_per_bird,
          notes,
        });
        return { batchId, queued: true } as any;
      }

      // Validation
      if (new Date(actual_end_date) < new Date(start_date)) {
        throw new Error(
          language === 'bn'
            ? 'শেষের তারিখ শুরুর তারিখের আগে হতে পারে না'
            : 'End date cannot be before start date'
        );
      }
      if (current_bird_count > initial_bird_count) {
        throw new Error(
          language === 'bn'
            ? 'চূড়ান্ত পাখি প্রাথমিকের চেয়ে বেশি হতে পারে না'
            : 'Final bird count cannot exceed initial'
        );
      }

      // Conflict check (optimistic concurrency)
      if (expectedUpdatedAt && !force) {
        const { data: latest, error: cErr } = await supabase
          .from('layer_batches' as any)
          .select('updated_at')
          .eq('id', batchId)
          .single();
        if (cErr) throw cErr;
        const latestTs = (latest as any)?.updated_at;
        if (latestTs && latestTs !== expectedUpdatedAt) {
          // Throw a typed conflict error the dialog can detect
          const err: any = new Error('CONFLICT');
          err.code = 'BATCH_CONFLICT';
          err.serverUpdatedAt = latestTs;
          throw err;
        }
      }

      // 1. Update batch row
      const updatePayload: any = {
        start_date,
        actual_end_date,
        initial_bird_count,
        current_bird_count,
      };
      if (chick_cost_per_bird !== undefined) updatePayload.chick_cost_per_bird = chick_cost_per_bird;
      if (batch_name_bn !== undefined && batch_name_bn !== '') {
        updatePayload.batch_name_bn = batch_name_bn;
        updatePayload.batch_name = batch_name_bn;
      }
      if (breed !== undefined) updatePayload.breed = breed;
      if (age_at_start_weeks !== undefined) updatePayload.age_at_start_weeks = age_at_start_weeks;

      const { data: updated, error: uErr } = await supabase
        .from('layer_batches' as any)
        .update(updatePayload)
        .eq('id', batchId)
        .select()
        .single();
      if (uErr) throw uErr;
      const batch = updated as unknown as LayerBatch;

      // 2. Recompute summary
      const summary = await computeBatchSummary(
        user.id,
        batch,
        start_date,
        actual_end_date
      );

      // 3. Upsert summary (delete old, insert fresh)
      await supabase.from('layer_batch_summary' as any).delete().eq('batch_id', batchId);
      const { error: sErr } = await supabase.from('layer_batch_summary' as any).insert({
        batch_id: batchId,
        user_id: user.id,
        farm_id: batch.farm_id,
        ...summary,
        notes: notes || null,
      } as any);
      if (sErr) throw sErr;

      return { batchId, summary };
    },
    onSuccess: (result: any) => {
      // Batch & summary
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-summary'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-trend'] });
      // SSOT-synced caches (DB trigger updates flock_info → cascade refresh)
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      queryClient.invalidateQueries({ queryKey: ['farm-settings'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['lighting-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['lighting-curve'] });
      if (result?.queued) {
        toast({
          title: language === 'bn' ? 'অফলাইন — সারিতে যোগ হয়েছে' : 'Offline — queued',
          description:
            language === 'bn'
              ? 'ইন্টারনেট ফিরলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে'
              : 'Will auto-sync when connectivity returns',
        });
        return;
      }
      toast({
        title: language === 'bn' ? 'আপডেট সফল' : 'Updated',
        description:
          language === 'bn'
            ? 'ব্যাচের তথ্য ও সারাংশ পুনরায় হিসাব করা হয়েছে'
            : 'Batch info & summary recalculated',
      });
    },
    onError: (error: any) => {
      // Conflict has its own UI in the dialog — don't toast
      if (error?.code === 'BATCH_CONFLICT') return;
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
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

