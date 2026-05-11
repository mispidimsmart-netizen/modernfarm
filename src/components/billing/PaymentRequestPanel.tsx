import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Wallet, Plus, Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';

type Method = 'bkash' | 'nagad' | 'rocket' | 'bank_transfer' | 'other';
type Status = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface PaymentRow {
  id: string;
  payment_method: Method;
  sender_account: string;
  transaction_id: string;
  amount_bdt: number;
  months_requested: number;
  requested_license_type: string;
  status: Status;
  rejection_reason: string | null;
  applied_expires_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
}

const methodLabel: Record<Method, string> = {
  bkash: 'বিকাশ',
  nagad: 'নগদ',
  rocket: 'রকেট',
  bank_transfer: 'ব্যাংক ট্রান্সফার',
  other: 'অন্যান্য',
};

const statusLabel: Record<Status, string> = {
  pending: 'পেন্ডিং',
  approved: 'অনুমোদিত',
  rejected: 'প্রত্যাখ্যাত',
  cancelled: 'বাতিল',
};

const statusColor: Record<Status, string> = {
  pending: 'border-amber-400/40 text-amber-300',
  approved: 'border-emerald-400/40 text-emerald-300',
  rejected: 'border-rose-400/40 text-rose-300',
  cancelled: 'border-slate-400/40 text-slate-300',
};

// Static merchant info — replace with your real numbers
const MERCHANT_INFO: Record<Method, string> = {
  bkash: '01XXXXXXXXX (Personal)',
  nagad: '01XXXXXXXXX (Personal)',
  rocket: '01XXXXXXXXX-X',
  bank_transfer: 'Nexiot Labs · A/C 0000-0000-0000 · DBBL',
  other: '—',
};

export function PaymentRequestPanel({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>('bkash');
  const [sender, setSender] = useState('');
  const [txn, setTxn] = useState('');
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('1');
  const [notes, setNotes] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['payment_requests', orgId],
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await supabase
        .from('payment_requests' as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!orgId,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('submit_payment_request' as any, {
        _organization_id: orgId,
        _payment_method: method,
        _sender_account: sender,
        _transaction_id: txn,
        _amount_bdt: Number(amount),
        _months_requested: Number(months),
        _requested_license_type: 'subscription',
        _notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'পেমেন্ট রিকোয়েস্ট জমা হয়েছে', description: 'অ্যাডমিন যাচাই করে অনুমোদন দেবেন।' });
      qc.invalidateQueries({ queryKey: ['payment_requests', orgId] });
      setOpen(false);
      setSender(''); setTxn(''); setAmount(''); setMonths('1'); setNotes('');
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_payment_request' as any, { _request_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'রিকোয়েস্ট বাতিল হয়েছে' });
      qc.invalidateQueries({ queryKey: ['payment_requests', orgId] });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" /> পেমেন্ট ও লাইসেন্স রিনিউ
          </span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" /> নতুন পেমেন্ট
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-white/10 text-slate-100 max-w-md">
              <DialogHeader>
                <DialogTitle>পেমেন্ট জমা দিন</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">পেমেন্ট মাধ্যম</Label>
                  <Select value={method} onValueChange={(v: Method) => setMethod(v)}>
                    <SelectTrigger className="bg-slate-900 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(methodLabel) as Method[]).map(m => (
                        <SelectItem key={m} value={m}>{methodLabel[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-[11px] text-slate-400 mt-1">
                    পাঠান: <span className="text-emerald-300 font-mono">{MERCHANT_INFO[method]}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">আপনার নম্বর/অ্যাকাউন্ট</Label>
                    <Input value={sender} onChange={e => setSender(e.target.value)} placeholder="01XXXXXXXXX" className="bg-slate-900 border-white/10" />
                  </div>
                  <div>
                    <Label className="text-xs">ট্রানজ্যাকশন আইডি</Label>
                    <Input value={txn} onChange={e => setTxn(e.target.value)} placeholder="TXN123ABC" className="bg-slate-900 border-white/10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">পরিমাণ (৳)</Label>
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" className="bg-slate-900 border-white/10" />
                  </div>
                  <div>
                    <Label className="text-xs">কত মাস</Label>
                    <Select value={months} onValueChange={setMonths}>
                      <SelectTrigger className="bg-slate-900 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 3, 6, 12, 24].map(m => <SelectItem key={m} value={String(m)}>{m} মাস</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">নোট (ঐচ্ছিক)</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="bg-slate-900 border-white/10" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10">বাতিল</Button>
                <Button
                  onClick={() => submit.mutate()}
                  disabled={!sender || !txn || !amount || submit.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  জমা দিন
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-400">লোড হচ্ছে...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">কোনো পেমেন্ট রিকোয়েস্ট নেই। লাইসেন্স রিনিউ করতে "নতুন পেমেন্ট" চাপুন।</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColor[r.status]}>{statusLabel[r.status]}</Badge>
                    <span className="text-sm font-medium">{methodLabel[r.payment_method]} · ৳{r.amount_bdt}</span>
                    <span className="text-xs text-slate-400">{r.months_requested} মাস</span>
                  </div>
                  {r.status === 'pending' && (
                    <Button size="sm" variant="outline" className="h-7 border-white/10 text-xs"
                      onClick={() => cancel.mutate(r.id)}>
                      <Ban className="w-3 h-3 mr-1" /> বাতিল
                    </Button>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  TXN: <span className="font-mono">{r.transaction_id}</span> · {r.sender_account} · {new Date(r.created_at).toLocaleString('bn-BD')}
                </div>
                {r.status === 'approved' && r.applied_expires_at && (
                  <div className="text-[11px] text-emerald-300 mt-1">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    নতুন মেয়াদ: {new Date(r.applied_expires_at).toLocaleDateString('bn-BD')}
                  </div>
                )}
                {r.status === 'rejected' && r.rejection_reason && (
                  <div className="text-[11px] text-rose-300 mt-1">
                    <XCircle className="w-3 h-3 inline mr-1" /> কারণ: {r.rejection_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
