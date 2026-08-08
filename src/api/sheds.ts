/**
 * Shed (house) data access.
 *
 * Tenant scoping rule: sheds belong to a farm. When an active farm is selected
 * every read/write is scoped by `farm_id`. Legacy single-farm accounts created
 * before multi-farm support have `farm_id = null`, so those fall back to
 * `user_id` scoping — never drop the filter entirely.
 *
 * Validation is pure (`validateShedInput`) so it can be unit tested and reused
 * by the offline queue without touching the network.
 */
import { supabase } from '@/integrations/supabase/client';

export interface Shed {
  id: string;
  user_id: string;
  farm_id?: string | null;
  name: string;
  name_en: string;
  description: string | null;
  bird_capacity: number;
  farm_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShedInput {
  name: string;
  name_en: string;
  description?: string;
  bird_capacity?: number;
}

export interface ShedScope {
  userId: string;
  farmId: string | null;
}

export const MAX_BIRD_CAPACITY = 1_000_000;

/** Pure validation shared by online mutations and the offline replay queue. */
export function validateShedInput(
  input: Partial<ShedInput>,
  options: { partial?: boolean } = {},
): string | null {
  // On partial (update) payloads only the supplied fields are checked.
  if (!options.partial || input.name !== undefined) {
    const name = (input.name ?? '').trim();
    if (!name) return 'শেডের নাম দিন';
    if (name.length > 80) return 'শেডের নাম অনেক বড় (সর্বোচ্চ ৮০ অক্ষর)';
  }

  const capacity = input.bird_capacity;
  if (capacity !== undefined && capacity !== null) {
    if (!Number.isFinite(capacity) || capacity < 0) return 'ধারণক্ষমতা ঋণাত্মক হতে পারে না';
    if (capacity > MAX_BIRD_CAPACITY) return 'ধারণক্ষমতা অস্বাভাবিক বেশি';
  }
  return null;
}

export async function listSheds(scope: ShedScope): Promise<Shed[]> {
  let query = supabase.from('sheds').select('*').order('created_at', { ascending: true });
  query = scope.farmId ? query.eq('farm_id', scope.farmId) : query.eq('user_id', scope.userId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Shed[];
}

export async function createShed(scope: ShedScope, input: ShedInput): Promise<Shed> {
  const invalid = validateShedInput(input);
  if (invalid) throw new Error(invalid);

  const { data, error } = await supabase
    .from('sheds')
    .insert({ ...input, user_id: scope.userId, farm_id: scope.farmId ?? null } as any)
    .select()
    .single();
  if (error) throw error;
  return data as Shed;
}

export async function updateShed(id: string, updates: Partial<Shed>): Promise<void> {
  const invalid = validateShedInput(updates, { partial: true });
  if (invalid) throw new Error(invalid);

  const { error } = await supabase.from('sheds').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteShed(id: string): Promise<void> {
  const { error } = await supabase.from('sheds').delete().eq('id', id);
  if (error) throw error;
}
