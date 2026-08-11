import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roleLabel, type OrgRole } from '@/lib/orgAdmin';

export function AddMemberDialog({ orgId, onAdded }: { orgId: string; onAdded: () => void }) {
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<OrgRole>('member');

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('org_admin_create_invitation' as any, {
        _org_id: orgId, _identifier: identifier.trim(), _role: role, _expires_days: 14,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'আমন্ত্রণ পাঠানো হয়েছে', description: 'ব্যবহারকারী লগইন করলে গ্রহণ/প্রত্যাখ্যান করতে পারবেন।' });
      onAdded();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>সদস্য আমন্ত্রণ পাঠান</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>ফোন বা ইমেইল</Label>
          <Input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="01700000000 বা user@example.com" />
          <p className="text-[11px] text-slate-500 mt-1">আমন্ত্রণ ১৪ দিনের জন্য বৈধ থাকবে।</p>
        </div>
        <div>
          <Label>রোল</Label>
          <Select value={role} onValueChange={(v: OrgRole) => setRole(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="org_admin">{roleLabel.org_admin}</SelectItem>
              <SelectItem value="member">{roleLabel.member}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-500 mt-1">মালিক (Owner) শুধু সুপার অ্যাডমিন সেট করতে পারেন।</p>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => add.mutate()}
          disabled={!identifier || add.isPending}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {add.isPending ? 'পাঠানো হচ্ছে...' : 'আমন্ত্রণ পাঠান'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
