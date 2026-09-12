import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { useFarmType } from '@/hooks/useFarmType';
import { useSheds } from '@/hooks/useSheds';
import * as eggApi from '@/api/eggProduction';
import type { EggProduction } from '@/api/types';
import { errorToast, offlineTitle } from './farmMutationFeedback';

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
