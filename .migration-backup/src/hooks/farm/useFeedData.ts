import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { getFinanceMode } from '@/lib/financeScope';
import * as feedApi from '@/api/feed';
import type { FeedInventory, FeedConsumption } from '@/api/types';
import { errorToast } from './farmMutationFeedback';

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
