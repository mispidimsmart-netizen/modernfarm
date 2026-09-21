/**
 * Finance (expense / income) data access.
 *
 * Every finance row is batch-scoped: it stores the active `batch_id` and
 * `farm_mode` at write time so reports for a finished batch never shift when a
 * new batch starts. Writes go through the offline queue.
 */
import { supabase } from '@/integrations/supabase/client';
import { daysAgoDate, type ActiveScope, type Expense, type Income } from './types';

/**
 * Resolves the active batch + farm mode for a farm without React hooks, so it
 * can be called from inside a mutationFn (keeps hook order stable across HMR).
 */
export async function resolveActiveScope(farmId: string): Promise<ActiveScope> {
  try {
    const [layerRes, broilerRes] = await Promise.all([
      supabase.from('layer_batches').select('id,start_date').eq('farm_id', farmId).eq('status', 'active')
        .order('start_date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('broiler_batches').select('id,start_date').eq('farm_id', farmId).eq('status', 'active')
        .order('start_date', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const layer = (layerRes.data as any) ?? null;
    const broiler = (broilerRes.data as any) ?? null;
    if (layer && broiler) {
      // Mixed-mode farm: the batch that started most recently wins, instead of
      // always tagging finance rows to the layer batch.
      const layerWins = String(layer.start_date || '') >= String(broiler.start_date || '');
      return layerWins
        ? { activeBatchId: layer.id, farmMode: 'layer' }
        : { activeBatchId: broiler.id, farmMode: 'broiler' };
    }
    if (layer) return { activeBatchId: layer.id, farmMode: 'layer' };
    if (broiler) return { activeBatchId: broiler.id, farmMode: 'broiler' };
    return { activeBatchId: null, farmMode: null };
  } catch {
    return { activeBatchId: null, farmMode: null };
  }
}

// ───────────────────────── Expenses ─────────────────────────

export async function listExpenses(days: number, farmId: string | null): Promise<Expense[]> {
  let q = supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', daysAgoDate(days))
    .order('expense_date', { ascending: false });
  if (farmId) q = q.eq('farm_id', farmId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Expense[];
}

export async function insertExpense(row: Record<string, any>, userId: string, farmId: string) {
  const { activeBatchId, farmMode } = await resolveActiveScope(farmId);
  const { insertOrQueue } = await import('@/lib/offlineQueue');
  return insertOrQueue('expenses', {
    ...row,
    batch_id: row.batch_id ?? activeBatchId,
    farm_mode: row.farm_mode ?? farmMode,
    user_id: userId,
    farm_id: farmId,
  });
}

export async function updateExpense(id: string, patch: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('expenses').update(patch as never).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ───────────────────────── Income ─────────────────────────

export async function listIncome(days: number, farmId: string | null): Promise<Income[]> {
  let q = supabase
    .from('income')
    .select('*')
    .gte('income_date', daysAgoDate(days))
    .order('income_date', { ascending: false });
  if (farmId) q = q.eq('farm_id', farmId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Income[];
}

export async function insertIncome(row: Record<string, any>, userId: string, farmId: string) {
  const { activeBatchId, farmMode } = await resolveActiveScope(farmId);
  const { insertOrQueue } = await import('@/lib/offlineQueue');
  return insertOrQueue('income', {
    ...row,
    source: row.source || row.category || 'other',
    batch_id: row.batch_id ?? activeBatchId,
    farm_mode: row.farm_mode ?? farmMode,
    user_id: userId,
    farm_id: farmId,
  });
}

export async function updateIncome(id: string, patch: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('income').update(patch as never).eq('id', id);
  if (error) throw error;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from('income').delete().eq('id', id);
  if (error) throw error;
}
