import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { getFinanceMode, matchesActiveFinanceScope } from '@/lib/financeScope';
import { format } from 'date-fns';

export interface TodaySummary {
  todayEggs: number;
  todayGradeA: number;
  todayGradeB: number;
  todayGradeC: number;
  todayBroken: number;
  todayBroilerFeedKg: number;
  todayBroilerWeightGrams: number;
  todayIncome: number;
  todayExpenses: number;
  todayProfit: number;
  todayMortality: number;
  hasTodayEntry: boolean;
}

export function useTodaySummary() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeLayerBatch } = useActiveLayerBatch();
  const { data: activeBroilerBatch } = useActiveBroilerBatch();
  const activeBatchId: string | null = isLayer
    ? activeLayerBatch?.id ?? null
    : isBroiler
      ? (activeBroilerBatch as any)?.id ?? null
      : null;
  const activeBatchStart: string | null = isLayer
    ? activeLayerBatch?.start_date ?? null
    : isBroiler
      ? (activeBroilerBatch as any)?.start_date ?? null
      : null;
  const financeScope = { mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart: activeBatchStart };
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: [
      'today-summary',
      user?.id,
      selectedFarmId,
      isLayer ? 'layer' : isBroiler ? 'broiler' : 'none',
      activeBatchId,
      today,
    ],
    queryFn: async (): Promise<TodaySummary> => {
      // Build farm-scoped queries
      const buildEggs = () => {
        if (!isLayer) return Promise.resolve({ data: [], error: null } as any);
        let q = supabase
          .from('egg_production')
          .select('total_eggs, grade_a, grade_b, grade_c, broken')
          .eq('production_date', today);
        if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
        return q;
      };
      const buildIncome = () => {
        let q = supabase
          .from('income')
          .select('amount, category, batch_id, farm_mode')
          .eq('income_date', today);
        if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
        return q;
      };
      const buildExpenses = () => {
        let q = supabase
          .from('expenses')
          .select('amount, batch_id, farm_mode')
          .eq('expense_date', today);
        if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
        return q;
      };
      const buildMortality = () => {
        return supabase
          .from('mortality_records')
          .select('count, shed_id, farm_id, farm_mode, batch_id, sheds:shed_id(farm_id, farm_type)')
          .eq('record_date', today);
      };
      const buildBroilerFeed = () => {
        if (!isBroiler) return Promise.resolve({ data: [], error: null } as any);
        let q = supabase
          .from('broiler_feed')
          .select('quantity_kg, batch_id, farm_id')
          .eq('feed_date', today);
        if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
        if (activeBatchId) q = q.eq('batch_id', activeBatchId);
        return q;
      };
      const buildBroilerWeights = () => {
        if (!isBroiler) return Promise.resolve({ data: [], error: null } as any);
        let q = supabase
          .from('broiler_weights')
          .select('average_weight_grams, batch_id, farm_id')
          .eq('record_date', today)
          .order('created_at', { ascending: false });
        if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
        if (activeBatchId) q = q.eq('batch_id', activeBatchId);
        return q;
      };

      const [eggsRes, incomeRes, expensesRes, mortalityRes, broilerFeedRes, broilerWeightsRes] = await Promise.all([
        buildEggs(),
        buildIncome(),
        buildExpenses(),
        buildMortality(),
        buildBroilerFeed(),
        buildBroilerWeights(),
      ]);

      const eggRows = (eggsRes.data ?? []) as any[];
      const incomeRows = (incomeRes.data ?? []) as any[];
      const expenseRows = (expensesRes.data ?? []) as any[];
      const mortalityData = mortalityRes.data ?? [];
      const broilerFeedRows = (broilerFeedRes.data ?? []) as any[];
      const broilerWeightRows = (broilerWeightsRes.data ?? []) as any[];

      // Filter by active batch / mode-aware income category
      const filteredIncome = incomeRows.filter((i) => {
        return matchesActiveFinanceScope(i, 'income', financeScope);
      });
      const filteredExpenses = expenseRows.filter((e) => {
        return matchesActiveFinanceScope(e, 'expense', financeScope);
      });

      const todayIncome = filteredIncome.reduce((sum, i) => sum + Number(i.amount), 0);
      const todayExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Mortality: prefer direct farm_id/farm_mode; fallback to shed join
      const activeMode = isLayer ? 'layer' : isBroiler ? 'broiler' : null;
      const filteredMortality = mortalityData.filter((m: any) => {
        const recordFarmId = m.farm_id ?? m.sheds?.farm_id ?? null;
        const recordMode = m.farm_mode ?? m.sheds?.farm_type ?? null;
        if (activeBatchId && m.batch_id && m.batch_id !== activeBatchId) return false;
        if (activeMode === 'broiler' && !m.batch_id && !recordMode) return false;
        if (selectedFarmId) {
          if (recordFarmId && recordFarmId !== selectedFarmId) return false;
          if (!recordFarmId) return false;
        }
        if (activeMode && recordMode && recordMode !== activeMode && recordMode !== 'both') return false;
        return true;
      });
      const todayMortality = filteredMortality.reduce((sum: number, m: any) => sum + (m.count ?? 0), 0);

      // Eggs only make sense in layer mode
      const showEggs = isLayer;
      const todayEggTotals = eggRows.reduce(
        (acc, row) => ({
          total: acc.total + Number(row.total_eggs || 0),
          gradeA: acc.gradeA + Number(row.grade_a || 0),
          gradeB: acc.gradeB + Number(row.grade_b || 0),
          gradeC: acc.gradeC + Number(row.grade_c || 0),
          broken: acc.broken + Number(row.broken || 0),
        }),
        { total: 0, gradeA: 0, gradeB: 0, gradeC: 0, broken: 0 },
      );
      const todayBroilerFeedKg = broilerFeedRows.reduce((sum, row) => sum + Number(row.quantity_kg || 0), 0);
      const todayBroilerWeightGrams = Number(broilerWeightRows[0]?.average_weight_grams || 0);
      const hasTodayEntry = isLayer
        ? eggRows.length > 0 || filteredIncome.length > 0 || filteredExpenses.length > 0 || filteredMortality.length > 0
        : broilerFeedRows.length > 0 || broilerWeightRows.length > 0 || filteredIncome.length > 0 || filteredExpenses.length > 0 || filteredMortality.length > 0;

      return {
        todayEggs: showEggs ? todayEggTotals.total : 0,
        todayGradeA: showEggs ? todayEggTotals.gradeA : 0,
        todayGradeB: showEggs ? todayEggTotals.gradeB : 0,
        todayGradeC: showEggs ? todayEggTotals.gradeC : 0,
        todayBroken: showEggs ? todayEggTotals.broken : 0,
        todayBroilerFeedKg,
        todayBroilerWeightGrams,
        todayIncome,
        todayExpenses,
        todayProfit: todayIncome - todayExpenses,
        todayMortality,
        hasTodayEntry,
      };
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}
