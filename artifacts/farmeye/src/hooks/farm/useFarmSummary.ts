import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { getFinanceMode, matchesActiveFinanceScope } from '@/lib/financeScope';
import { useEggProduction } from './useEggProductionData';
import { useFeedConsumption } from './useFeedData';
import { useMortalityRecords } from './useMortalityData';
import { useExpenses, useIncome } from './useFinanceData';
import { useFlockInfo } from './useFlockData';

/** Aggregated 30-day farm KPIs, scoped to the active batch/finance mode. */
export function useFarmSummary() {
  const { data: eggs } = useEggProduction(30);
  const { data: expenses } = useExpenses(30);
  const { data: income } = useIncome(30);
  const { data: mortality } = useMortalityRecords(30);
  const { data: flockInfo } = useFlockInfo();
  const { data: feedConsumption } = useFeedConsumption(30);

  const { isLayer, isBroiler } = useFarmType();
  const { data: activeLayerBatch } = useActiveLayerBatch();
  const { data: activeBroilerBatch } = useActiveBroilerBatch();
  const activeBatchId: string | null = isLayer
    ? activeLayerBatch?.id ?? null
    : isBroiler
      ? (activeBroilerBatch as any)?.id ?? null
      : null;
  const financeScope = { mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart: null };

  const filteredExpenses = (expenses ?? []).filter((e: any) =>
    matchesActiveFinanceScope(e, 'expense', financeScope),
  );
  const filteredIncome = (income ?? []).filter((i: any) =>
    matchesActiveFinanceScope(i, 'income', financeScope),
  );

  const totalEggs = isLayer ? (eggs?.reduce((sum, e) => sum + e.total_eggs, 0) ?? 0) : 0;
  const totalExpenses = filteredExpenses.reduce((sum, e: any) => sum + Number(e.amount), 0);
  const totalIncome = filteredIncome.reduce((sum, i: any) => sum + Number(i.amount), 0);
  const totalMortality = mortality?.reduce((sum, m) => sum + m.count, 0) ?? 0;
  const totalFeedUsed = feedConsumption?.reduce((sum, f) => sum + Number(f.quantity_kg), 0) ?? 0;

  const productionRate = flockInfo?.total_birds
    ? ((totalEggs / 30) / flockInfo.total_birds * 100).toFixed(1)
    : '0';

  return {
    totalEggs,
    totalExpenses,
    totalIncome,
    profit: totalIncome - totalExpenses,
    totalMortality,
    totalFeedUsed,
    productionRate,
    flockInfo,
  };
}
