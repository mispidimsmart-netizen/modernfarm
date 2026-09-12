import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { Org, MemberRow } from './types';

export function DeleteOrgConfirm({
  target, counts, isPending, onOpenChange, onConfirm,
}: {
  target: Org | null;
  counts?: { farms: number; members: number };
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-rose-500/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            অর্গানাইজেশন মুছে ফেলতে চান?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300 space-y-2">
            <span className="block">
              আপনি <strong className="text-white">"{target?.name}"</strong> মুছে ফেলতে যাচ্ছেন।
            </span>
            {counts && (
              <span className="block rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200 text-xs">
                এই অর্গানাইজেশনে <strong>{counts.members}</strong> জন সদস্য এবং <strong>{counts.farms}</strong>টি ফার্ম রয়েছে।
                {counts.farms > 0 && (
                  <> ফার্ম থাকা অবস্থায় মুছে ফেলা যাবে না — আগে ফার্মগুলো অন্যত্র সরান।</>
                )}
              </span>
            )}
            <span className="block text-rose-300 text-xs">এই কাজ আর ফেরানো যাবে না।</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>বাতিল</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || (counts?.farms ?? 0) > 0}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
          >
            {isPending ? 'মুছছে...' : 'মুছে ফেলুন'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RemoveMemberConfirm({
  target, isPending, onOpenChange, onConfirm,
}: {
  target: MemberRow | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-rose-500/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            সদস্য সরাতে চান?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300 space-y-2">
            <span className="block">
              <strong className="text-white">
                {target?.profile?.user_name || target?.profile?.phone || target?.user_id.slice(0, 8)}
              </strong>{' '}
              কে এই অর্গানাইজেশন থেকে সরিয়ে দেওয়া হবে।
            </span>
            {target?.role === 'org_owner' && (
              <span className="block rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200 text-xs">
                সতর্কতা: এই ব্যবহারকারী মালিক — সরালে অর্গানাইজেশন মালিকবিহীন হয়ে যেতে পারে।
              </span>
            )}
            <span className="block text-slate-400 text-xs">তাদের ফার্ম অ্যাসাইনমেন্টও বাতিল হতে পারে।</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>বাতিল</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
          >
            {isPending ? 'সরানো হচ্ছে...' : 'সরিয়ে দিন'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RemoveFarmConfirm({
  target, isPending, onOpenChange, onConfirm,
}: {
  target: { id: string; name: string } | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-amber-500/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            ফার্ম এই অর্গ থেকে সরাবেন?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            <strong className="text-white">"{target?.name}"</strong> এই অর্গানাইজেশন থেকে সরিয়ে unassigned করা হবে। ফার্ম মুছবে না — পরে অন্য অর্গে যোগ করা যাবে।
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>বাতিল</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isPending ? 'সরানো হচ্ছে...' : 'সরিয়ে দিন'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
