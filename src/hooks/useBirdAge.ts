import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFarmType } from '@/hooks/useFarmType';
import { useFlockInfo, useUpdateFlockInfo } from '@/hooks/useFarmManagement';
import { useActiveBatch, useUpdateBatch } from '@/hooks/useBroilerData';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useDailyTick } from '@/hooks/useDailyTick';

/**
 * Unified Bird Age — single source of truth.
 *
 * 🐔 Layer  → flock_info.age_weeks       (manual weekly age)
 * 🐤 Broiler → broiler_batches.start_date (auto-derived daily age)
 *
 * Returns BOTH ageDays and ageWeeks regardless of farm type so any consumer
 * (lighting suggestion, broiler temp curve, automation) can use the value
 * directly without worrying about the underlying schema.
 */
export interface UnifiedBirdAge {
  ageDays: number | null;
  ageWeeks: number | null;
  source: 'broiler_batch' | 'flock_info' | 'none';
  sourceLabel: { bn: string; en: string };
  startDate: string | null;       // ISO date for broiler
  isLoading: boolean;
  hasValue: boolean;
}

export function useBirdAge(): UnifiedBirdAge {
  const { isBroiler } = useFarmType();
  const { data: flockInfo, isLoading: flockLoading } = useFlockInfo();
  const { data: activeBatch, isLoading: batchLoading } = useActiveBatch();

  return useMemo<UnifiedBirdAge>(() => {
    if (isBroiler) {
      const startDate = activeBatch?.start_date ?? null;
      const ageDays = startDate
        ? Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000))
        : null;
      return {
        ageDays,
        ageWeeks: ageDays !== null ? Math.floor(ageDays / 7) : null,
        source: startDate ? 'broiler_batch' : 'none',
        sourceLabel: { bn: 'ব্রয়লার ব্যাচ', en: 'Broiler Batch' },
        startDate,
        isLoading: batchLoading,
        hasValue: ageDays !== null,
      };
    }

    // Layer
    const ageWeeks = flockInfo?.age_weeks ?? null;
    return {
      ageDays: ageWeeks !== null ? ageWeeks * 7 : null,
      ageWeeks,
      source: ageWeeks !== null ? 'flock_info' : 'none',
      sourceLabel: { bn: 'লেয়ার ফ্লক', en: 'Layer Flock' },
      startDate: null,
      isLoading: flockLoading,
      hasValue: ageWeeks !== null,
    };
  }, [isBroiler, flockInfo, activeBatch, flockLoading, batchLoading]);
}

/**
 * Unified update — accepts either ageWeeks (layer) or startDate (broiler).
 * Routes to the correct table based on farm type.
 */
export function useUpdateBirdAge() {
  const queryClient = useQueryClient();
  const { isBroiler } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  const updateFlock = useUpdateFlockInfo();
  const updateBatch = useUpdateBatch();

  const isPending = updateFlock.isPending || updateBatch.isPending;

  /**
   * Force every age-dependent feature to recompute against the new value.
   * - Sources: flock_info, broiler-batch-active, broiler-batches
   * - Derived: lighting suggestion, lighting curve, automation status,
   *   broiler temp curve, FCR, daily summary
   *
   * useAgeLightingSuggestion / useAutomationStatus are pure useMemo wrappers
   * over the source queries above, so invalidating the sources is enough —
   * but we also nudge the lighting schedule + daily summary caches that may
   * have age-derived recommendations baked in.
   */
  const invalidateAgeDependents = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['flock-info'] }),
      queryClient.invalidateQueries({ queryKey: ['broiler-batch-active'] }),
      queryClient.invalidateQueries({ queryKey: ['broiler-batches'] }),
      queryClient.invalidateQueries({ queryKey: ['lighting-schedule'] }),
      queryClient.invalidateQueries({ queryKey: ['lighting-curve'] }),
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['farm-settings'] }),
    ]);
  };

  const mutate = async (input: { ageWeeks?: number; startDate?: string }) => {
    if (isBroiler) {
      // Broiler: persist start_date on the active batch
      if (!activeBatch?.id) {
        throw new Error('No active broiler batch — please create a batch first.');
      }
      const startDate =
        input.startDate ??
        (input.ageWeeks !== undefined
          ? new Date(Date.now() - input.ageWeeks * 7 * 86_400_000).toISOString().split('T')[0]
          : undefined);
      if (!startDate) throw new Error('startDate or ageWeeks is required');
      const result = await updateBatch.mutateAsync({ id: activeBatch.id, start_date: startDate });
      await invalidateAgeDependents();
      return result;
    }

    // Layer: persist age_weeks on flock_info
    const ageWeeks =
      input.ageWeeks ??
      (input.startDate
        ? Math.floor((Date.now() - new Date(input.startDate).getTime()) / (7 * 86_400_000))
        : undefined);
    if (ageWeeks === undefined) throw new Error('ageWeeks or startDate is required');
    const result = await updateFlock.mutateAsync({ age_weeks: ageWeeks });
    await invalidateAgeDependents();
    return result;
  };

  return { mutate, isPending };
}
