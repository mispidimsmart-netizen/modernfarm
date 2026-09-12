/**
 * Flock info data access (layer farms).
 *
 * Age is safety-critical: it drives target temperature and lighting curves, so
 * an implausible value must be rejected, not merely warned about.
 *  - Range: 0–100 weeks (layer biological cycle). Broiler ages (0–60 days) are
 *    validated in the broiler batch flow, not here.
 *  - Jump guard: max ±4 weeks change within 24 hours.
 * Both rejections and accepted changes are written to `farm_audit_logs`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { FlockInfo } from './types';

export const LAYER_MAX_WEEKS = 100;
const MAX_WEEK_JUMP = 4;
const JUMP_WINDOW_HOURS = 24;

export async function getFlockInfo(farmId: string | null): Promise<FlockInfo | null> {
  let query = supabase.from('flock_info').select('*');
  if (farmId) query = query.eq('farm_id', farmId);
  const { data, error } = await query.maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data as FlockInfo | null;
}

async function logAgeEvent(
  userId: string,
  severity: 'info' | 'warning',
  category: 'safety' | 'farm',
  metadata: Record<string, unknown>,
) {
  await (supabase.from('farm_audit_logs') as any).insert({
    user_id: userId,
    action_type: 'age_override_event',
    action_category: category,
    severity,
    source: 'app',
    metadata,
  });
}

/** Validates age (when present) and upserts the flock row for the farm. */
export async function upsertFlockInfo(
  patch: Partial<FlockInfo>,
  userId: string,
  farmId: string,
): Promise<void> {
  if (patch.age_weeks !== undefined) {
    const newAgeDays = patch.age_weeks * 7;

    if (patch.age_weeks < 0 || patch.age_weeks > LAYER_MAX_WEEKS) {
      await logAgeEvent(userId, 'warning', 'safety', {
        submitted_age_weeks: patch.age_weeks,
        submitted_age_days: newAgeDays,
        rejection_reason: `outside_layer_range_0_${LAYER_MAX_WEEKS}_weeks`,
      });
      throw new Error(`বয়স ${patch.age_weeks} সপ্তাহ গ্রহণযোগ্য সীমার বাইরে (০–${LAYER_MAX_WEEKS} সপ্তাহ)`);
    }

    const { data: currentFlock } = await supabase
      .from('flock_info')
      .select('age_weeks, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (currentFlock) {
      const currentAgeWeeks = currentFlock.age_weeks || 0;
      const ageDeltaWeeks = Math.abs(patch.age_weeks - currentAgeWeeks);
      const lastUpdate = currentFlock.updated_at ? new Date(currentFlock.updated_at) : null;
      const hoursSinceUpdate = lastUpdate
        ? (Date.now() - lastUpdate.getTime()) / (60 * 60 * 1000)
        : Infinity;

      if (ageDeltaWeeks > MAX_WEEK_JUMP && hoursSinceUpdate < JUMP_WINDOW_HOURS) {
        await logAgeEvent(userId, 'warning', 'safety', {
          submitted_age_weeks: patch.age_weeks,
          current_age_weeks: currentFlock.age_weeks,
          delta_weeks: ageDeltaWeeks,
          hours_since_last_update: Math.round(hoursSinceUpdate),
          rejection_reason: 'jump_exceeds_4_weeks_in_24h',
        });
        throw new Error(
          `বয়স পরিবর্তন অনেক বেশি: ${ageDeltaWeeks} সপ্তাহ পরিবর্তন ${Math.round(hoursSinceUpdate)} ঘন্টায়। সর্বোচ্চ ৪ সপ্তাহ/২৪ ঘন্টা।`,
        );
      }
    }

    await logAgeEvent(userId, 'info', 'farm', { new_age_weeks: patch.age_weeks, accepted: true });
  }

  const { error } = await supabase.from('flock_info').upsert(
    { ...patch, user_id: userId, farm_id: farmId, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}
