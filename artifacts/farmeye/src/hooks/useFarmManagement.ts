/**
 * Farm management react-query hooks — public entry point.
 *
 * The implementations live in domain-scoped modules under `src/hooks/farm/`.
 * These hooks own *only* caching, scoping and user feedback. All Supabase
 * access lives in the data-access layer under `src/api/` — keep it that way so
 * business rules (feed costing, age validation, batch scoping) have exactly
 * one implementation.
 */
export type {
  EggProduction,
  FeedInventory,
  FeedConsumption,
  MortalityRecord,
  Expense,
  Income,
  FlockInfo,
} from '@/api/types';

export {
  useEggProduction,
  useAddEggProduction,
  useUpdateEggProduction,
  useDeleteEggProduction,
} from '@/hooks/farm/useEggProductionData';

export {
  useFeedInventory,
  useAddFeedInventory,
  useUpdateFeedInventory,
  useDeleteFeedInventory,
  useFeedConsumption,
  useAddFeedConsumption,
  useUpdateFeedConsumption,
  useDeleteFeedConsumption,
} from '@/hooks/farm/useFeedData';

export {
  useMortalityRecords,
  useAddMortalityRecord,
  useUpdateMortalityRecord,
  useDeleteMortalityRecord,
} from '@/hooks/farm/useMortalityData';

export {
  useExpenses,
  useAddExpense,
  useUpdateExpense,
  useDeleteExpense,
  useIncome,
  useAddIncome,
  useUpdateIncome,
  useDeleteIncome,
} from '@/hooks/farm/useFinanceData';

export { useFlockInfo, useUpdateFlockInfo } from '@/hooks/farm/useFlockData';

export { useFarmSummary } from '@/hooks/farm/useFarmSummary';
