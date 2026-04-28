import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';

// Types
export interface EggProduction {
  id: string;
  user_id: string;
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
  created_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  income_date: string;
  category: string;
  amount: number;
  quantity: number | null;
  unit_price: number | null;
  description: string | null;
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
  
  return useQuery({
    queryKey: ['egg-production', user?.id, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('egg_production')
        .select('*')
        .gte('production_date', startDate.toISOString().split('T')[0])
        .order('production_date', { ascending: false });
      
      if (error) throw error;
      return data as EggProduction[];
    },
    enabled: !!user,
  });
}

export function useAddEggProduction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<EggProduction, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('egg_production')
        .upsert({
          ...data,
          user_id: user!.id,
        }, { onConflict: 'user_id,production_date' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['egg-production'] });
      toast({ title: 'ডিম উৎপাদন সংরক্ষণ হয়েছে' });
    },
    onError: () => {
      toast({ title: 'ত্রুটি হয়েছে', variant: 'destructive' });
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

export function useAddFeedInventory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<FeedInventory, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('feed_inventory')
        .insert({
          ...data,
          user_id: user!.id,
        });
      
      if (error) throw error;
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

// Feed Consumption Hooks
export function useFeedConsumption(days: number = 30) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['feed-consumption', user?.id, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('feed_consumption')
        .select('*')
        .gte('consumption_date', startDate.toISOString().split('T')[0])
        .order('consumption_date', { ascending: false });
      
      if (error) throw error;
      return data as FeedConsumption[];
    },
    enabled: !!user,
  });
}

export function useAddFeedConsumption() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<FeedConsumption, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('feed_consumption')
        .insert({
          ...data,
          user_id: user!.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-consumption'] });
      toast({ title: 'খাদ্য খরচ রেকর্ড হয়েছে' });
    },
    onError: () => {
      toast({ title: 'ত্রুটি হয়েছে', variant: 'destructive' });
    },
  });
}

// Mortality Hooks
export function useMortalityRecords(days: number = 30) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['mortality-records', user?.id, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('mortality_records')
        .select('*')
        .gte('record_date', startDate.toISOString().split('T')[0])
        .order('record_date', { ascending: false });
      
      if (error) throw error;
      return data as MortalityRecord[];
    },
    enabled: !!user,
  });
}

export function useAddMortalityRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<MortalityRecord, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('mortality_records')
        .insert({
          ...data,
          user_id: user!.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortality-records'] });
      toast({ title: 'মৃত্যু রেকর্ড সংরক্ষণ হয়েছে' });
    },
    onError: () => {
      toast({ title: 'ত্রুটি হয়েছে', variant: 'destructive' });
    },
  });
}

// Expense Hooks
export function useExpenses(days: number = 30) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['expenses', user?.id, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });
      
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('expenses')
        .insert({
          ...data,
          user_id: user!.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'খরচ রেকর্ড হয়েছে' });
    },
    onError: () => {
      toast({ title: 'ত্রুটি হয়েছে', variant: 'destructive' });
    },
  });
}

// Income Hooks
export function useIncome(days: number = 30) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['income', user?.id, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .gte('income_date', startDate.toISOString().split('T')[0])
        .order('income_date', { ascending: false });
      
      if (error) throw error;
      return data as Income[];
    },
    enabled: !!user,
  });
}

export function useAddIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<Income, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('income')
        .insert({
          ...data,
          user_id: user!.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] });
      toast({ title: 'আয় রেকর্ড হয়েছে' });
    },
    onError: () => {
      toast({ title: 'ত্রুটি হয়েছে', variant: 'destructive' });
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
      if (data.age_weeks !== undefined) {
        const newAgeDays = data.age_weeks * 7;
        
        // Range validation: 0–60 days = 0–8.5 weeks
        if (newAgeDays < 0 || newAgeDays > 60) {
          // Log rejection
          await (supabase.from('farm_audit_logs') as any).insert({
            user_id: user.id,
            action_type: 'age_override_event',
            action_category: 'safety',
            severity: 'warning',
            source: 'app',
            metadata: { 
              submitted_age_weeks: data.age_weeks,
              submitted_age_days: newAgeDays,
              rejection_reason: 'outside_biological_range_0_60_days',
            },
          });
          throw new Error(`Age ${data.age_weeks} weeks (${newAgeDays} days) is outside biological range (0-60 days)`);
        }

        // Jump validation: fetch current flock info
        const { data: currentFlock } = await supabase
          .from('flock_info')
          .select('age_weeks, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (currentFlock) {
          const currentAgeDays = (currentFlock.age_weeks || 0) * 7;
          const ageDeltaDays = Math.abs(newAgeDays - currentAgeDays);
          const lastUpdate = currentFlock.updated_at ? new Date(currentFlock.updated_at) : null;
          const hoursSinceUpdate = lastUpdate 
            ? (Date.now() - lastUpdate.getTime()) / (60 * 60 * 1000) 
            : Infinity;

          if (ageDeltaDays > 2 && hoursSinceUpdate < 24) {
            // Log rejection
            await (supabase.from('farm_audit_logs') as any).insert({
              user_id: user.id,
              action_type: 'age_override_event',
              action_category: 'safety',
              severity: 'warning',
              source: 'app',
              metadata: { 
                submitted_age_weeks: data.age_weeks,
                current_age_weeks: currentFlock.age_weeks,
                delta_days: ageDeltaDays,
                hours_since_last_update: Math.round(hoursSinceUpdate),
                rejection_reason: 'jump_exceeds_2_days_in_24h',
              },
            });
            throw new Error(`Age jump too large: ${ageDeltaDays} days change within ${Math.round(hoursSinceUpdate)} hours. Max 2 days per 24 hours.`);
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
export function useFarmSummary() {
  const { data: eggs } = useEggProduction(30);
  const { data: expenses } = useExpenses(30);
  const { data: income } = useIncome(30);
  const { data: mortality } = useMortalityRecords(30);
  const { data: flockInfo } = useFlockInfo();
  const { data: feedConsumption } = useFeedConsumption(30);

  const totalEggs = eggs?.reduce((sum, e) => sum + e.total_eggs, 0) ?? 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const totalIncome = income?.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0;
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
