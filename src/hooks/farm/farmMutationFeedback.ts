import { useToast } from '@/hooks/use-toast';

/** Shared toast helpers for farm-management mutations. */
export const errorToast = (toast: ReturnType<typeof useToast>['toast'], title: string) =>
  (e: any) => toast({ title, description: e?.message, variant: 'destructive' });

export const offlineTitle = (res: any, okTitle: string) =>
  res?.queued ? '📴 অফলাইনে সংরক্ষিত — নেট এলে সিঙ্ক হবে' : okTitle;
