import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

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
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['today-summary', user?.id, today],
    queryFn: async (): Promise<TodaySummary> => {
      // Fetch today's data in parallel
      const [eggsRes, incomeRes, expensesRes, mortalityRes] = await Promise.all([
        supabase
          .from('egg_production')
          .select('total_eggs, grade_a, grade_b, grade_c, broken')
          .eq('production_date', today)
          .maybeSingle(),
        supabase
          .from('income')
          .select('amount')
          .eq('income_date', today),
        supabase
          .from('expenses')
          .select('amount')
          .eq('expense_date', today),
        supabase
          .from('mortality_records')
          .select('count')
          .eq('record_date', today),
      ]);
      
      const eggs = eggsRes.data;
      const incomeData = incomeRes.data || [];
      const expensesData = expensesRes.data || [];
      const mortalityData = mortalityRes.data || [];
      
      const todayIncome = incomeData.reduce((sum, i) => sum + Number(i.amount), 0);
      const todayExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount), 0);
      const todayMortality = mortalityData.reduce((sum, m) => sum + m.count, 0);
      
      return {
        todayEggs: eggs?.total_eggs ?? 0,
        todayGradeA: eggs?.grade_a ?? 0,
        todayGradeB: eggs?.grade_b ?? 0,
        todayGradeC: eggs?.grade_c ?? 0,
        todayBroken: eggs?.broken ?? 0,
        todayIncome,
        todayExpenses,
        todayProfit: todayIncome - todayExpenses,
        todayMortality,
      };
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });
}
