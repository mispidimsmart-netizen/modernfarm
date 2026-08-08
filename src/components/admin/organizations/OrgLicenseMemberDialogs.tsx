import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Plus, UserPlus, Trash2, Search, Crown, Shield, KeyRound, Warehouse, Pencil, AlertTriangle } from 'lucide-react';
import { Org, MemberRow, OrgRole, LicenseType, UserSearchRow, roleLabel, licenseLabel } from './types';

export function LicenseDialog({ org, onSaved }: { org: Org; onSaved: () => void }) {
  const { toast } = useToast();
  const [license, setLicense] = useState<LicenseType>(org.license_type);
  const [expiresAt, setExpiresAt] = useState<string>(
    org.license_expires_at ? org.license_expires_at.slice(0, 10) : ''
  );
  const [maxFarms, setMaxFarms] = useState(org.max_farms);
  const [maxUsers, setMaxUsers] = useState(org.max_users);
  const [notes, setNotes] = useState(org.notes || '');

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('super_admin_update_organization_license' as any, {
        _org_id: org.id,
        _license_type: license,
        _license_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        _max_farms: maxFarms,
        _max_users: maxUsers,
        _notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'লাইসেন্স আপডেট হয়েছে' });
      onSaved();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>লাইসেন্স — {org.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>লাইসেন্স টাইপ</Label>
          <Select value={license} onValueChange={(v: LicenseType) => setLicense(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">ট্রায়াল</SelectItem>
              <SelectItem value="lifetime">লাইফটাইম</SelectItem>
              <SelectItem value="subscription">সাবস্ক্রিপশন</SelectItem>
              <SelectItem value="suspended">স্থগিত</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(license === 'trial' || license === 'subscription') && (
          <div>
            <Label>মেয়াদ শেষ</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            <p className="text-[11px] text-slate-500 mt-1">লাইফটাইমের জন্য প্রযোজ্য নয়।</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Max Farms</Label>
            <Input type="number" min={1} value={maxFarms} onChange={e => setMaxFarms(+e.target.value || 1)} />
          </div>
          <div>
            <Label>Max Users</Label>
            <Input type="number" min={1} value={maxUsers} onChange={e => setMaxUsers(+e.target.value || 1)} />
          </div>
        </div>
        <div>
          <Label>নোট (অভ্যন্তরীণ)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="যেমন: ২০২৬ চুক্তি, paid 50k" />
        </div>
        {license === 'suspended' && (
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded p-2">
            ⚠ স্থগিত করলে এই কোম্পানির সব ইউজার তাদের ফার্ম এক্সেস হারাবে।
          </p>
        )}
      </div>
      <DialogFooter>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {save.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------------- Edit Member Role Dialog ---------------- */

export function EditMemberRoleDialog({
  member,
  isPending,
  onSave,
  onClose,
}: {
  member: MemberRow;
  isPending: boolean;
  onSave: (role: OrgRole) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState<OrgRole>(member.role);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const displayName = member.profile?.user_name || member.profile?.phone || member.user_id.slice(0, 8);
  const changed = role !== member.role;
  const isOwnerChange = member.role === 'org_owner' || role === 'org_owner';

  return (
    <DialogContent className="bg-slate-900 border-white/10">
      <DialogHeader>
        <DialogTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          সদস্যের রোল এডিট করুন
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="text-sm text-slate-300">
          <div className="text-white font-medium">{displayName}</div>
          <div className="text-xs text-slate-400">
            {member.profile?.phone || ''} {member.profile?.email ? `· ${member.profile.email}` : ''}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-200">রোল</Label>
          <Select value={role} onValueChange={(v: OrgRole) => setRole(v)} disabled={isPending}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="org_owner">{roleLabel.org_owner}</SelectItem>
              <SelectItem value="org_admin">{roleLabel.org_admin}</SelectItem>
              <SelectItem value="member">{roleLabel.member}</SelectItem>
            </SelectContent>
          </Select>
          {changed && (
            <p className="text-xs text-amber-300/90">
              পরিবর্তন: <strong>{roleLabel[member.role]}</strong> → <strong>{roleLabel[role]}</strong>
            </p>
          )}
        </div>

        <MemberRoleHistory memberId={member.id} />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={isPending}>বাতিল</Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={!changed || isPending}
          onClick={() => setConfirmOpen(true)}
        >
          {isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
        </Button>
      </DialogFooter>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(o) => !isPending && setConfirmOpen(o)}
      >
        <AlertDialogContent className="bg-slate-900 border-amber-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              রোল পরিবর্তন নিশ্চিত করুন?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 space-y-2">
              <span className="block">
                <strong className="text-white">{displayName}</strong> এর রোল{' '}
                <strong className="text-white">{roleLabel[member.role]}</strong> থেকে{' '}
                <strong className="text-white">{roleLabel[role]}</strong> এ পরিবর্তন করা হবে।
              </span>
              {isOwnerChange && (
                <span className="block rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200 text-xs">
                  সতর্কতা: মালিক (Owner) রোল পরিবর্তন অর্গানাইজেশনের অ্যাক্সেস ও কন্ট্রোলে বড় প্রভাব ফেলতে পারে।
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                onSave(role);
                setConfirmOpen(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending ? 'সংরক্ষণ হচ্ছে...' : 'হ্যাঁ, পরিবর্তন করুন'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  );
}

/* ---------------- Member Role History ---------------- */

export function MemberRoleHistory({ memberId }: { memberId: string }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['member_role_history', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_activity_audit')
        .select('id, actor_user_id, before, after, changed_at')
        .eq('action_type', 'org_member_role_changed')
        .eq('entity_id', memberId)
        .order('changed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const rows = (data || []) as Array<{
        id: string;
        actor_user_id: string | null;
        before: any;
        after: any;
        changed_at: string;
      }>;
      const actorIds = Array.from(new Set(rows.map(r => r.actor_user_id).filter(Boolean) as string[]));
      let actorMap = new Map<string, { user_name: string | null; phone: string | null; email: string | null }>();
      if (actorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, user_name, phone, email')
          .in('id', actorIds);
        actorMap = new Map((profs || []).map((p: any) => [p.id, p]));
      }
      return rows.map(r => ({ ...r, actor: r.actor_user_id ? actorMap.get(r.actor_user_id) : null }));
    },
  });

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <div className="flex items-center gap-2 text-slate-200 text-sm font-medium">
        <Shield className="w-4 h-4 text-slate-400" />
        রোল পরিবর্তনের ইতিহাস
      </div>
      {isLoading ? (
        <p className="text-xs text-slate-400">লোড হচ্ছে...</p>
      ) : history.length === 0 ? (
        <p className="text-xs text-slate-500">কোনো পূর্ববর্তী পরিবর্তন নেই।</p>
      ) : (
        <ScrollArea className="h-40 rounded-md border border-white/10 bg-slate-950/40 p-2">
          <ul className="space-y-2">
            {history.map((h) => {
              const before = (h.before as any)?.role as OrgRole | undefined;
              const after = (h.after as any)?.role as OrgRole | undefined;
              const actorName =
                (h.actor as any)?.user_name ||
                (h.actor as any)?.phone ||
                (h.actor_user_id ? `${h.actor_user_id.slice(0, 8)}…` : 'অজানা');
              const when = new Date(h.changed_at).toLocaleString('bn-BD', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });
              return (
                <li key={h.id} className="text-xs text-slate-300 leading-relaxed">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                      {before ? roleLabel[before] : '—'}
                    </Badge>
                    <span className="text-slate-500">→</span>
                    <Badge className="text-[10px] bg-emerald-600/30 text-emerald-200 border-emerald-500/40">
                      {after ? roleLabel[after] : '—'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    <span className="text-slate-300">{actorName}</span> · {when}
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}

/* ---------------- Add Farm to Org Dialog ---------------- */

