/**
 * Farm management react-query hooks.
 *
 * These hooks own *only* caching, scoping and user feedback. All Supabase
 * access lives in the data-access layer under `src/api/` — keep it that way so
 * business rules (feed costing, age validation, batch scoping) have exactly
 * one implementation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { getFinanceMode, matchesActiveFinanceScope } from '@/lib/financeScope';
import { useSelectedShed, useSheds } from '@/hooks/useSheds';

import * as eggApi from '@/api/eggProduction';
import * as feedApi from '@/api/feed';
import * as mortalityApi from '@/api/mortality';
import * as financeApi from '@/api/finance';
import * as flockApi from '@/api/flock';

export type {
  EggProduction,
  FeedInventory,
  FeedConsumption,
  MortalityRecord,
  Expense,
  Income,
  FlockInfo,
} from '@/api/types';

import type {
  EggProduction,
  FeedInventory,
  FeedConsumption,
  MortalityRecord,
  Expense,
  Income,
  FlockInfo,
} from '@/api/types';

const errorToast = (toast: ReturnType<typeof useToast>['toast'], title: string) =>
  (e: any) => toast({ title, description: e?.message, variant: 'destructive' });

const offlineTitle = (res: any, okTitle: string) =>
  res?.queued ? '📴 অফলাইনে সংরক্ষিত — নেট এলে সিঙ্ক হবে' : okTitle;

// ───────────────────────── Egg production ─────────────────────────

export function useEggProduction(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { isLayer } = useFarmType();
  const { data: sheds } = useSheds();

  return useQuery({
    queryKey: ['egg-production', user?.id, selectedFarmId, isLayer ? 'layer' : 'not-layer', days],
    queryFn: async () => {
      const rows = await eggApi.listEggProduction(days, selectedFarmId);
      const layerShedIds = new Set((sheds ?? []).filter((s) => s.farm_type === 'layer').map((s) => s.id));
      return isLayer ? rows.filter((row) => !row.shed_id || layerShedIds.has(row.shed_id)) : [];
    },
    enabled: !!user && (!isLayer || !!sheds),
  });
}

export function useAddEggProduction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<EggProduction, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('লগইন করা নেই');
      if (!selectedFarmId) throw new Error('কোনো ফার্ম নির্বাচন করা নেই');
      return eggApi.upsertEggProduction(data as any, user.id, selectedFarmId);
    },
    onSuccess: async (res) => {
      await Promise.all(
        ['egg-production', 'today-summary', 'daily-summary', 'daily_reports', 'sensor-stats-today'].map((k) =>
          queryClient.invalidateQueries({ queryKey: [k], refetchType: 'active' }),
        ),
      );
      toast({ title: offlineTitle(res, 'ডিম উৎপাদন সংরক্ষণ হয়েছে') });
    },
    onError: (error: any) =>
      toast({ title: 'ত্রুটি হয়েছে', description: error?.message || 'অজানা ত্রুটি', variant: 'destructive' }),
  });
}

export function useUpdateEggProduction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<EggProduction>) =>
      eggApi.updateEggProduction(id, patch),
    onSuccess: () => {
      ['egg-production', 'today-summary'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      toast({ title: 'ডিম এন্ট্রি আপডেট হয়েছে' });
    },
    onError: errorToast(toast, 'আপডেট ব্যর্থ'),
  });
}

export function useDeleteEggProduction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => eggApi.deleteEggProduction(id),
    onSuccess: () => {
      ['egg-production', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'ডিম এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: errorToast(toast, 'ডিলিট ব্যর্থ'),
  });
}

// ───────────────────────── Feed inventory ─────────────────────────

export function useFeedInventory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['feed-inventory', user?.id],
    queryFn: () => feedApi.listFeedInventory(),
    enabled: !!user,
  });
}

export function useAddFeedInventory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    // Stock entry only — the expense is booked on consumption (see src/api/feed.ts).
    mutationFn: (data: Omit<FeedInventory, 'id' | 'user_id' | 'created_at'>) =>
      feedApi.insertFeedInventory(data as any, user!.id, selectedFarmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
      toast({ title: 'খাদ্য স্টক যোগ হয়েছে' });
    },
    onError: () => toast({ title: 'ত্রুটি হয়েছে', variant: 'destructive' }),
  });
}

export function useUpdateFeedInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<FeedInventory>) =>
      feedApi.updateFeedInventory(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
      toast({ title: 'স্টক আপডেট হয়েছে' });
    },
    onError: errorToast(toast, 'আপডেট ব্যর্থ'),
  });
}

export function useDeleteFeedInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => feedApi.deleteFeedInventory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
      toast({ title: 'স্টক মুছে ফেলা হয়েছে' });
    },
    onError: errorToast(toast, 'ডিলিট ব্যর্থ'),
  });
}

// ───────────────────────── Feed consumption ─────────────────────────

export function useFeedConsumption(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  return useQuery({
    queryKey: ['feed-consumption', user?.id, selectedFarmId, days],
    queryFn: () => feedApi.listFeedConsumption(days, selectedFarmId),
    enabled: !!user,
  });
}

export function useAddFeedConsumption() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeLayerBatch } = useActiveLayerBatch();
  const { data: activeBroilerBatch } = useActiveBroilerBatch();
  const { toast } = useToast();
  const activeBatchId = isLayer
    ? activeLayerBatch?.id ?? null
    : isBroiler
      ? (activeBroilerBatch as any)?.id ?? null
      : null;
  const farmMode = getFinanceMode(isLayer, isBroiler);

  return useMutation({
    mutationFn: async (data: Omit<FeedConsumption, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('লগইন করা নেই');
      if (!selectedFarmId) throw new Error('কোনো ফার্ম নির্বাচন করা নেই');
      return feedApi.insertFeedConsumption(data as any, {
        userId: user.id,
        farmId: selectedFarmId,
        activeBatchId,
        farmMode,
      });
    },
    onSuccess: async () => {
      await Promise.all(
        ['feed-consumption', 'expenses', 'today-summary', 'daily-summary', 'daily_reports'].map((k) =>
          queryClient.invalidateQueries({ queryKey: [k], refetchType: 'active' }),
        ),
      );
      toast({ title: 'খাদ্য খরচ রেকর্ড হয়েছে' });
    },
    onError: (error: any) =>
      toast({ title: 'ত্রুটি হয়েছে', description: error?.message || 'অজানা ত্রুটি', variant: 'destructive' }),
  });
}

export function useUpdateFeedConsumption() {
  const queryClient = useQueryClient();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<FeedConsumption>) =>
      feedApi.updateFeedConsumption(id, patch, selectedFarmId),
    onSuccess: () => {
      ['feed-consumption', 'expenses', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'ব্যবহার এন্ট্রি আপডেট হয়েছে' });
    },
    onError: errorToast(toast, 'আপডেট ব্যর্থ'),
  });
}

export function useDeleteFeedConsumption() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => feedApi.deleteFeedConsumption(id),
    onSuccess: () => {
      ['feed-consumption', 'expenses', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'ব্যবহার এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: errorToast(toast, 'ডিলিট ব্যর্থ'),
  });
}

// ───────────────────────── Mortality ─────────────────────────

export function useMortalityRecords(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { isLayer, isBroiler } = useFarmType();

  return useQuery({
    queryKey: [
      'mortality-records',
      user?.id,
      selectedFarmId,
      isLayer ? 'layer' : isBroiler ? 'broiler' : 'none',
      days,
    ],
    queryFn: async () => {
      const rows = await mortalityApi.listMortalityRecords(days);
      const activeMode = isLayer ? 'layer' : isBroiler ? 'broiler' : null;
      return rows.filter((record: any) => {
        // Prefer direct farm_id/farm_mode; fall back to the joined shed.
        const recordFarmId = record.farm_id ?? record.sheds?.farm_id ?? null;
        const recordMode = record.farm_mode ?? record.sheds?.farm_type ?? null;
        if (selectedFarmId) {
          if (recordFarmId && recordFarmId !== selectedFarmId) return false;
          if (!recordFarmId) return false; // legacy untagged rows hidden when a farm is selected
        }
        if (activeMode && recordMode && recordMode !== activeMode && recordMode !== 'both') return false;
        return true;
      }) as MortalityRecord[];
    },
    enabled: !!user,
  });
}

export function useAddMortalityRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedShedId } = useSelectedShed();
  const { selectedFarmId } = useFarmContext();
  const { isLayer, isBroiler } = useFarmType();
  const { data: sheds } = useSheds();
  const { data: layerBatch } = useActiveLayerBatch();
  const { data: broilerBatch } = useActiveBroilerBatch();

  return useMutation({
    mutationFn: async (data: Omit<MortalityRecord, 'id' | 'user_id' | 'created_at'>) => {
      if (!selectedFarmId) throw new Error('কোন ফার্ম নির্বাচন করা হয়নি');
      const farmMode: 'layer' | 'broiler' | null = isLayer ? 'layer' : isBroiler ? 'broiler' : null;

      // Infer a shed when none is selected: first shed in the farm matching the mode.
      let shedId = data.shed_id ?? selectedShedId ?? null;
      if (!shedId && sheds && sheds.length > 0) {
        const match = sheds.find(
          (s: any) =>
            s.farm_id === selectedFarmId &&
            (!farmMode || s.farm_type === farmMode || s.farm_type === 'both'),
        );
        shedId = match?.id ?? null;
      }

      const activeBatchId = isLayer
        ? (layerBatch as any)?.id ?? null
        : isBroiler
          ? (broilerBatch as any)?.id ?? null
          : null;

      return mortalityApi.insertMortalityRecord(data as any, {
        userId: user!.id,
        farmId: selectedFarmId,
        shedId,
        farmMode,
        activeBatchId,
      });
    },
    onSuccess: (res) => {
      ['mortality-records', 'today-summary'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      toast({ title: offlineTitle(res, 'মৃত্যু রেকর্ড সংরক্ষণ হয়েছে') });
    },
    onError: errorToast(toast, 'ত্রুটি হয়েছে'),
  });
}

export function useUpdateMortalityRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: { id: string; count?: number; cause?: string; record_date?: string; notes?: string | null }) =>
      mortalityApi.updateMortalityRecord(id, patch),
    onSuccess: () => {
      ['mortality-records', 'today-summary'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      toast({ title: 'মৃত্যু এন্ট্রি আপডেট হয়েছে' });
    },
    onError: errorToast(toast, 'আপডেট ব্যর্থ'),
  });
}

export function useDeleteMortalityRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => mortalityApi.deleteMortalityRecord(id),
    onSuccess: () => {
      ['mortality-records', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'মৃত্যু এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: errorToast(toast, 'ডিলিট ব্যর্থ'),
  });
}

// ───────────────────────── Expenses ─────────────────────────

export function useExpenses(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  return useQuery({
    queryKey: ['expenses', user?.id, selectedFarmId, days],
    queryFn: () => financeApi.listExpenses(days, selectedFarmId),
    enabled: !!user,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      data: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'farm_mode'> & {
        farm_mode?: 'layer' | 'broiler' | null;
      },
    ) => {
      if (!selectedFarmId) throw new Error('কোন ফার্ম নির্বাচন করা হয়নি');
      return financeApi.insertExpense(data as any, user!.id, selectedFarmId);
    },
    onSuccess: (res) => {
      ['expenses', 'daily-summary', 'today-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: offlineTitle(res, 'খরচ রেকর্ড হয়েছে') });
    },
    onError: errorToast(toast, 'ত্রুটি হয়েছে'),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: { id: string; amount?: number; description?: string | null; expense_date?: string; category?: string }) =>
      financeApi.updateExpense(id, patch),
    onSuccess: () => {
      ['expenses', 'today-summary'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      toast({ title: 'খরচ এন্ট্রি আপডেট হয়েছে' });
    },
    onError: errorToast(toast, 'আপডেট ব্যর্থ'),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteExpense(id),
    onSuccess: () => {
      ['expenses', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'খরচ এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: errorToast(toast, 'ডিলিট ব্যর্থ'),
  });
}

// ───────────────────────── Income ─────────────────────────

export function useIncome(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  return useQuery({
    queryKey: ['income', user?.id, selectedFarmId, days],
    queryFn: () => financeApi.listIncome(days, selectedFarmId),
    enabled: !!user,
  });
}

export function useAddIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      data: Omit<Income, 'id' | 'user_id' | 'created_at' | 'farm_mode' | 'source'> & {
        farm_mode?: 'layer' | 'broiler' | null;
        source?: string | null;
      },
    ) => {
      if (!selectedFarmId) throw new Error('কোন ফার্ম নির্বাচন করা হয়নি');
      return financeApi.insertIncome(data as any, user!.id, selectedFarmId);
    },
    onSuccess: (res) => {
      ['income', 'daily-summary', 'today-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: offlineTitle(res, 'আয় রেকর্ড হয়েছে') });
    },
    onError: errorToast(toast, 'ত্রুটি হয়েছে'),
  });
}

export function useUpdateIncome() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      amount?: number;
      description?: string | null;
      income_date?: string;
      category?: string;
      quantity?: number | null;
      unit_price?: number | null;
    }) => financeApi.updateIncome(id, patch),
    onSuccess: () => {
      ['income', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'আয় এন্ট্রি আপডেট হয়েছে' });
    },
    onError: errorToast(toast, 'আপডেট ব্যর্থ'),
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteIncome(id),
    onSuccess: () => {
      ['income', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'আয় এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: errorToast(toast, 'ডিলিট ব্যর্থ'),
  });
}

// ───────────────────────── Flock info ─────────────────────────

export function useFlockInfo() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  return useQuery({
    queryKey: ['flock-info', user?.id, selectedFarmId],
    queryFn: () => flockApi.getFlockInfo(selectedFarmId),
    enabled: !!user,
  });
}

export function useUpdateFlockInfo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<FlockInfo>) => {
      if (!user) throw new Error('Not authenticated');
      if (!selectedFarmId) throw new Error('কোনো ফার্ম নির্বাচন করা নেই');
      return flockApi.upsertFlockInfo(data, user.id, selectedFarmId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      toast({ title: 'ফ্লক তথ্য আপডেট হয়েছে' });
    },
    onError: (error: Error) => toast({ title: error.message || 'ত্রুটি হয়েছে', variant: 'destructive' }),
  });
}

// ───────────────────────── Summary ─────────────────────────

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
