import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Wallet, CheckCircle2, XCircle, PauseCircle, PlayCircle } from 'lucide-react';

type Method = 'bkash' | 'nagad' | 'rocket' | 'bank_transfer' | 'other';
type Status = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface Row {
  id: string;
  organization_id: string;
  payment_method: Method;
  sender_account: string;
  transaction_id: string;
  amount_bdt: number;
  months_requested: number;
  status: Status;
  notes: string | null;
  created_at: string;
  org_name?: string;
}

const methodLabel: Record<Method, string> = {
  bkash: 'বিকাশ', nagad: 'নগদ', rocket: 'রকেট', bank_transfer: 'ব্যাংক', other: 'অন্যান্য',
};

export function PaymentApprovalPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin_payment_requests'],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from('payment_requests' as any)
        .select('*, organizations(name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map((r: any) => ({ ...r, org_name: r.organizations?.name })) as Row[];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('approve_payment_request' as any, { _request_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'অনুমোদিত — লাইসেন্স আপডেট হয়েছে' });
      qc.invalidateQueries({ queryKey: ['admin_payment_requests'] });
      qc.invalidateQueries({ queryKey: ['admin_orgs'] });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const reject = useMutation({
    mutationFn: async ({ id, r }: { id: string; r: string }) => {
      const { error } = await supabase.rpc('reject_payment_request' as any, { _request_id: id, _reason: r });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'প্রত্যাখ্যান করা হয়েছে' });
      setRejectId(null); setReason('');
      qc.invalidateQueries({ queryKey: ['admin_payment_requests'] });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const pending = rows.filter(r => r.status === 'pending');
  const recent = rows.filter(r => r.status !== 'pending').slice(0, 20);

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" /> পেমেন্ট অনুমোদন
          {pending.length > 0 && (
            <Badge className="bg-amber-500/20 border-amber-400/40 text-amber-300">{pending.length} পেন্ডিং</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-slate-400">লোড হচ্ছে...</p>}

        {pending.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-amber-300">পেন্ডিং ({pending.length})</div>
            {pending.map(r => (
              <div key={r.id} className="p-3 rounded-lg bg-amber-500/5 border border-amber-400/20">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-medium">{r.org_name || r.organization_id.slice(0, 8)}</div>
                    <div className="text-[11px] text-slate-400">
                      {methodLabel[r.payment_method]} · ৳{r.amount_bdt} · {r.months_requested} মাস ·{' '}
                      <span className="font-mono">{r.transaction_id}</span> · {r.sender_account}
                    </div>
                    {r.notes && <div className="text-[11px] text-slate-300 mt-1">📝 {r.notes}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(r.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> অনুমোদন
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 border-rose-400/30 text-rose-300"
                      onClick={() => { setRejectId(r.id); setReason(''); }}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> না
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {recent.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400">সাম্প্রতিক</div>
            {recent.map(r => (
              <div key={r.id} className="p-2 rounded bg-slate-800/40 border border-white/5 text-xs flex justify-between gap-2">
                <span>
                  <Badge variant="outline" className="mr-2 text-[10px]">{r.status}</Badge>
                  {r.org_name} · {methodLabel[r.payment_method]} · ৳{r.amount_bdt}
                </span>
                <span className="text-slate-500">{new Date(r.created_at).toLocaleDateString('bn-BD')}</span>
              </div>
            ))}
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <p className="text-sm text-slate-400">কোনো পেমেন্ট রিকোয়েস্ট নেই।</p>
        )}
      </CardContent>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="bg-slate-950 border-white/10 text-slate-100">
          <DialogHeader><DialogTitle>প্রত্যাখ্যানের কারণ</DialogTitle></DialogHeader>
          <Input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="যেমন: TXN আইডি মিলছে না"
            className="bg-slate-900 border-white/10" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)} className="border-white/10">বাতিল</Button>
            <Button variant="destructive"
              disabled={reason.trim().length < 3 || reject.isPending}
              onClick={() => rejectId && reject.mutate({ id: rejectId, r: reason })}>
              প্রত্যাখ্যান করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
