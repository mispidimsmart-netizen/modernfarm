import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import * as financeApi from '@/api/finance';
import type { Expense, Income } from '@/api/types';
import { errorToast, offlineTitle } from './farmMutationFeedback';

// ───────────────────────── Expenses ─────────────────────────

export function useExpenses(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  return useQuery({
    queryKey: ['expenses', user?.id, selectedFarmId, days],
    queryFn: () => financeApi.listExpenses(days, selectedFarmId),
    enabled: !!user,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      data: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'farm_mode'> & {
        farm_mode?: 'layer' | 'broiler' | null;
      },
    ) => {
      if (!selectedFarmId) throw new Error('কোন ফার্ম নির্বাচন করা হয়নি');
      return financeApi.insertExpense(data as any, user!.id, selectedFarmId);
    },
    onSuccess: (res) => {
      ['expenses', 'daily-summary', 'today-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: offlineTitle(res, 'খরচ রেকর্ড হয়েছে') });
    },
    onError: errorToast(toast, 'ত্রুটি হয়েছে'),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: { id: string; amount?: number; description?: string | null; expense_date?: string; category?: string }) =>
      financeApi.updateExpense(id, patch),
    onSuccess: () => {
      ['expenses', 'today-summary'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      toast({ title: 'খরচ এন্ট্রি আপডেট হয়েছে' });
    },
    onError: errorToast(toast, 'আপডেট ব্যর্থ'),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteExpense(id),
    onSuccess: () => {
      ['expenses', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'খরচ এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: errorToast(toast, 'ডিলিট ব্যর্থ'),
  });
}

// ───────────────────────── Income ─────────────────────────

export function useIncome(days: number = 30) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  return useQuery({
    queryKey: ['income', user?.id, selectedFarmId, days],
    queryFn: () => financeApi.listIncome(days, selectedFarmId),
    enabled: !!user,
  });
}

export function useAddIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      data: Omit<Income, 'id' | 'user_id' | 'created_at' | 'farm_mode' | 'source'> & {
        farm_mode?: 'layer' | 'broiler' | null;
        source?: string | null;
      },
    ) => {
      if (!selectedFarmId) throw new Error('কোন ফার্ম নির্বাচন করা হয়নি');
      return financeApi.insertIncome(data as any, user!.id, selectedFarmId);
    },
    onSuccess: (res) => {
      ['income', 'daily-summary', 'today-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: offlineTitle(res, 'আয় রেকর্ড হয়েছে') });
    },
    onError: errorToast(toast, 'ত্রুটি হয়েছে'),
  });
}

export function useUpdateIncome() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      amount?: number;
      description?: string | null;
      income_date?: string;
      category?: string;
      quantity?: number | null;
      unit_price?: number | null;
    }) => financeApi.updateIncome(id, patch),
    onSuccess: () => {
      ['income', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'আয় এন্ট্রি আপডেট হয়েছে' });
    },
    onError: errorToast(toast, 'আপডেট ব্যর্থ'),
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteIncome(id),
    onSuccess: () => {
      ['income', 'today-summary', 'daily-summary'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast({ title: 'আয় এন্ট্রি মুছে ফেলা হয়েছে' });
    },
    onError: errorToast(toast, 'ডিলিট ব্যর্থ'),
  });
}
