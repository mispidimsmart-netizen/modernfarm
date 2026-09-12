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

export function AddFarmToOrgDialog({
  orgId,
  currentOrgName,
  onAssigned,
  isPending,
}: {
  orgId: string;
  currentOrgName: string;
  onAssigned: (farmId: string) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState('');

  const { data: farms = [], isLoading } = useQuery({
    queryKey: ['admin_available_farms', orgId],
    queryFn: async () => {
      // Load all active farms not already in this org
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, owner_id, organization_id')
        .is('deleted_at', null)
        .neq('organization_id', orgId)
        .order('name');
      if (error) throw error;
      // Also include farms with no org (organization_id IS NULL is excluded by .neq above)
      const { data: unassigned, error: e2 } = await supabase
        .from('farms')
        .select('id, name, owner_id, organization_id')
        .is('deleted_at', null)
        .is('organization_id', null)
        .order('name');
      if (e2) throw e2;
      return [...(unassigned || []), ...(data || [])] as Array<{
        id: string; name: string; owner_id: string; organization_id: string | null;
      }>;
    },
  });

  const { data: allOrgs = [] } = useQuery({
    queryKey: ['admin_orgs_for_farm_picker'],
    queryFn: async () => {
      const { data, error } = await supabase.from('organizations').select('id, name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });
  const orgNameMap = new Map(allOrgs.map(o => [o.id, o.name]));

  const filtered = farms.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DialogContent className="max-w-lg bg-slate-900 border-white/10 text-white">
      <DialogHeader>
        <DialogTitle>ফার্ম যোগ করুন → {currentOrgName}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 bg-slate-800 border-white/10"
            placeholder="ফার্মের নাম খুঁজুন..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[360px] pr-2">
          {isLoading && <p className="text-slate-400 text-sm py-4">লোড হচ্ছে...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-slate-400 text-sm py-4 text-center">যোগ করার মতো কোনো ফার্ম নেই</p>
          )}
          <div className="space-y-2">
            {filtered.map(f => (
              <div
                key={f.id}
                className="p-2.5 rounded-md bg-slate-800/60 border border-white/5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm truncate">{f.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {f.organization_id
                      ? `বর্তমানে: ${orgNameMap.get(f.organization_id) || f.organization_id.slice(0, 8)}`
                      : 'কোনো অর্গে নেই'}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-8 bg-cyan-600 hover:bg-cyan-700"
                  disabled={isPending}
                  onClick={() => onAssigned(f.id)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> যোগ
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </DialogContent>
  );
}
