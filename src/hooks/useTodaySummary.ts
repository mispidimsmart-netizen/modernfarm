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
  todayIncome: number;
  todayExpenses: number;
  todayProfit: number;
  todayMortality: number;
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
  const financeScope = { mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart: null };
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
        let q = supabase
          .from('egg_production')
          .select('total_eggs, grade_a, grade_b, grade_c, broken')
          .eq('production_date', today);
        if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
        return q.maybeSingle();
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
          .select('count, shed_id, farm_id, farm_mode, sheds:shed_id(farm_id, farm_type)')
          .eq('record_date', today);
      };

      const [eggsRes, incomeRes, expensesRes, mortalityRes] = await Promise.all([
        buildEggs(),
        buildIncome(),
        buildExpenses(),
        buildMortality(),
      ]);

      const eggs = eggsRes.data;
      const incomeRows = (incomeRes.data ?? []) as any[];
      const expenseRows = (expensesRes.data ?? []) as any[];
      const mortalityData = mortalityRes.data ?? [];

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

      return {
        todayEggs: showEggs ? eggs?.total_eggs ?? 0 : 0,
        todayGradeA: showEggs ? eggs?.grade_a ?? 0 : 0,
        todayGradeB: showEggs ? eggs?.grade_b ?? 0 : 0,
        todayGradeC: showEggs ? eggs?.grade_c ?? 0 : 0,
        todayBroken: showEggs ? eggs?.broken ?? 0 : 0,
        todayIncome,
        todayExpenses,
        todayProfit: todayIncome - todayExpenses,
        todayMortality,
      };
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}
