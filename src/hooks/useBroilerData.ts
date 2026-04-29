import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { calculateFCR, evaluateFCR, getBroilerTargetWeight } from './useFarmType';

export interface BroilerBatch {
  id: string;
  user_id: string;
  shed_id: string | null;
  batch_name: string;
  batch_name_bn: string | null;
  start_date: string;
  expected_end_date: string | null;
  actual_end_date: string | null;
  initial_bird_count: number;
  current_bird_count: number;
  chick_cost_per_bird: number;
  target_weight_grams: number;
  breed: string;
  status: 'active' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroilerWeight {
  id: string;
  user_id: string;
  batch_id: string;
  record_date: string;
  sample_count: number;
  average_weight_grams: number;
  min_weight_grams: number | null;
  max_weight_grams: number | null;
  uniformity_percent: number | null;
  notes: string | null;
  created_at: string;
}

export interface BroilerFeed {
  id: string;
  user_id: string;
  batch_id: string;
  feed_date: string;
  feed_type: 'pre-starter' | 'starter' | 'grower' | 'finisher';
  quantity_kg: number;
  cost_per_kg: number;
  notes: string | null;
  created_at: string;
}

// Fetch active batch
export function useActiveBatch() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['broiler-batch-active', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return null;
      let q = supabase
        .from('broiler_batches')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q.maybeSingle();

      if (error) throw error;
      return data as BroilerBatch | null;
    },
    enabled: !!user,
  });
}

// Fetch all batches
export function useBroilerBatches() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['broiler-batches', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('broiler_batches')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as BroilerBatch[];
    },
    enabled: !!user,
  });
}

// Create new batch
export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { selectedFarmId, farms } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batch: Partial<BroilerBatch>) => {
      if (!user) throw new Error('Not authenticated');
      const farmId = selectedFarmId || farms[0]?.id;
      if (!farmId) throw new Error('No farm available. Please create a farm first.');

      const { data, error } = await supabase
        .from('broiler_batches')
        .insert({
          user_id: user.id,
          farm_id: farmId,
          batch_name: batch.batch_name || 'Batch 1',
          batch_name_bn: batch.batch_name_bn || 'ব্যাচ ১',
          shed_id: batch.shed_id || null,
          start_date: batch.start_date || new Date().toISOString().split('T')[0],
          expected_end_date: batch.expected_end_date || null,
          initial_bird_count: batch.initial_bird_count || 0,
          current_bird_count: batch.initial_bird_count || 0,
          chick_cost_per_bird: batch.chick_cost_per_bird || 0,
          target_weight_grams: batch.target_weight_grams || 2200,
          breed: batch.breed || 'Cobb 500',
          notes: batch.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broiler-batches'] });
      queryClient.invalidateQueries({ queryKey: ['broiler-batch-active'] });
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
    mutationFn: async ({ id, ...updates }: Partial<BroilerBatch> & { id: string }) => {
      const { data, error } = await supabase
        .from('broiler_batches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broiler-batches'] });
      queryClient.invalidateQueries({ queryKey: ['broiler-batch-active'] });
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

// Delete batch (cascades to weights, feed, mortality, sales via FK or manual cleanup)
export function useDeleteBatch() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete child records first (no cascade in schema)
      await supabase.from('broiler_weights').delete().eq('batch_id', id);
      await supabase.from('broiler_feed').delete().eq('batch_id', id);
      await supabase.from('broiler_mortality').delete().eq('batch_id', id);
      await supabase.from('broiler_sales').delete().eq('batch_id', id);

      const { error } = await supabase
        .from('broiler_batches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broiler-batches'] });
      queryClient.invalidateQueries({ queryKey: ['broiler-batch-active'] });
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
    queryFn: async () => {
      if (!batchId) return [];
      const { data, error } = await supabase
        .from('broiler_weights')
        .select('*')
        .eq('batch_id', batchId)
        .order('record_date', { ascending: true });

      if (error) throw error;
      return data as BroilerWeight[];
    },
    enabled: !!batchId,
  });
}

// Add weight record
export function useAddWeight() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { selectedFarmId, farms } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (weight: Partial<BroilerWeight>) => {
      if (!user) throw new Error('Not authenticated');
      const farmId = selectedFarmId || farms[0]?.id;
      if (!farmId) throw new Error('No farm available.');

      const { data, error } = await supabase
        .from('broiler_weights')
        .insert({
          user_id: user.id,
          farm_id: farmId,
          batch_id: weight.batch_id!,
          record_date: weight.record_date || new Date().toISOString().split('T')[0],
          sample_count: weight.sample_count || 10,
          average_weight_grams: weight.average_weight_grams!,
          min_weight_grams: weight.min_weight_grams || null,
          max_weight_grams: weight.max_weight_grams || null,
          uniformity_percent: weight.uniformity_percent || null,
          notes: weight.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['broiler-weights', variables.batch_id] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'ওজন রেকর্ড যোগ হয়েছে' : 'Weight record added',
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
    queryFn: async () => {
      if (!batchId) return [];
      const { data, error } = await supabase
        .from('broiler_feed')
        .select('*')
        .eq('batch_id', batchId)
        .order('feed_date', { ascending: true });

      if (error) throw error;
      return data as BroilerFeed[];
    },
    enabled: !!batchId,
  });
}

// Add feed record
export function useAddFeed() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { selectedFarmId, farms } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (feed: Partial<BroilerFeed>) => {
      if (!user) throw new Error('Not authenticated');
      const farmId = selectedFarmId || farms[0]?.id;
      if (!farmId) throw new Error('No farm available.');

      const { data, error } = await supabase
        .from('broiler_feed')
        .insert({
          user_id: user.id,
          farm_id: farmId,
          batch_id: feed.batch_id!,
          feed_date: feed.feed_date || new Date().toISOString().split('T')[0],
          feed_type: feed.feed_type || 'starter',
          quantity_kg: feed.quantity_kg || 0,
          cost_per_kg: feed.cost_per_kg || 0,
          notes: feed.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['broiler-feed', variables.batch_id] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'খাদ্য রেকর্ড যোগ হয়েছে' : 'Feed record added',
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

// Calculate batch statistics
export function useBatchStats(batchId: string | undefined) {
  const { data: batch } = useActiveBatch();
  const { data: weights } = useBatchWeights(batchId);
  const { data: feed } = useBatchFeed(batchId);

  if (!batch || !batchId) {
    return {
      ageDays: 0,
      ageWeeks: 0,
      currentWeight: 0,
      targetWeight: 0,
      weightProgress: 0,
      totalFeedKg: 0,
      fcr: 0,
      fcrRating: 'average' as const,
      mortality: 0,
      mortalityPercent: 0,
    };
  }

  const startDate = new Date(batch.start_date);
  const today = new Date();
  const ageDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const ageWeeks = Math.floor(ageDays / 7);

  const latestWeight = weights && weights.length > 0 
    ? weights[weights.length - 1].average_weight_grams 
    : 0;
  
  const targetWeight = getBroilerTargetWeight(ageDays);
  const weightProgress = targetWeight > 0 ? (latestWeight / targetWeight) * 100 : 0;

  const totalFeedKg = feed?.reduce((sum, f) => sum + Number(f.quantity_kg), 0) || 0;

  // Calculate weight gain (current - initial chick weight ~42g)
  const initialWeightKg = (batch.initial_bird_count * 42) / 1000;
  const currentWeightKg = (batch.current_bird_count * latestWeight) / 1000;
  const weightGainKg = currentWeightKg - initialWeightKg;

  const fcr = calculateFCR(totalFeedKg, weightGainKg);
  const fcrRating = evaluateFCR(fcr, ageWeeks);

  const mortality = batch.initial_bird_count - batch.current_bird_count;
  const mortalityPercent = batch.initial_bird_count > 0 
    ? (mortality / batch.initial_bird_count) * 100 
    : 0;

  return {
    ageDays,
    ageWeeks,
    currentWeight: latestWeight,
    targetWeight,
    weightProgress: Math.min(weightProgress, 150), // Cap at 150%
    totalFeedKg,
    fcr,
    fcrRating,
    mortality,
    mortalityPercent,
  };
}
