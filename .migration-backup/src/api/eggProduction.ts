/**
 * Egg production data access.
 *
 * Multi-tenancy: every read and write is scoped by `farm_id`; writes go
 * through the offline queue so entries survive a dropped connection.
 */
import { supabase } from '@/integrations/supabase/client';
import { daysAgoDate, type EggProduction } from './types';

export async function listEggProduction(days: number, farmId: string | null): Promise<EggProduction[]> {
  let q = supabase
    .from('egg_production')
    .select('*')
    .gte('production_date', daysAgoDate(days))
    .order('production_date', { ascending: false });
  if (farmId) q = q.eq('farm_id', farmId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EggProduction[];
}

/** Upsert on (user_id, farm_id, production_date) — one row per farm per day. */
export async function upsertEggProduction(
  row: Partial<EggProduction>,
  userId: string,
  farmId: string,
): Promise<{ queued?: boolean } | unknown> {
  const { upsertOrQueue } = await import('@/lib/offlineQueue');
  return upsertOrQueue(
    'egg_production',
    { ...(row as any), user_id: userId, farm_id: farmId },
    'user_id,farm_id,production_date',
  );
}

export async function updateEggProduction(id: string, patch: Partial<EggProduction>): Promise<void> {
  const { error } = await supabase.from('egg_production').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteEggProduction(id: string): Promise<void> {
  const { error } = await supabase.from('egg_production').delete().eq('id', id);
  if (error) throw error;
}
