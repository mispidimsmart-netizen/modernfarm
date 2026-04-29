import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';

export type MedicineType = 'medicine' | 'vaccine' | 'vitamin' | 'supplement' | 'other';
export type MedicineUnit = 'ml' | 'gm' | 'piece' | 'dose' | 'bottle' | 'gallon';

export interface MedicineInventory {
  id: string;
  user_id: string;
  farm_id: string | null;
  purchase_date: string;
  medicine_name: string;
  medicine_type: MedicineType;
  quantity: number;
  unit: MedicineUnit;
  unit_price: number;
  total_cost: number;
  supplier: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicineUsage {
  id: string;
  user_id: string;
  farm_id: string | null;
  shed_id: string | null;
  batch_id: string | null;
  inventory_id: string | null;
  usage_date: string;
  medicine_name: string;
  medicine_type: MedicineType;
  quantity_used: number;
  unit: MedicineUnit;
  reason: string | null;
  birds_treated: number | null;
  notes: string | null;
  created_at: string;
}

// ============ INVENTORY ============
export function useMedicineInventory(days: number = 90) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['medicine-inventory', user?.id, selectedFarmId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let q = supabase
        .from('medicine_inventory' as any)
        .select('*')
        .gte('purchase_date', startDate.toISOString().split('T')[0])
        .order('purchase_date', { ascending: false });

      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MedicineInventory[];
    },
    enabled: !!user,
  });
}

export function useAddMedicineInventory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      data: Omit<MedicineInventory, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'total_cost'> & {
        total_cost?: number;
      }
    ) => {
      if (!selectedFarmId) throw new Error('কোন ফার্ম নির্বাচন করা হয়নি');
      const total_cost =
        data.total_cost ?? Number(data.quantity || 0) * Number(data.unit_price || 0);

      const { error } = await supabase
        .from('medicine_inventory' as any)
        .insert({
          ...data,
          total_cost,
          user_id: user!.id,
          farm_id: selectedFarmId,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicine-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      toast({ title: 'ওষুধ স্টক যোগ হয়েছে (খরচে সংযুক্ত)' });
    },
    onError: (e: any) =>
      toast({ title: 'ত্রুটি হয়েছে', description: e?.message, variant: 'destructive' }),
  });
}

export function useDeleteMedicineInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('medicine_inventory' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicine-inventory'] });
      toast({ title: 'মুছে ফেলা হয়েছে' });
    },
  });
}

// ============ USAGE ============
export function useMedicineUsage(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['medicine-usage', user?.id, selectedFarmId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let q = supabase
        .from('medicine_usage' as any)
        .select('*')
        .gte('usage_date', startDate.toISOString().split('T')[0])
        .order('usage_date', { ascending: false });

      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MedicineUsage[];
    },
    enabled: !!user,
  });
}

export function useAddMedicineUsage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      data: Omit<MedicineUsage, 'id' | 'user_id' | 'created_at'>
    ) => {
      if (!selectedFarmId) throw new Error('কোন ফার্ম নির্বাচন করা হয়নি');
      const { error } = await supabase.from('medicine_usage' as any).insert({
        ...data,
        user_id: user!.id,
        farm_id: selectedFarmId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicine-usage'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      toast({ title: 'ওষুধ প্রয়োগ রেকর্ড হয়েছে' });
    },
    onError: (e: any) =>
      toast({ title: 'ত্রুটি হয়েছে', description: e?.message, variant: 'destructive' }),
  });
}

// Computed: remaining stock per medicine (purchase total - usage total)
export function useMedicineStockSummary() {
  const inv = useMedicineInventory(365);
  const usage = useMedicineUsage(365);

  const purchases = inv.data ?? [];
  const usages = usage.data ?? [];

  const map = new Map<
    string,
    { name: string; type: MedicineType; unit: MedicineUnit; purchased: number; used: number }
  >();

  for (const p of purchases) {
    const key = `${p.medicine_name}|${p.unit}`;
    const cur = map.get(key) ?? {
      name: p.medicine_name,
      type: p.medicine_type,
      unit: p.unit,
      purchased: 0,
      used: 0,
    };
    cur.purchased += Number(p.quantity || 0);
    map.set(key, cur);
  }
  for (const u of usages) {
    const key = `${u.medicine_name}|${u.unit}`;
    const cur = map.get(key) ?? {
      name: u.medicine_name,
      type: u.medicine_type,
      unit: u.unit,
      purchased: 0,
      used: 0,
    };
    cur.used += Number(u.quantity_used || 0);
    map.set(key, cur);
  }

  const items = Array.from(map.values())
    .map((it) => ({ ...it, remaining: Math.max(0, it.purchased - it.used) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { items, isLoading: inv.isLoading || usage.isLoading };
}
