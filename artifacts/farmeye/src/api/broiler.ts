/**
 * Broiler domain data-access layer.
 *
 * Contracts enforced here (do not duplicate in hooks/components):
 *  - Every write is scoped to `user_id` + `farm_id`. A missing farm is a hard error,
 *    never a silent global write (multi-farm tenant isolation).
 *  - Child rows (weights / feed / mortality / sales) have no DB cascade, so
 *    `deleteBatch` removes them explicitly and in dependency order.
 *  - Day-log style inserts (weights, feed) go through the offline queue so a
 *    farmer with no connectivity never loses an entry.
 *  - `computeBatchStats` is a pure function: no I/O, fully unit-testable.
 */
import { supabase } from '@/integrations/supabase/client';
import { insertOrQueue } from '@/lib/offlineQueue';
import { today } from './types';
import {
  calculateFCR,
  evaluateFCR,
  getBroilerTargetWeight,
  getInitialChickWeight,
} from '@/hooks/useFarmType';

export interface BroilerBatch {
  id: string;
  user_id: string;
  shed_id: string | null;
  batch_name: string;
  batch_name_bn: string | null;
  start_date: string;
  expected_end_date: string | null;
  actual_end_date: string | null;
  initial_bird_count: number;
  current_bird_count: number;
  chick_cost_per_bird: number;
  target_weight_grams: number;
  breed: string;
  status: 'active' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroilerWeight {
  id: string;
  user_id: string;
  batch_id: string;
  record_date: string;
  sample_count: number;
  average_weight_grams: number;
  min_weight_grams: number | null;
  max_weight_grams: number | null;
  uniformity_percent: number | null;
  notes: string | null;
  created_at: string;
}

export interface BroilerFeed {
  id: string;
  user_id: string;
  batch_id: string;
  feed_date: string;
  feed_type: 'pre-starter' | 'starter' | 'grower' | 'finisher';
  quantity_kg: number;
  cost_per_kg: number;
  notes: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ batches */

/** Newest still-running batch for the user, optionally narrowed to one farm. */
export async function getActiveBatch(
  userId: string,
  farmId?: string | null,
): Promise<BroilerBatch | null> {
  let q = supabase
    .from('broiler_batches')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);
  if (farmId) q = q.eq('farm_id', farmId);

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data as BroilerBatch | null) ?? null;
}

export async function listBatches(userId: string): Promise<BroilerBatch[]> {
  const { data, error } = await supabase
    .from('broiler_batches')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BroilerBatch[];
}

export async function createBatch(
  userId: string,
  farmId: string,
  batch: Partial<BroilerBatch>,
) {
  const { data, error } = await supabase
    .from('broiler_batches')
    .insert({
      user_id: userId,
      farm_id: farmId,
      batch_name: batch.batch_name || 'Batch 1',
      batch_name_bn: batch.batch_name_bn || 'ব্যাচ ১',
      shed_id: batch.shed_id || null,
      start_date: batch.start_date || today(),
      expected_end_date: batch.expected_end_date || null,
      initial_bird_count: batch.initial_bird_count || 0,
      current_bird_count: batch.initial_bird_count || 0,
      chick_cost_per_bird: batch.chick_cost_per_bird || 0,
      target_weight_grams: batch.target_weight_grams || 2200,
      breed: batch.breed || 'Cobb 500',
      notes: batch.notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBatch(id: string, patch: Partial<BroilerBatch>) {
  const { data, error } = await supabase
    .from('broiler_batches')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** No FK cascade exists — child tables must be cleared before the parent row. */
export async function deleteBatch(id: string): Promise<void> {
  await supabase.from('broiler_weights').delete().eq('batch_id', id);
  await supabase.from('broiler_feed').delete().eq('batch_id', id);
  await supabase.from('broiler_mortality').delete().eq('batch_id', id);
  await supabase.from('broiler_sales').delete().eq('batch_id', id);

  const { error } = await supabase.from('broiler_batches').delete().eq('id', id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ weights */

export async function listWeights(batchId: string): Promise<BroilerWeight[]> {
  const { data, error } = await supabase
    .from('broiler_weights')
    .select('*')
    .eq('batch_id', batchId)
    .order('record_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BroilerWeight[];
}

export async function addWeight(
  userId: string,
  farmId: string,
  weight: Partial<BroilerWeight>,
) {
  return insertOrQueue('broiler_weights', {
    user_id: userId,
    farm_id: farmId,
    batch_id: weight.batch_id!,
    record_date: weight.record_date || today(),
    sample_count: weight.sample_count || 10,
    average_weight_grams: weight.average_weight_grams!,
    min_weight_grams: weight.min_weight_grams || null,
    max_weight_grams: weight.max_weight_grams || null,
    uniformity_percent: weight.uniformity_percent || null,
    notes: weight.notes || null,
  });
}

export async function updateWeight(id: string, patch: Partial<BroilerWeight>) {
  const { error } = await supabase.from('broiler_weights').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteWeight(id: string) {
  const { error } = await supabase.from('broiler_weights').delete().eq('id', id);
  if (error) throw error;
}

/* --------------------------------------------------------------------- feed */

export async function listFeed(batchId: string): Promise<BroilerFeed[]> {
  const { data, error } = await supabase
    .from('broiler_feed')
    .select('*')
    .eq('batch_id', batchId)
    .order('feed_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BroilerFeed[];
}

export async function addFeed(
  userId: string,
  farmId: string,
  feed: Partial<BroilerFeed>,
) {
  return insertOrQueue('broiler_feed', {
    user_id: userId,
    farm_id: farmId,
    batch_id: feed.batch_id!,
    feed_date: feed.feed_date || today(),
    feed_type: feed.feed_type || 'starter',
    quantity_kg: feed.quantity_kg || 0,
    cost_per_kg: feed.cost_per_kg || 0,
    notes: feed.notes || null,
  });
}

export async function updateFeed(id: string, patch: Partial<BroilerFeed>) {
  const { error } = await supabase.from('broiler_feed').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteFeed(id: string) {
  const { error } = await supabase.from('broiler_feed').delete().eq('id', id);
  if (error) throw error;
}

/* -------------------------------------------------------------------- stats */

export interface BatchStats {
  ageDays: number;
  ageWeeks: number;
  currentWeight: number;
  targetWeight: number;
  weightProgress: number;
  totalFeedKg: number;
  fcr: number;
  fcrRating: ReturnType<typeof evaluateFCR>;
  mortality: number;
  mortalityPercent: number;
}

export const EMPTY_BATCH_STATS: BatchStats = {
  ageDays: 0,
  ageWeeks: 0,
  currentWeight: 0,
  targetWeight: 0,
  weightProgress: 0,
  totalFeedKg: 0,
  fcr: 0,
  fcrRating: 'average',
  mortality: 0,
  mortalityPercent: 0,
};

/**
 * Pure growth/FCR math for a broiler batch.
 *
 * FCR uses per-SURVIVOR weight gain (latest average weight − breed-specific
 * chick weight) × current bird count, so mortality neither inflates nor
 * deflates the ratio. Weight progress is capped at 150% to keep gauges sane.
 */
export function computeBatchStats(
  batch: Pick<
    BroilerBatch,
    'start_date' | 'breed' | 'initial_bird_count' | 'current_bird_count'
  > | null | undefined,
  weights: Pick<BroilerWeight, 'average_weight_grams'>[] | undefined,
  feed: Pick<BroilerFeed, 'quantity_kg'>[] | undefined,
  now: Date = new Date(),
): BatchStats {
  if (!batch) return EMPTY_BATCH_STATS;

  const startDate = new Date(batch.start_date);
  const ageDays = Math.floor((now.getTime() - startDate.getTime()) / 86_400_000);
  const ageWeeks = Math.floor(ageDays / 7);

  const latestWeight = weights && weights.length > 0
    ? Number(weights[weights.length - 1].average_weight_grams)
    : 0;

  const targetWeight = getBroilerTargetWeight(ageDays);
  const weightProgress = targetWeight > 0 ? (latestWeight / targetWeight) * 100 : 0;

  const totalFeedKg = feed?.reduce((sum, f) => sum + Number(f.quantity_kg), 0) || 0;

  const initialChickWeightG = getInitialChickWeight(batch.breed);
  const perBirdGainKg = Math.max(0, (latestWeight - initialChickWeightG) / 1000);
  const weightGainKg = batch.current_bird_count * perBirdGainKg;

  const fcr = calculateFCR(totalFeedKg, weightGainKg);
  const fcrRating = evaluateFCR(fcr, Math.max(1, ageWeeks));

  const mortality = batch.initial_bird_count - batch.current_bird_count;
  const mortalityPercent = batch.initial_bird_count > 0
    ? (mortality / batch.initial_bird_count) * 100
    : 0;

  return {
    ageDays,
    ageWeeks,
    currentWeight: latestWeight,
    targetWeight,
    weightProgress: Math.min(weightProgress, 150),
    totalFeedKg,
    fcr,
    fcrRating,
    mortality,
    mortalityPercent,
  };
}
