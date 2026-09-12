import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import * as flockApi from '@/api/flock';
import type { FlockInfo } from '@/api/types';

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
