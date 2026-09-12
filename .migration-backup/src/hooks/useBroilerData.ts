/**
 * React-query bindings for the broiler domain.
 *
 * All Supabase access and business rules live in `@/api/broiler`; this file only
 * wires auth/farm context, cache invalidation and user-facing toasts.
 * Public exports are unchanged so existing call sites keep working.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import * as broilerApi from '@/api/broiler';

export type { BroilerBatch, BroilerWeight, BroilerFeed } from '@/api/broiler';
import type { BroilerBatch, BroilerWeight, BroilerFeed } from '@/api/broiler';

/** Batch caches that depend on the SSOT flock_info trigger. */
const BATCH_CACHE_KEYS = [
  ['broiler-batches'],
  ['broiler-batch-active'],
  ['flock-info'],
  ['bird-age'],
];

// Fetch active batch
export function useActiveBatch() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['broiler-batch-active', user?.id, selectedFarmId],
    queryFn: () => (user ? broilerApi.getActiveBatch(user.id, selectedFarmId) : null),
    enabled: !!user,
  });
}

// Fetch all batches
export function useBroilerBatches() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['broiler-batches', user?.id],
    queryFn: () => (user ? broilerApi.listBatches(user.id) : []),
    enabled: !!user,
  });
}

/** Resolve the farm a write must be scoped to; never fall back to "any farm". */
function useWriteScope() {
  const { user } = useAuth();
  const { selectedFarmId, farms } = useFarmContext();

  return () => {
    if (!user) throw new Error('Not authenticated');
    const farmId = selectedFarmId || farms[0]?.id;
    if (!farmId) throw new Error('No farm available. Please create a farm first.');
    return { userId: user.id, farmId };
  };
}

// Create new batch
export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();
  const resolveScope = useWriteScope();

  return useMutation({
    mutationFn: async (batch: Partial<BroilerBatch>) => {
      const { userId, farmId } = resolveScope();
      return broilerApi.createBatch(userId, farmId, batch);
    },
    onSuccess: () => {
      BATCH_CACHE_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'নতুন ব্যাচ তৈরি হয়েছে' : 'New batch created',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update batch
export function useUpdateBatch() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<BroilerBatch> & { id: string }) =>
      broilerApi.updateBatch(id, updates),
    onSuccess: () => {
      BATCH_CACHE_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'ব্যাচ আপডেট হয়েছে' : 'Batch updated',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete batch (child rows are cleaned up inside the API layer — no FK cascade)
export function useDeleteBatch() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => broilerApi.deleteBatch(id),
    onSuccess: () => {
      BATCH_CACHE_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      toast({
        title: language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted',
        description: language === 'bn' ? 'ব্যাচ মুছে ফেলা হয়েছে' : 'Batch deleted',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Fetch weights for a batch
export function useBatchWeights(batchId: string | undefined) {
  return useQuery({
    queryKey: ['broiler-weights', batchId],
    queryFn: () => (batchId ? broilerApi.listWeights(batchId) : []),
    enabled: !!batchId,
  });
}

// Add weight record (offline-safe)
export function useAddWeight() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();
  const resolveScope = useWriteScope();

  return useMutation({
    mutationFn: async (weight: Partial<BroilerWeight>) => {
      const { userId, farmId } = resolveScope();
      return broilerApi.addWeight(userId, farmId, weight);
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['broiler-weights', variables.batch_id] });
      toast({
        title: (res as any)?.queued
          ? (language === 'bn' ? '📴 অফলাইনে সংরক্ষিত' : '📴 Saved offline')
          : (language === 'bn' ? 'সফল!' : 'Success!'),
        description: (res as any)?.queued
          ? (language === 'bn' ? 'নেট এলে সিঙ্ক হবে' : 'Will sync when online')
          : (language === 'bn' ? 'ওজন রেকর্ড যোগ হয়েছে' : 'Weight record added'),
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Fetch feed for a batch
export function useBatchFeed(batchId: string | undefined) {
  return useQuery({
    queryKey: ['broiler-feed', batchId],
    queryFn: () => (batchId ? broilerApi.listFeed(batchId) : []),
    enabled: !!batchId,
  });
}

// Add feed record (offline-safe)
export function useAddFeed() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();
  const resolveScope = useWriteScope();

  return useMutation({
    mutationFn: async (feed: Partial<BroilerFeed>) => {
      const { userId, farmId } = resolveScope();
      return broilerApi.addFeed(userId, farmId, feed);
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['broiler-feed', variables.batch_id] });
      toast({
        title: (res as any)?.queued
          ? (language === 'bn' ? '📴 অফলাইনে সংরক্ষিত' : '📴 Saved offline')
          : (language === 'bn' ? 'সফল!' : 'Success!'),
        description: (res as any)?.queued
          ? (language === 'bn' ? 'নেট এলে সিঙ্ক হবে' : 'Will sync when online')
          : (language === 'bn' ? 'খাদ্য রেকর্ড যোগ হয়েছে' : 'Feed record added'),
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Batch statistics — math lives in the pure `computeBatchStats` helper
export function useBatchStats(batchId: string | undefined) {
  const { data: batch } = useActiveBatch();
  const { data: weights } = useBatchWeights(batchId);
  const { data: feed } = useBatchFeed(batchId);

  if (!batchId) return broilerApi.EMPTY_BATCH_STATS;
  return broilerApi.computeBatchStats(batch, weights, feed);
}

// Update / Delete weight
export function useUpdateWeight() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, batch_id, ...patch }: { id: string; batch_id?: string } & Partial<BroilerWeight>) => {
      await broilerApi.updateWeight(id, patch);
      return { batch_id };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['broiler-weights', res?.batch_id] });
      toast({ title: language === 'bn' ? 'আপডেট সফল' : 'Updated' });
    },
    onError: (e: any) => toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: e?.message, variant: 'destructive' }),
  });
}

export function useDeleteWeight() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, batch_id }: { id: string; batch_id?: string }) => {
      await broilerApi.deleteWeight(id);
      return { batch_id };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['broiler-weights', res?.batch_id] });
      toast({ title: language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted' });
    },
    onError: (e: any) => toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: e?.message, variant: 'destructive' }),
  });
}

// Update / Delete feed
export function useUpdateFeed() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, batch_id, ...patch }: { id: string; batch_id?: string } & Partial<BroilerFeed>) => {
      await broilerApi.updateFeed(id, patch);
      return { batch_id };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['broiler-feed', res?.batch_id] });
      toast({ title: language === 'bn' ? 'আপডেট সফল' : 'Updated' });
    },
    onError: (e: any) => toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: e?.message, variant: 'destructive' }),
  });
}

export function useDeleteFeed() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, batch_id }: { id: string; batch_id?: string }) => {
      await broilerApi.deleteFeed(id);
      return { batch_id };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['broiler-feed', res?.batch_id] });
      toast({ title: language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted' });
    },
    onError: (e: any) => toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: e?.message, variant: 'destructive' }),
  });
}
