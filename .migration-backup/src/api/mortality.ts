/**
 * Mortality record data access.
 *
 * Rows carry both `farm_id` and `farm_mode` so reports stay correct even when
 * the shed is later re-typed. Writes go through the offline queue.
 */
import { supabase } from '@/integrations/supabase/client';
import { daysAgoDate, type MortalityRecord } from './types';

/** Returns raw rows joined with shed farm/type so callers can scope-filter. */
export async function listMortalityRecords(days: number): Promise<any[]> {
  const { data, error } = await supabase
    .from('mortality_records')
    .select('*, sheds:shed_id(farm_id, farm_type)')
    .gte('record_date', daysAgoDate(days))
    .order('record_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertMortalityRecord(
  row: Partial<MortalityRecord>,
  opts: {
    userId: string;
    farmId: string;
    shedId: string | null;
    farmMode: 'layer' | 'broiler' | null;
    activeBatchId: string | null;
  },
) {
  const { insertOrQueue } = await import('@/lib/offlineQueue');
  return insertOrQueue('mortality_records', {
    ...(row as any),
    shed_id: opts.shedId,
    farm_id: opts.farmId,
    farm_mode: opts.farmMode,
    batch_id: (row as any).batch_id ?? opts.activeBatchId,
    user_id: opts.userId,
  });
}

export async function updateMortalityRecord(id: string, patch: Partial<MortalityRecord>): Promise<void> {
  const { error } = await supabase.from('mortality_records').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteMortalityRecord(id: string): Promise<void> {
  const { error } = await supabase.from('mortality_records').delete().eq('id', id);
  if (error) throw error;
}
