import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
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
  
  return useQuery({
    queryKey: ['flock-info', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flock_info')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as FlockInfo | null;
    },
    enabled: !!user,
  });
}

export function useUpdateFlockInfo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<FlockInfo>) => {
      const { error } = await supabase
        .from('flock_info')
        .upsert({
          ...data,
          user_id: user!.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flock-info'] });
      toast({ title: 'ফ্লক তথ্য আপডেট হয়েছে' });
    },
    onError: () => {
      toast({ title: 'ত্রুটি হয়েছে', variant: 'destructive' });
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
