import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch } from '@/hooks/useBroilerData';

/**
 * Returns the start_date (YYYY-MM-DD) of the currently active batch
 * for the selected farm mode (layer or broiler).
 * Used to scope reports/finance/mortality to the current batch only,
 * so historical data from previous batches (e.g. old layer data after
 * switching to broiler) doesn't pollute the current report view.
 *
 * Returns null while loading or when no active batch exists.
 */
export function useActiveBatchStart(): string | null {
  const { isLayer, isBroiler } = useFarmType();
  const { data: layerBatch } = useActiveLayerBatch();
  const { data: broilerBatch } = useActiveBatch();

  if (isLayer && layerBatch?.start_date) return layerBatch.start_date;
  if (isBroiler && (broilerBatch as any)?.start_date) {
    return (broilerBatch as any).start_date as string;
  }
  return null;
}
