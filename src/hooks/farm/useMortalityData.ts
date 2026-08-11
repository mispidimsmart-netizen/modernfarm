import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { useSelectedShed, useSheds } from '@/hooks/useSheds';
import * as mortalityApi from '@/api/mortality';
import type { MortalityRecord } from '@/api/types';
import { errorToast, offlineTitle } from './farmMutationFeedback';

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
