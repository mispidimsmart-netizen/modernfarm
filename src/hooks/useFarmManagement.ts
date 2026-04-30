import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { getFinanceMode, matchesActiveFinanceScope } from '@/lib/financeScope';
import { useSelectedShed, useSheds } from '@/hooks/useSheds';

// Types
export interface EggProduction {
  id: string;
  user_id: string;
  farm_id?: string | null;
  shed_id?: string | null;
  production_date: string;
  total_eggs: number;
  grade_a: number;
  grade_b: number;
  grade_c: number;
  broken: number;
  notes: string | null;
  created_at: string;
}

export interface FeedInventory {
  id: string;
  user_id: string;
  feed_type: string;
  quantity_kg: number;
  unit_price: number;
  purchase_date: string;
  supplier: string | null;
  notes: string | null;
  created_at: string;
}

export interface FeedConsumption {
  id: string;
  user_id: string;
  consumption_date: string;
  feed_type: string;
  quantity_kg: number;
  notes: string | null;
  created_at: string;
}

export interface MortalityRecord {
  id: string;
  user_id: string;
  shed_id?: string | null;
  farm_id?: string | null;
  farm_mode?: 'layer' | 'broiler' | null;
  batch_id?: string | null;
  record_date: string;
  count: number;
  cause: string;
  age_weeks: number | null;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string | null;
  batch_id: string | null;
  farm_mode: 'layer' | 'broiler' | null;
  created_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  income_date: string;
  category: string;
  source: string | null;
  amount: number;
  quantity: number | null;
  unit_price: number | null;
  description: string | null;
  batch_id: string | null;
  farm_mode: 'layer' | 'broiler' | null;
  created_at: string;
}

export interface FlockInfo {
  id: string;
  user_id: string;
  total_birds: number;
  age_weeks: number;
  breed: string | null;
  purchase_date: string | null;
  updated_at: string;
  created_at: string;
}

// Egg Production Hooks
export function useEggProduction(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { isLayer } = useFarmType();
  const { data: sheds } = useSheds();
  
  return useQuery({
    queryKey: ['egg-production', user?.id, selectedFarmId, isLayer ? 'layer' : 'not-layer', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      let q = supabase
        .from('egg_production')
        .select('*')
        .gte('production_date', startDate.toISOString().split('T')[0])
        .order('production_date', { ascending: false });
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);

      const { data, error } = await q;
      
      if (error) throw error;
      const layerShedIds = new Set((sheds ?? []).filter((s) => s.farm_type === 'layer').map((s) => s.id));
      const rows = (data ?? []) as EggProduction[];
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
      const { error } = await supabase
        .from('egg_production')
        .upsert(
          {
            ...data,
            user_id: user.id,
            farm_id: selectedFarmId,
          } as any,
          { onConflict: 'user_id,farm_id,production_date' }
        );

      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['egg-production'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['today-summary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['daily-summary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['daily_reports'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['sensor-stats-today'], refetchType: 'active' }),
      ]);
      toast({ title: 'ডিম উৎপাদন সংরক্ষণ হয়েছে' });
    },
    onError: (error: any) => {
      toast({
        title: 'ত্রুটি হয়েছে',
        description: error?.message || 'অজানা ত্রুটি',
        variant: 'destructive',
      });
    },
  });
}

// Feed Inventory Hooks
export function useFeedInventory() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['feed-inventory', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_inventory')
        .select('*')
        .order('purchase_date', { ascending: false });
      
      if (error) throw error;
      return data as FeedInventory[];
    },
    enabled: !!user,
  });
}

// Helper: weighted-average cost per kg for a given feed_type, from current stock
async function getWeightedAvgCostPerKg(feedType: string, farmId: string | null): Promise<number> {
  let q = supabase.from('feed_inventory').select('quantity_kg, unit_price').eq('feed_type', feedType);
  if (farmId) q = q.eq('farm_id', farmId);
  const { data, error } = await q;
  if (error || !data || data.length === 0) return 0;
  let totalQty = 0;
  let totalCost = 0;
  for (const row of data as any[]) {
    const qty = Number(row.quantity_kg || 0);
    const price = Number(row.unit_price || 0);
    totalQty += qty;
    totalCost += qty * price;
  }
  return totalQty > 0 ? totalCost / totalQty : 0;
}

export function useAddFeedInventory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<FeedInventory, 'id' | 'user_id' | 'created_at'>) => {
      // Stock entry only — does NOT create an expense row.
      // Daily expense is recorded via consumption × weighted-avg ৳/kg.
      const { data: inserted, error } = await supabase
        .from('feed_inventory')
        .insert({
          ...data,
          user_id: user!.id,
          ...(selectedFarmId ? { farm_id: selectedFarmId } : {}),
        } as any)
        .select()
        .single();

      if (error) throw error;
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
      toast({ title: 'খাদ্য স্টক যোগ হয়েছে' });
    },
    onError: () => {
      toast({ title: 'ত্রুটি হয়েছে', variant: 'destructive' });
    },
  });
}

export function useUpdateFeedInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<FeedInventory>) => {
      const { error } = await supabase.from('feed_inventory').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
      toast({ title: 'স্টক আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'আপডেট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}

export function useDeleteFeedInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feed_inventory').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
      toast({ title: 'স্টক মুছে ফেলা হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ডিলিট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}

// Feed Consumption Hooks
export function useFeedConsumption(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  
  return useQuery({
    queryKey: ['feed-consumption', user?.id, selectedFarmId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      let q = supabase
        .from('feed_consumption')
        .select('*')
        .gte('consumption_date', startDate.toISOString().split('T')[0])
        .order('consumption_date', { ascending: false });
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q;
      
      if (error) throw error;
      return data as FeedConsumption[];
    },
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
  const activeBatchId = isLayer ? activeLayerBatch?.id ?? null : isBroiler ? (activeBroilerBatch as any)?.id ?? null : null;
  const farmMode = getFinanceMode(isLayer, isBroiler);

  return useMutation({
    mutationFn: async (data: Omit<FeedConsumption, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('লগইন করা নেই');
      if (!selectedFarmId) throw new Error('কোনো ফার্ম নির্বাচন করা নেই');

      const { data: inserted, error } = await supabase
        .from('feed_consumption')
        .insert({
          ...data,
          batch_id: (data as any).batch_id ?? activeBatchId,
          user_id: user.id,
          farm_id: selectedFarmId,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Auto-create linked expense from weighted-avg ৳/kg of current stock
      const avgCost = await getWeightedAvgCostPerKg(data.feed_type, selectedFarmId);
      const totalCost = Number(data.quantity_kg || 0) * avgCost;
      if (totalCost > 0 && inserted?.id) {
        const description = `[Auto-Feed-Usage:${inserted.id}] ${data.feed_type} • ${data.quantity_kg}kg @ ৳${avgCost.toFixed(2)}/kg`;
        const { error: expErr } = await supabase.from('expenses').insert({
          user_id: user.id,
          farm_id: selectedFarmId,
          expense_date: data.consumption_date,
          category: 'feed',
          amount: Number(totalCost.toFixed(2)),
          description,
          batch_id: (data as any).batch_id ?? activeBatchId,
          farm_mode: farmMode,
        } as any);
        if (expErr) console.warn('Auto-expense for feed usage failed:', expErr.message);
      }
      return inserted;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed-consumption'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['expenses'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['today-summary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['daily-summary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['daily_reports'], refetchType: 'active' }),
      ]);
      toast({ title: 'খাদ্য খরচ রেকর্ড হয়েছে' });
    },
    onError: (error: any) => {
      toast({
        title: 'ত্রুটি হয়েছে',
        description: error?.message || 'অজানা ত্রুটি',
        variant: 'destructive',
      });
    },
  });
}

// Helper: delete the auto-expense row linked to a feed_consumption id
async function deleteLinkedFeedExpense(consumptionId: string) {
  await supabase
    .from('expenses')
    .delete()
    .like('description', `[Auto-Feed-Usage:${consumptionId}]%`);
}

export function useDeleteFeedConsumption() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteLinkedFeedExpense(id);
      const { error } = await supabase.from('feed_consumption').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      ['feed-consumption', 'expenses', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'ব্যবহার এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ডিলিট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}

export function useUpdateFeedConsumption() {
  const queryClient = useQueryClient();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<FeedConsumption>) => {
      const { error } = await supabase.from('feed_consumption').update(patch).eq('id', id);
      if (error) throw error;
      await deleteLinkedFeedExpense(id);
      const { data: row } = await supabase.from('feed_consumption').select('*').eq('id', id).maybeSingle();
      if (row) {
        const r: any = row;
        const avgCost = await getWeightedAvgCostPerKg(r.feed_type, selectedFarmId);
        const totalCost = Number(r.quantity_kg || 0) * avgCost;
        if (totalCost > 0) {
          await supabase.from('expenses').insert({
            user_id: r.user_id,
            farm_id: r.farm_id,
            expense_date: r.consumption_date,
            category: 'feed',
            amount: Number(totalCost.toFixed(2)),
            description: `[Auto-Feed-Usage:${id}] ${r.feed_type} • ${r.quantity_kg}kg @ ৳${avgCost.toFixed(2)}/kg`,
          } as any);
        }
      }
    },
    onSuccess: () => {
      ['feed-consumption', 'expenses', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'ব্যবহার এন্ট্রি আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'আপডেট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}

// Mortality Hooks
export function useMortalityRecords(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { isLayer, isBroiler } = useFarmType();
  
  return useQuery({
    queryKey: ['mortality-records', user?.id, selectedFarmId, isLayer ? 'layer' : isBroiler ? 'broiler' : 'none', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('mortality_records')
        .select('*, sheds:shed_id(farm_id, farm_type)')
        .gte('record_date', startDate.toISOString().split('T')[0])
        .order('record_date', { ascending: false });
      
      if (error) throw error;
      const activeMode = isLayer ? 'layer' : isBroiler ? 'broiler' : null;
      return (data ?? []).filter((record: any) => {
        // Prefer direct farm_id/farm_mode if present
        const recordFarmId = record.farm_id ?? record.sheds?.farm_id ?? null;
        const recordMode = record.farm_mode ?? record.sheds?.farm_type ?? null;
        if (selectedFarmId) {
          if (recordFarmId && recordFarmId !== selectedFarmId) return false;
          if (!recordFarmId) return false; // legacy untagged hidden when farm selected
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

      // Try to infer a shed if none selected: pick first shed in farm matching mode
      let shedId = data.shed_id ?? selectedShedId ?? null;
      if (!shedId && sheds && sheds.length > 0) {
        const match = sheds.find((s: any) =>
          s.farm_id === selectedFarmId &&
          (!farmMode || s.farm_type === farmMode || s.farm_type === 'both')
        );
        shedId = match?.id ?? null;
      }

      const activeBatchId = isLayer ? (layerBatch as any)?.id ?? null : isBroiler ? (broilerBatch as any)?.id ?? null : null;

      const { error } = await supabase
        .from('mortality_records')
        .insert({
          ...data,
          shed_id: shedId,
          farm_id: selectedFarmId,
          farm_mode: farmMode,
          batch_id: data.batch_id ?? activeBatchId,
          user_id: user!.id,
        } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortality-records'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      toast({ title: 'মৃত্যু রেকর্ড সংরক্ষণ হয়েছে' });
    },
    onError: (e: any) => {
      toast({ title: 'ত্রুটি হয়েছে', description: e?.message, variant: 'destructive' });
    },
  });
}

// Expense Hooks
export function useExpenses(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  
  return useQuery({
    queryKey: ['expenses', user?.id, selectedFarmId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      let q = supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });
      
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      
      const { data, error } = await q;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'farm_mode'> & { farm_mode?: 'layer' | 'broiler' | null }) => {
      if (!selectedFarmId) throw new Error('কোন ফার্ম নির্বাচন করা হয়নি');
      const { activeBatchId, farmMode } = await resolveActiveScope(selectedFarmId);
      const { error } = await supabase
        .from('expenses')
        .insert({
          ...data,
          batch_id: data.batch_id ?? activeBatchId,
          farm_mode: data.farm_mode ?? farmMode,
          user_id: user!.id,
          farm_id: selectedFarmId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      toast({ title: 'খরচ রেকর্ড হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি হয়েছে', description: error?.message, variant: 'destructive' });
    },
  });
}

// Income Hooks
export function useIncome(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  
  return useQuery({
    queryKey: ['income', user?.id, selectedFarmId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      let q = supabase
        .from('income')
        .select('*')
        .gte('income_date', startDate.toISOString().split('T')[0])
        .order('income_date', { ascending: false });
      
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      
      const { data, error } = await q;
      if (error) throw error;
      return data as Income[];
    },
    enabled: !!user,
  });
}

export function useAddIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<Income, 'id' | 'user_id' | 'created_at' | 'farm_mode' | 'source'> & { farm_mode?: 'layer' | 'broiler' | null; source?: string | null }) => {
      if (!selectedFarmId) throw new Error('কোন ফার্ম নির্বাচন করা হয়নি');
      const { activeBatchId, farmMode } = await resolveActiveScope(selectedFarmId);
      const source = data.source || data.category || 'other';
      const { error } = await supabase
        .from('income')
        .insert({
          ...data,
          source,
          batch_id: data.batch_id ?? activeBatchId,
          farm_mode: data.farm_mode ?? farmMode,
          user_id: user!.id,
          farm_id: selectedFarmId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      toast({ title: 'আয় রেকর্ড হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি হয়েছে', description: error?.message, variant: 'destructive' });
    },
  });
}

// Flock Info Hooks
export function useFlockInfo() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  
  return useQuery({
    queryKey: ['flock-info', user?.id, selectedFarmId],
    queryFn: async () => {
      let query = supabase.from('flock_info').select('*');
      if (selectedFarmId) query = query.eq('farm_id', selectedFarmId);
      const { data, error } = await query.maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as FlockInfo | null;
    },
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

      // Age plausibility validation (age_weeks → convert to days for validation)
      // NOTE: flock_info is used by LAYER farms. Layer biological cycle = 0–100 weeks (0–700 days).
      // Broiler (0–60 days) validation lives in broiler_batches flow, not here.
      if (data.age_weeks !== undefined) {
        const newAgeDays = data.age_weeks * 7;
        const LAYER_MAX_WEEKS = 100; // generous upper bound for layer lifespan
        
        // Range validation for layers: 0–100 weeks
        if (data.age_weeks < 0 || data.age_weeks > LAYER_MAX_WEEKS) {
          await (supabase.from('farm_audit_logs') as any).insert({
            user_id: user.id,
            action_type: 'age_override_event',
            action_category: 'safety',
            severity: 'warning',
            source: 'app',
            metadata: { 
              submitted_age_weeks: data.age_weeks,
              submitted_age_days: newAgeDays,
              rejection_reason: `outside_layer_range_0_${LAYER_MAX_WEEKS}_weeks`,
            },
          });
          throw new Error(`বয়স ${data.age_weeks} সপ্তাহ গ্রহণযোগ্য সীমার বাইরে (০–${LAYER_MAX_WEEKS} সপ্তাহ)`);
        }

        // Jump validation: fetch current flock info
        const { data: currentFlock } = await supabase
          .from('flock_info')
          .select('age_weeks, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (currentFlock) {
          const currentAgeWeeks = currentFlock.age_weeks || 0;
          const ageDeltaWeeks = Math.abs(data.age_weeks - currentAgeWeeks);
          const lastUpdate = currentFlock.updated_at ? new Date(currentFlock.updated_at) : null;
          const hoursSinceUpdate = lastUpdate 
            ? (Date.now() - lastUpdate.getTime()) / (60 * 60 * 1000) 
            : Infinity;

          // For layers: max ±4 weeks change within 24 hours (allows reasonable corrections)
          if (ageDeltaWeeks > 4 && hoursSinceUpdate < 24) {
            await (supabase.from('farm_audit_logs') as any).insert({
              user_id: user.id,
              action_type: 'age_override_event',
              action_category: 'safety',
              severity: 'warning',
              source: 'app',
              metadata: { 
                submitted_age_weeks: data.age_weeks,
                current_age_weeks: currentFlock.age_weeks,
                delta_weeks: ageDeltaWeeks,
                hours_since_last_update: Math.round(hoursSinceUpdate),
                rejection_reason: 'jump_exceeds_4_weeks_in_24h',
              },
            });
            throw new Error(`বয়স পরিবর্তন অনেক বেশি: ${ageDeltaWeeks} সপ্তাহ পরিবর্তন ${Math.round(hoursSinceUpdate)} ঘন্টায়। সর্বোচ্চ ৪ সপ্তাহ/২৪ ঘন্টা।`);
          }
        }

        // Log accepted age change
        await (supabase.from('farm_audit_logs') as any).insert({
          user_id: user.id,
          action_type: 'age_override_event',
          action_category: 'farm',
          severity: 'info',
          source: 'app',
          metadata: { 
            new_age_weeks: data.age_weeks,
            accepted: true,
          },
        });
      }

      const { error } = await supabase
        .from('flock_info')
        .upsert({
          ...data,
          user_id: user.id,
          farm_id: selectedFarmId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      toast({ title: 'ফ্লক তথ্য আপডেট হয়েছে' });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'ত্রুটি হয়েছে', variant: 'destructive' });
    },
  });
}

// Summary Stats Hook
const LAYER_ONLY_INCOME = new Set(['eggs', 'egg_sale', 'spent_hen']);
const BROILER_ONLY_INCOME = new Set(['culled_birds', 'bird_sale']);

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
    ? (activeLayerBatch?.id ?? null)
    : isBroiler
      ? ((activeBroilerBatch as any)?.id ?? null)
      : null;
  const financeScope = { mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart: null };

  const filteredExpenses = (expenses ?? []).filter((e: any) => {
    return matchesActiveFinanceScope(e, 'expense', financeScope);
  });
  const filteredIncome = (income ?? []).filter((i: any) => {
    return matchesActiveFinanceScope(i, 'income', financeScope);
  });

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

// ─── Delete & Update mutation hooks (used by RecentEntryHistory edit/delete UI) ───

export function useDeleteEggProduction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('egg_production').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      ['egg-production', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'ডিম এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ডিলিট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      ['expenses', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'খরচ এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ডিলিট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}

export function useDeleteMortalityRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mortality_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      ['mortality-records', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'মৃত্যু এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ডিলিট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}

// Update hooks (partial updates by id)
export function useUpdateEggProduction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<EggProduction>) => {
      const { error } = await supabase.from('egg_production').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['egg-production'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      toast({ title: 'ডিম এন্ট্রি আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'আপডেট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; amount?: number; description?: string | null; expense_date?: string; category?: string }) => {
      const { error } = await supabase.from('expenses').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      toast({ title: 'খরচ এন্ট্রি আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'আপডেট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}

export function useUpdateMortalityRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; count?: number; cause?: string; record_date?: string; notes?: string | null }) => {
      const { error } = await supabase.from('mortality_records').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortality-records'] });
      queryClient.invalidateQueries({ queryKey: ['today-summary'] });
      toast({ title: 'মৃত্যু এন্ট্রি আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'আপডেট ব্যর্থ', description: e?.message, variant: 'destructive' }),
  });
}
