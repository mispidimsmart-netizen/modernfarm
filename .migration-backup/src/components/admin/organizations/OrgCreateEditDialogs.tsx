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

export function EditOrgDialog({ org, onSaved }: { org: Org; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(org.name);
  const [nameEn, setNameEn] = useState(org.name_en);
  const [slug, setSlug] = useState(org.slug);
  const [notes, setNotes] = useState(org.notes ?? '');

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('super_admin_update_organization' as any, {
        _org_id: org.id,
        _name: name,
        _name_en: nameEn || name,
        _slug: slug,
        _notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'অর্গানাইজেশন আপডেট হয়েছে' });
      onSaved();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>অর্গানাইজেশন এডিট</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>নাম (বাংলা)</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Name (English)</Label>
            <Input value={nameEn} onChange={e => setNameEn(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Slug (URL)</Label>
          <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
        </div>
        <div>
          <Label>নোট</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="ঐচ্ছিক" />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || !name.trim() || !slug.trim()}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {save.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------------- Create Org Dialog ---------------- */

export function CreateOrgDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [license, setLicense] = useState<LicenseType>('trial');
  const [maxFarms, setMaxFarms] = useState(1);
  const [maxUsers, setMaxUsers] = useState(5);
  const [search, setSearch] = useState('');

  const { data: results = [] } = useQuery({
    queryKey: ['admin_user_search', search],
    enabled: search.length > 1,
    queryFn: async (): Promise<UserSearchRow[]> => {
      const { data, error } = await supabase.rpc('admin_search_users' as any, { _q: search });
      if (error) throw error;
      return (data || []) as UserSearchRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_create_organization' as any, {
        _name: name,
        _name_en: nameEn || name,
        _slug: slug,
        _owner_user_id: ownerId,
        _license_type: license,
        _max_farms: maxFarms,
        _max_users: maxUsers,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'অর্গানাইজেশন তৈরি হয়েছে' });
      onCreated();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>নতুন অর্গানাইজেশন</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>নাম (বাংলা)</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Name (English)</Label>
            <Input value={nameEn} onChange={e => setNameEn(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Slug (URL)</Label>
          <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="acme-poultry" />
        </div>

        <div>
          <Label>Owner খুঁজুন (ফোন/ইমেইল/নাম)</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input className="pl-8" value={search} onChange={e => setSearch(e.target.value)} placeholder="01700000000" />
          </div>
          {search.length > 1 && (
            <div className="mt-2 max-h-40 overflow-auto border border-white/10 rounded-md">
              {results.map(r => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => { setOwnerId(r.id); setSearch(r.user_name || r.phone || r.email || r.id); }}
                  className={`block w-full text-left p-2 text-sm hover:bg-slate-700/40 ${ownerId === r.id ? 'bg-emerald-500/10' : ''}`}
                >
                  <div className="text-white">{r.user_name || '—'}</div>
                  <div className="text-[11px] text-slate-400">{r.phone} {r.email && `· ${r.email}`}</div>
                </button>
              ))}
              {results.length === 0 && <div className="p-2 text-xs text-slate-500">কেউ পাওয়া যায়নি</div>}
            </div>
          )}
          {ownerId && <div className="text-[11px] text-emerald-400 mt-1">নির্বাচিত: {ownerId.slice(0, 8)}…</div>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>লাইসেন্স</Label>
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
          <div>
            <Label>Max Farms</Label>
            <Input type="number" min={1} value={maxFarms} onChange={e => setMaxFarms(+e.target.value || 1)} />
          </div>
          <div>
            <Label>Max Users</Label>
            <Input type="number" min={1} value={maxUsers} onChange={e => setMaxUsers(+e.target.value || 1)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => create.mutate()}
          disabled={!name || !nameEn || !slug || !ownerId || create.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {create.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------------- Add Member Dialog ---------------- */

export function AddMemberDialog({ orgId, onAdded }: { orgId: string; onAdded: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<OrgRole>('member');

  const { data: results = [] } = useQuery({
    queryKey: ['admin_user_search_member', search],
    enabled: search.length > 1,
    queryFn: async (): Promise<UserSearchRow[]> => {
      const { data, error } = await supabase.rpc('admin_search_users' as any, { _q: search });
      if (error) throw error;
      return (data || []) as UserSearchRow[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('super_admin_add_org_member' as any, {
        _org_id: orgId, _identifier: identifier, _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'সদস্য যোগ হয়েছে' });
      onAdded();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>সদস্য যোগ করুন</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>ইউজার খুঁজুন</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              className="pl-8"
              value={search}
              onChange={e => { setSearch(e.target.value); setIdentifier(e.target.value); }}
              placeholder="ফোন / ইমেইল / নাম"
            />
          </div>
          {search.length > 1 && (
            <div className="mt-2 max-h-48 overflow-auto border border-white/10 rounded-md">
              {results.map(r => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => { setIdentifier(r.id); setSearch(r.user_name || r.phone || r.email || r.id); }}
                  className="block w-full text-left p-2 text-sm hover:bg-slate-700/40"
                >
                  <div className="text-white">{r.user_name || '—'}</div>
                  <div className="text-[11px] text-slate-400">{r.phone} {r.email && `· ${r.email}`}</div>
                </button>
              ))}
              {results.length === 0 && <div className="p-2 text-xs text-slate-500">কেউ পাওয়া যায়নি</div>}
            </div>
          )}
        </div>
        <div>
          <Label>রোল</Label>
          <Select value={role} onValueChange={(v: OrgRole) => setRole(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="org_owner">{roleLabel.org_owner}</SelectItem>
              <SelectItem value="org_admin">{roleLabel.org_admin}</SelectItem>
              <SelectItem value="member">{roleLabel.member}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => add.mutate()}
          disabled={!identifier || add.isPending}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {add.isPending ? 'যোগ হচ্ছে...' : 'যোগ করুন'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------------- License Dialog ---------------- */

