import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import {
  calculateBroilerAnalytics,
  type BroilerCostAnalytics,
} from '@/lib/broilerCostAnalytics';

// Pure maths live in src/lib/broilerCostAnalytics.ts (SSOT).
export type { BroilerCostAnalytics };

/**
 * Broiler batch cost analytics — data fetching only; all FCR / cost / profit
 * calculations are delegated to `@/lib/broilerCostAnalytics`.
 */
export function useBroilerCostAnalytics() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ['broiler-batch-analytics', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return null;
      // Active batch — scoped to user + selected farm
      let batchQ = supabase
        .from('broiler_batches')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      if (selectedFarmId) batchQ = batchQ.eq('farm_id', selectedFarmId);
      const { data: batch, error: batchError } = await batchQ.single();

      if (batchError && batchError.code !== 'PGRST116') throw batchError;
      if (!batch) return null;

      const startDate = new Date(batch.start_date);
      const today = new Date();
      const ageDays =
        Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Related data in parallel (batch_id is itself farm-scoped)
      const [feedResult, mortalityResult, weightsResult, salesResult] = await Promise.all([
        supabase
          .from('broiler_feed')
          .select('*')
          .eq('batch_id', batch.id)
          .order('feed_date', { ascending: true }),
        supabase
          .from('broiler_mortality')
          .select('*')
          .eq('batch_id', batch.id)
          .order('record_date', { ascending: true }),
        supabase
          .from('broiler_weights')
          .select('*')
          .eq('batch_id', batch.id)
          .order('record_date', { ascending: false }),
        supabase.from('broiler_sales').select('*').eq('batch_id', batch.id),
      ]);

      return {
        batch: { ...batch, ageDays },
        feed: feedResult.data || [],
        mortality: mortalityResult.data || [],
        weights: weightsResult.data || [],
        sales: salesResult.data || [],
      };
    },
    enabled: !!user,
  });

  // Expenses for electricity/water/other — scoped by user + farm
  const { data: expenses } = useQuery({
    queryKey: ['broiler-expenses', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let q = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', thirtyDaysAgo.toISOString().split('T')[0]);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q;

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const analytics = calculateBroilerAnalytics(batchData, expenses ?? undefined);

  return {
    analytics,
    isLoading: batchLoading,
    hasActiveBatch: !!batchData?.batch,
  };
}
