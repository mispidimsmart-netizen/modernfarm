/**
 * Feed inventory & consumption data access.
 *
 * Costing rule: buying feed is stock only — it never creates an expense.
 * The expense is booked when feed is *consumed*, valued at the weighted
 * average ৳/kg of the current stock for that feed type. The generated row is
 * tagged `[Auto-Feed-Usage:<consumption_id>]` so it can be re-derived on edit
 * and removed on delete.
 */
import { supabase } from '@/integrations/supabase/client';
import { daysAgoDate, type FeedConsumption, type FeedInventory } from './types';

// ───────────────────────── Inventory ─────────────────────────

export async function listFeedInventory(): Promise<FeedInventory[]> {
  const { data, error } = await supabase
    .from('feed_inventory')
    .select('*')
    .order('purchase_date', { ascending: false });
  if (error) throw error;
  return data as FeedInventory[];
}

export async function insertFeedInventory(
  row: Partial<FeedInventory>,
  userId: string,
  farmId: string | null,
) {
  const { data, error } = await supabase
    .from('feed_inventory')
    .insert({ ...(row as any), user_id: userId, ...(farmId ? { farm_id: farmId } : {}) } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFeedInventory(id: string, patch: Partial<FeedInventory>): Promise<void> {
  const { error } = await supabase.from('feed_inventory').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteFeedInventory(id: string): Promise<void> {
  const { error } = await supabase.from('feed_inventory').delete().eq('id', id);
  if (error) throw error;
}

/** Weighted-average cost per kg for a feed type across current stock rows. */
export async function getWeightedAvgCostPerKg(feedType: string, farmId: string | null): Promise<number> {
  let q = supabase.from('feed_inventory').select('quantity_kg, unit_price').eq('feed_type', feedType);
  if (farmId) q = q.eq('farm_id', farmId);
  const { data, error } = await q;
  if (error || !data || data.length === 0) return 0;

  let totalQty = 0;
  let totalCost = 0;
  for (const row of data as any[]) {
    const qty = Number(row.quantity_kg || 0);
    const price = Number(row.unit_price || 0);
    totalQty += qty;
    totalCost += qty * price;
  }
  return totalQty > 0 ? totalCost / totalQty : 0;
}

// ───────────────────────── Consumption ─────────────────────────

export async function listFeedConsumption(days: number, farmId: string | null): Promise<FeedConsumption[]> {
  let q = supabase
    .from('feed_consumption')
    .select('*')
    .gte('consumption_date', daysAgoDate(days))
    .order('consumption_date', { ascending: false });
  if (farmId) q = q.eq('farm_id', farmId);
  const { data, error } = await q;
  if (error) throw error;
  return data as FeedConsumption[];
}

/** Removes the auto-generated expense linked to a consumption row. */
export async function deleteLinkedFeedExpense(consumptionId: string): Promise<void> {
  await supabase.from('expenses').delete().like('description', `[Auto-Feed-Usage:${consumptionId}]%`);
}

export async function insertFeedConsumption(
  row: Partial<FeedConsumption> & { feed_type: string; quantity_kg: number; consumption_date: string },
  opts: { userId: string; farmId: string; activeBatchId: string | null; farmMode: 'layer' | 'broiler' | null },
) {
  const batchId = (row as any).batch_id ?? opts.activeBatchId;

  const { data: inserted, error } = await supabase
    .from('feed_consumption')
    .insert({ ...(row as any), batch_id: batchId, user_id: opts.userId, farm_id: opts.farmId } as any)
    .select()
    .single();
  if (error) throw error;

  const avgCost = await getWeightedAvgCostPerKg(row.feed_type, opts.farmId);
  const totalCost = Number(row.quantity_kg || 0) * avgCost;
  if (totalCost > 0 && inserted?.id) {
    const description = `[Auto-Feed-Usage:${inserted.id}] ${row.feed_type} • ${row.quantity_kg}kg @ ৳${avgCost.toFixed(2)}/kg`;
    const { error: expErr } = await supabase.from('expenses').insert({
      user_id: opts.userId,
      farm_id: opts.farmId,
      expense_date: row.consumption_date,
      category: 'feed',
      amount: Number(totalCost.toFixed(2)),
      description,
      batch_id: batchId,
      farm_mode: opts.farmMode,
    } as any);
    if (expErr) console.warn('Auto-expense for feed usage failed:', expErr.message);
  }
  return inserted;
}

export async function deleteFeedConsumption(id: string): Promise<void> {
  await deleteLinkedFeedExpense(id);
  const { error } = await supabase.from('feed_consumption').delete().eq('id', id);
  if (error) throw error;
}

/** Applies the patch, then re-derives the linked auto-expense from fresh values. */
export async function updateFeedConsumption(
  id: string,
  patch: Partial<FeedConsumption>,
  farmId: string | null,
): Promise<void> {
  const { error } = await supabase.from('feed_consumption').update(patch).eq('id', id);
  if (error) throw error;

  await deleteLinkedFeedExpense(id);

  const { data: row } = await supabase.from('feed_consumption').select('*').eq('id', id).maybeSingle();
  if (!row) return;

  const r: any = row;
  const avgCost = await getWeightedAvgCostPerKg(r.feed_type, farmId);
  const totalCost = Number(r.quantity_kg || 0) * avgCost;
  if (totalCost > 0) {
    await supabase.from('expenses').insert({
      user_id: r.user_id,
      farm_id: r.farm_id,
      expense_date: r.consumption_date,
      category: 'feed',
      amount: Number(totalCost.toFixed(2)),
      description: `[Auto-Feed-Usage:${id}] ${r.feed_type} • ${r.quantity_kg}kg @ ৳${avgCost.toFixed(2)}/kg`,
    } as any);
  }
}
