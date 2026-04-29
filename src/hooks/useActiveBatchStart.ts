import { useContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { ShedContext } from '@/hooks/useSheds';
import { useFarmContext } from '@/context/FarmContext';

/**
 * Returns the start_date (YYYY-MM-DD) of the currently active batch
 * for the selected farm mode (layer or broiler).
 *
 * Side-effect: when the farm/shed/mode/active-batch changes, this hook
 * invalidates the report queries (expenses, income, mortality, batches)
 * so the report tab refreshes immediately with batch-scoped data.
 *
 * Returns null while loading or when no active batch exists.
 */
export function useActiveBatchStart(): string | null {
  const { type, isLayer, isBroiler } = useFarmType();
  const { data: layerBatch } = useActiveLayerBatch();
  const { data: broilerBatch } = useActiveBatch();
  const queryClient = useQueryClient();
  const { selectedFarmId } = useFarmContext();

  // Read selected shed if a ShedProvider is mounted (otherwise ignore).
  let selectedShedId: string | null = null;
  try {
    selectedShedId = useSelectedShed().selectedShedId;
  } catch {
    // No ShedProvider — fine, just skip shed-scoped invalidation.
  }

  const activeBatchId = isLayer
    ? (layerBatch?.id ?? null)
    : isBroiler
      ? ((broilerBatch as any)?.id ?? null)
      : null;

  // Whenever the effective scope changes (farm, shed, mode, or active batch),
  // invalidate the report-related queries so consumers refetch and re-filter.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['expenses'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['income'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['mortality-records'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['feed-consumption'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['egg-production'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['broiler-batch-active'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['layer-batch-active'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['daily-summary'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['today-summary'], refetchType: 'active' });
  }, [queryClient, type, selectedFarmId, selectedShedId, activeBatchId]);

  if (isLayer && layerBatch?.start_date) return layerBatch.start_date;
  if (isBroiler && (broilerBatch as any)?.start_date) {
    return (broilerBatch as any).start_date as string;
  }
  return null;
}
