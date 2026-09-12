/**
 * Layer (egg-laying) batch domain data-access layer.
 *
 * Contracts enforced here (do not duplicate in hooks/components):
 *  - Writes are scoped to `user_id` + `farm_id`; a missing farm is a hard error.
 *  - `layer_batch_summary` has no guaranteed FK cascade → delete it before the batch.
 *  - Summary math is split in two: `fetchBatchInputs` does the I/O,
 *    `summarizeBatch` is a PURE function so the numbers are unit-testable.
 *  - Edit validation (`validateBatchEdit`) is pure and shared by the online path
 *    and the offline edit queue, so both reject the same bad data.
 *  - Optimistic concurrency: an edit carrying `expectedUpdatedAt` fails with a
 *    typed `BATCH_CONFLICT` error when the row moved underneath the user.
 */
import { supabase } from '@/integrations/supabase/client';
import { today } from './types';

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

export interface BatchTrendPoint {
  date: string;
  eggs: number;
  mortality: number;
}

/** Average mass of one egg in grams — used for layer FCR (feed kg / egg mass kg). */
export const EGG_MASS_GRAMS = 60;

/* ------------------------------------------------------------------ batches */

export async function getActiveLayerBatch(
  userId: string,
  farmId?: string | null,
): Promise<LayerBatch | null> {
  let q = supabase
    .from('layer_batches' as any)
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);
  if (farmId) q = q.eq('farm_id', farmId);

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data as unknown as LayerBatch | null) ?? null;
}

export async function listLayerBatches(
  userId: string,
  farmId?: string | null,
): Promise<LayerBatch[]> {
  let q = supabase
    .from('layer_batches' as any)
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  if (farmId) q = q.eq('farm_id', farmId);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as LayerBatch[];
}

export async function getLayerBatch(batchId: string): Promise<LayerBatch> {
  const { data, error } = await supabase
    .from('layer_batches' as any)
    .select('*')
    .eq('id', batchId)
    .single();
  if (error) throw error;
  return data as unknown as LayerBatch;
}

export async function createLayerBatch(
  userId: string,
  farmId: string,
  batch: Partial<LayerBatch>,
) {
  const { data, error } = await supabase
    .from('layer_batches' as any)
    .insert({
      user_id: userId,
      farm_id: farmId,
      shed_id: batch.shed_id || null,
      batch_name: batch.batch_name || 'Batch 1',
      batch_name_bn: batch.batch_name_bn || 'ব্যাচ ১',
      breed: batch.breed || 'Hy-Line Brown',
      start_date: batch.start_date || today(),
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
}

export async function updateLayerBatch(id: string, patch: Partial<LayerBatch>) {
  const { data, error } = await supabase
    .from('layer_batches' as any)
    .update(patch as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Summary row has no guaranteed cascade — remove it before the parent batch. */
export async function deleteLayerBatch(batchId: string) {
  await supabase.from('layer_batch_summary' as any).delete().eq('batch_id', batchId);
  const { error } = await supabase.from('layer_batches' as any).delete().eq('id', batchId);
  if (error) throw error;
  return { batchId };
}

export async function getLayerBatchSummary(
  batchId: string,
): Promise<LayerBatchSummary | null> {
  const { data, error } = await supabase
    .from('layer_batch_summary' as any)
    .select('*')
    .eq('batch_id', batchId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as LayerBatchSummary | null) ?? null;
}

/* ------------------------------------------------------------ summary maths */

export interface BatchInputs {
  eggs: { production_date: string; total_eggs: number }[];
  mortalityRows: { summary_date: string; mortality_count: number }[];
  feed: { quantity_kg: number }[];
  inventory: { unit_price: number; quantity_kg: number }[];
  expenses: { amount: number }[];
}

export interface ComputedBatchSummary {
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
  duration_days: number;
}

/** Fetch every raw input a batch summary needs, all scoped to user + farm. */
export async function fetchBatchInputs(
  userId: string,
  farmId: string | null,
  startDate: string,
  endDate: string,
): Promise<BatchInputs> {
  let eggsQ = supabase
    .from('egg_production')
    .select('production_date,total_eggs')
    .eq('user_id', userId)
    .gte('production_date', startDate)
    .lte('production_date', endDate);
  if (farmId) eggsQ = eggsQ.eq('farm_id', farmId);

  let mortalityQ = supabase
    .from('daily_summary')
    .select('summary_date,mortality_count')
    .eq('user_id', userId)
    .gte('summary_date', startDate)
    .lte('summary_date', endDate);
  if (farmId) mortalityQ = mortalityQ.eq('farm_id', farmId);

  let feedQ = supabase
    .from('feed_consumption')
    .select('quantity_kg,consumption_date')
    .eq('user_id', userId)
    .gte('consumption_date', startDate)
    .lte('consumption_date', endDate);
  if (farmId) feedQ = feedQ.eq('farm_id', farmId);

  let invQ = supabase
    .from('feed_inventory')
    .select('unit_price,quantity_kg')
    .eq('user_id', userId);
  if (farmId) invQ = invQ.eq('farm_id', farmId);

  let expQ = supabase
    .from('expenses')
    .select('amount,expense_date')
    .eq('user_id', userId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);
  if (farmId) expQ = expQ.eq('farm_id', farmId);

  const [eggsRes, mortRes, feedRes, invRes, expRes] = await Promise.all([
    eggsQ, mortalityQ, feedQ, invQ, expQ,
  ]);

  return {
    eggs: (eggsRes.data || []) as any,
    mortalityRows: (mortRes.data || []) as any,
    feed: (feedRes.data || []) as any,
    inventory: (invRes.data || []) as any,
    expenses: (expRes.data || []) as any,
  };
}

/**
 * PURE batch summary math. No I/O — safe to unit-test.
 *
 * Rules encoded here:
 *  - Mortality = max(recorded daily rows, initial − current) so a missing day
 *    log never undercounts deaths.
 *  - Peak lay % uses LIVE birds on that date (initial − cumulative mortality),
 *    not the final bird count, and is capped at 100% to absorb typos.
 *  - Feed cost uses the quantity-weighted average inventory price (canonical).
 *  - Layer FCR = feed kg / egg mass kg at 60 g per egg.
 *  - Net profit subtracts expenses, feed cost and the total chick purchase cost.
 */
export function summarizeBatch(
  batch: Pick<
    LayerBatch,
    'initial_bird_count' | 'current_bird_count' | 'age_at_start_weeks' | 'chick_cost_per_bird'
  >,
  inputs: BatchInputs,
  startDate: string,
  endDate: string,
): ComputedBatchSummary {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000));

  const totalEggs = inputs.eggs.reduce((s, e) => s + (e.total_eggs || 0), 0);

  const recordedMortality = inputs.mortalityRows.reduce(
    (s, r) => s + (r.mortality_count || 0),
    0,
  );
  const diffMortality = Math.max(0, batch.initial_bird_count - batch.current_bird_count);
  const mortality = Math.max(recordedMortality, diffMortality);
  const mortalityPct = batch.initial_bird_count > 0
    ? (mortality / batch.initial_bird_count) * 100
    : 0;

  const sortedMort = [...inputs.mortalityRows].sort((a, b) =>
    a.summary_date.localeCompare(b.summary_date),
  );
  const liveBirdsOn = (dateIso: string): number => {
    let cum = 0;
    for (const r of sortedMort) {
      if (r.summary_date <= dateIso) cum += r.mortality_count || 0;
      else break;
    }
    const live = batch.initial_bird_count - cum;
    return live > 0 ? live : Math.max(batch.current_bird_count, 1);
  };

  let peakPercent = 0;
  let peakAgeWeeks: number | null = null;
  for (const e of inputs.eggs) {
    const live = liveBirdsOn(e.production_date);
    const safePct = Math.min((e.total_eggs / live) * 100, 100);
    if (safePct > peakPercent) {
      peakPercent = safePct;
      const dDays = Math.floor(
        (new Date(e.production_date).getTime() - start.getTime()) / 86_400_000,
      );
      peakAgeWeeks = batch.age_at_start_weeks + Math.floor(dDays / 7);
    }
  }

  const totalFeedKg = inputs.feed.reduce((s, f) => s + Number(f.quantity_kg || 0), 0);

  const totalInvKg = inputs.inventory.reduce((s, i) => s + Number(i.quantity_kg || 0), 0);
  const totalInvCost = inputs.inventory.reduce(
    (s, i) => s + Number(i.unit_price || 0) * Number(i.quantity_kg || 0),
    0,
  );
  const avgPricePerKg = totalInvKg > 0 ? totalInvCost / totalInvKg : 0;
  const totalFeedCost = totalFeedKg * avgPricePerKg;

  const eggMassKg = (totalEggs * EGG_MASS_GRAMS) / 1000;
  const fcr = eggMassKg > 0 ? totalFeedKg / eggMassKg : 0;

  const totalExpenses = inputs.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
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

/**
 * Fetch + compute a batch summary.
 * Shared by the close-batch flow, the edit flow and the offline edit queue,
 * so every path produces byte-identical numbers.
 */
export async function computeBatchSummary(
  userId: string,
  batch: LayerBatch,
  startDate: string,
  endDate: string,
): Promise<ComputedBatchSummary> {
  const inputs = await fetchBatchInputs(userId, batch.farm_id, startDate, endDate);
  return summarizeBatch(batch, inputs, startDate, endDate);
}

/* ------------------------------------------------------------- close / edit */

/** Replace the stored summary row for a batch (delete + insert = idempotent). */
export async function replaceBatchSummary(
  batchId: string,
  userId: string,
  farmId: string | null,
  summary: ComputedBatchSummary,
  notes?: string | null,
) {
  await supabase.from('layer_batch_summary' as any).delete().eq('batch_id', batchId);
  const { error } = await supabase.from('layer_batch_summary' as any).insert({
    batch_id: batchId,
    user_id: userId,
    farm_id: farmId,
    ...summary,
    notes: notes || null,
  } as any);
  if (error) throw error;
}

/**
 * Close a batch: snapshot the summary, mark it completed and — only when no
 * other active batch remains on the farm — reset flock_info so a stale
 * "মোট মুরগি" count doesn't linger on the dashboard.
 */
export async function closeLayerBatch(
  userId: string,
  farmId: string | null,
  batchId: string,
  endDate?: string,
  notes?: string,
) {
  const batch = await getLayerBatch(batchId);
  const endIso = endDate || today();
  const summary = await computeBatchSummary(userId, batch, batch.start_date, endIso);

  const { error: sErr } = await supabase.from('layer_batch_summary' as any).insert({
    batch_id: batchId,
    user_id: userId,
    farm_id: farmId,
    ...summary,
    notes: notes || null,
  } as any);
  if (sErr) throw sErr;

  const { error: uErr } = await supabase
    .from('layer_batches' as any)
    .update({ status: 'completed', actual_end_date: endIso } as any)
    .eq('id', batchId);
  if (uErr) throw uErr;

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
        .update({ total_birds: 0, purchase_date: null })
        .eq('farm_id', farmId);
    }
  }

  return { batchId };
}

export interface BatchEditInput {
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
}

/**
 * PURE validation for a completed-batch edit. Returns a localized message,
 * or null when the edit is acceptable. Used by BOTH the online and offline
 * paths so a queued edit can never bypass the rules.
 */
export function validateBatchEdit(
  input: Pick<
    BatchEditInput,
    'start_date' | 'actual_end_date' | 'initial_bird_count' | 'current_bird_count' | 'age_at_start_weeks'
  >,
  language: 'bn' | 'en' = 'bn',
): string | null {
  const bn = language === 'bn';

  if (new Date(input.actual_end_date) < new Date(input.start_date)) {
    return bn
      ? 'শেষের তারিখ শুরুর তারিখের আগে হতে পারে না'
      : 'End date cannot be before start date';
  }
  if (input.current_bird_count > input.initial_bird_count) {
    return bn
      ? 'চূড়ান্ত পাখি প্রাথমিকের চেয়ে বেশি হতে পারে না'
      : 'Final bird count cannot exceed initial';
  }
  if (
    input.age_at_start_weeks !== undefined &&
    (input.age_at_start_weeks < 0 || input.age_at_start_weeks > 80)
  ) {
    return bn
      ? 'শুরুর বয়স ০–৮০ সপ্তাহের মধ্যে হতে হবে'
      : 'Start age must be between 0 and 80 weeks';
  }
  return null;
}

/** Build the sparse update payload for a batch edit (omits untouched fields). */
export function buildBatchEditPayload(input: BatchEditInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    start_date: input.start_date,
    actual_end_date: input.actual_end_date,
    initial_bird_count: input.initial_bird_count,
    current_bird_count: input.current_bird_count,
  };
  if (input.chick_cost_per_bird !== undefined) {
    payload.chick_cost_per_bird = input.chick_cost_per_bird;
  }
  if (input.batch_name_bn !== undefined && input.batch_name_bn !== '') {
    payload.batch_name_bn = input.batch_name_bn;
    payload.batch_name = input.batch_name_bn;
  }
  if (input.breed !== undefined) payload.breed = input.breed;
  if (input.age_at_start_weeks !== undefined) {
    payload.age_at_start_weeks = input.age_at_start_weeks;
  }
  return payload;
}

/** Optimistic-concurrency guard — throws a typed BATCH_CONFLICT error. */
export async function assertNoEditConflict(batchId: string, expectedUpdatedAt: string) {
  const { data, error } = await supabase
    .from('layer_batches' as any)
    .select('updated_at')
    .eq('id', batchId)
    .single();
  if (error) throw error;

  const latestTs = (data as any)?.updated_at;
  if (latestTs && latestTs !== expectedUpdatedAt) {
    const err: any = new Error('CONFLICT');
    err.code = 'BATCH_CONFLICT';
    err.serverUpdatedAt = latestTs;
    throw err;
  }
}

/** Apply an edit to a completed batch and recompute its stored summary. */
export async function editCompletedLayerBatch(userId: string, input: BatchEditInput) {
  if (input.expectedUpdatedAt && !input.force) {
    await assertNoEditConflict(input.batchId, input.expectedUpdatedAt);
  }

  const { data: updated, error: uErr } = await supabase
    .from('layer_batches' as any)
    .update(buildBatchEditPayload(input))
    .eq('id', input.batchId)
    .select()
    .single();
  if (uErr) throw uErr;
  const batch = updated as unknown as LayerBatch;

  const summary = await computeBatchSummary(
    userId,
    batch,
    input.start_date,
    input.actual_end_date,
  );
  await replaceBatchSummary(input.batchId, userId, batch.farm_id, summary, input.notes);

  return { batchId: input.batchId, summary };
}

/* -------------------------------------------------------------------- trend */

/** Daily eggs + mortality series for a batch window (mini chart). */
export async function getBatchTrend(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<BatchTrendPoint[]> {
  const [eggsRes, mortRes] = await Promise.all([
    supabase
      .from('egg_production')
      .select('production_date,total_eggs')
      .eq('user_id', userId)
      .gte('production_date', startDate)
      .lte('production_date', endDate)
      .order('production_date', { ascending: true }),
    supabase
      .from('daily_summary')
      .select('summary_date,mortality_count')
      .eq('user_id', userId)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: true }),
  ]);

  return mergeTrendSeries(
    (eggsRes.data || []) as any,
    (mortRes.data || []) as any,
  );
}

/** PURE merge of the egg and mortality series into one sorted timeline. */
export function mergeTrendSeries(
  eggs: { production_date: string; total_eggs: number }[],
  mortality: { summary_date: string; mortality_count: number }[],
): BatchTrendPoint[] {
  const map = new Map<string, BatchTrendPoint>();

  eggs.forEach((e) => {
    map.set(e.production_date, {
      date: e.production_date,
      eggs: e.total_eggs || 0,
      mortality: 0,
    });
  });
  mortality.forEach((m) => {
    const existing = map.get(m.summary_date);
    if (existing) existing.mortality = m.mortality_count || 0;
    else map.set(m.summary_date, {
      date: m.summary_date,
      eggs: 0,
      mortality: m.mortality_count || 0,
    });
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
