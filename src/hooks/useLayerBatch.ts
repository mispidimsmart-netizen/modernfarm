/**
 * React-query bindings for the layer (egg-laying) batch domain.
 *
 * All Supabase access, summary math and validation live in `@/api/layer`;
 * this file only wires auth/farm context, cache invalidation, the offline
 * edit queue and user-facing toasts. Public exports are unchanged.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { enqueueBatchEdit } from '@/hooks/useBatchEditQueue';
import * as layerApi from '@/api/layer';

export type { LayerBatch, LayerBatchSummary, BatchTrendPoint } from '@/api/layer';
import type { LayerBatch } from '@/api/layer';

/** Re-exported for the offline edit queue, which recomputes with the same logic. */
export const computeBatchSummary = layerApi.computeBatchSummary;

// Active layer batch
export function useActiveLayerBatch() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['layer-batch-active', user?.id, selectedFarmId],
    queryFn: () => (user ? layerApi.getActiveLayerBatch(user.id, selectedFarmId) : null),
    enabled: !!user,
  });
}

// All layer batches (history)
export function useLayerBatches() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['layer-batches', user?.id, selectedFarmId],
    queryFn: () => (user ? layerApi.listLayerBatches(user.id, selectedFarmId) : []),
    enabled: !!user,
  });
}

// Create new layer batch
export function useCreateLayerBatch() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { selectedFarmId, farms } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batch: Partial<LayerBatch>) => {
      if (!user) throw new Error('Not authenticated');
      const farmId = selectedFarmId || farms[0]?.id;
      if (!farmId) throw new Error('No farm available.');
      return layerApi.createLayerBatch(user.id, farmId, batch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'নতুন ব্যাচ শুরু হয়েছে' : 'New batch started',
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

// Delete batch (summary row removed inside the API layer)
export function useDeleteLayerBatch() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (batchId: string) => layerApi.deleteLayerBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-summary'] });
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      toast({ title: language === 'bn' ? 'ব্যাচ মুছে ফেলা হয়েছে' : 'Batch deleted' });
    },
    onError: (error: any) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update batch
export function useUpdateLayerBatch() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<LayerBatch> & { id: string }) =>
      layerApi.updateLayerBatch(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
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

// Close batch + create summary snapshot
export function useCloseLayerBatch() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { selectedFarmId, farms } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      batchId,
      endDate,
      notes,
    }: {
      batchId: string;
      endDate?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const farmId = selectedFarmId || farms[0]?.id || null;
      return layerApi.closeLayerBatch(user.id, farmId, batchId, endDate, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-summary'] });
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      toast({
        title: language === 'bn' ? 'ব্যাচ সম্পন্ন' : 'Batch Closed',
        description: language === 'bn' ? 'সারাংশ সংরক্ষিত হয়েছে' : 'Summary saved',
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

// Summary for a batch
export function useLayerBatchSummary(batchId: string | undefined) {
  return useQuery({
    queryKey: ['layer-batch-summary', batchId],
    queryFn: () => (batchId ? layerApi.getLayerBatchSummary(batchId) : null),
    enabled: !!batchId,
  });
}

// Edit a completed batch (dates, bird counts, breed…) and recalc its summary
export function useEditCompletedLayerBatch() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: layerApi.BatchEditInput) => {
      if (!user) throw new Error('Not authenticated');

      // Same rules online and offline — validate before either path.
      const invalid = layerApi.validateBatchEdit(input, language === 'bn' ? 'bn' : 'en');
      if (invalid) throw new Error(invalid);

      // OFFLINE PATH: queue the edit; the queue auto-syncs on reconnect.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueBatchEdit(input.batchId, {
          start_date: input.start_date,
          actual_end_date: input.actual_end_date,
          initial_bird_count: input.initial_bird_count,
          current_bird_count: input.current_bird_count,
          chick_cost_per_bird: input.chick_cost_per_bird,
          notes: input.notes,
          batch_name_bn: input.batch_name_bn,
          breed: input.breed,
          age_at_start_weeks: input.age_at_start_weeks,
        });
        return { batchId: input.batchId, queued: true } as any;
      }

      return layerApi.editCompletedLayerBatch(user.id, input);
    },
    onSuccess: (result: any) => {
      // Batch & summary
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-active'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-summary'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-trend'] });
      // SSOT-synced caches (DB trigger updates flock_info → cascade refresh)
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      queryClient.invalidateQueries({ queryKey: ['farm-settings'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['lighting-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['lighting-curve'] });
      if (result?.queued) {
        toast({
          title: language === 'bn' ? 'অফলাইন — সারিতে যোগ হয়েছে' : 'Offline — queued',
          description:
            language === 'bn'
              ? 'ইন্টারনেট ফিরলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে'
              : 'Will auto-sync when connectivity returns',
        });
        return;
      }
      toast({
        title: language === 'bn' ? 'আপডেট সফল' : 'Updated',
        description:
          language === 'bn'
            ? 'ব্যাচের তথ্য ও সারাংশ পুনরায় হিসাব করা হয়েছে'
            : 'Batch info & summary recalculated',
      });
    },
    onError: (error: any) => {
      // Conflict has its own UI in the dialog — don't toast
      if (error?.code === 'BATCH_CONFLICT') return;
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Daily egg + mortality trend for a batch (used by mini chart)
export function useLayerBatchTrend(batch: LayerBatch | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['layer-batch-trend', batch?.id],
    queryFn: () => {
      if (!user || !batch) return [];
      const end = batch.actual_end_date || new Date().toISOString().split('T')[0];
      return layerApi.getBatchTrend(user.id, batch.start_date, end);
    },
    enabled: !!user && !!batch,
  });
}
