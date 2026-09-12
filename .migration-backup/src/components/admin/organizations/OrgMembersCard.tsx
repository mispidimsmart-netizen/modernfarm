import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Trash2, Crown, Shield, KeyRound, Warehouse, Plus, Pencil } from 'lucide-react';
import { Org, MemberRow, roleLabel } from './types';
import { LicenseDialog } from './OrgLicenseMemberDialogs';
import { AddMemberDialog } from './OrgCreateEditDialogs';
import type { OrgFarmRow } from '@/hooks/useOrganizationsAdmin';

interface Props {
  orgs: Org[];
  selectedOrg?: Org;
  selectedOrgId: string | null;
  members: MemberRow[];
  orgFarms: OrgFarmRow[];
  farmsLoading: boolean;
  ownerMap: Map<string, { id: string; user_name: string | null; phone: string | null }>;
  licenseOpen: boolean;
  setLicenseOpen: (v: boolean) => void;
  addMemberOpen: boolean;
  setAddMemberOpen: (v: boolean) => void;
  onLicenseSaved: () => void;
  onMemberAdded: () => void;
  onEditMember: (m: MemberRow) => void;
  onRemoveMember: (m: MemberRow) => void;
  onAddFarm: () => void;
  onReassignFarm: (farmId: string, newOrgId: string) => void;
  onRemoveFarm: (farm: { id: string; name: string }) => void;
}

export function OrgMembersCard({
  orgs, selectedOrg, selectedOrgId, members, orgFarms, farmsLoading, ownerMap,
  licenseOpen, setLicenseOpen, addMemberOpen, setAddMemberOpen,
  onLicenseSaved, onMemberAdded, onEditMember, onRemoveMember,
  onAddFarm, onReassignFarm, onRemoveFarm,
}: Props) {
  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          সদস্য {selectedOrg ? `· ${selectedOrg.name}` : ''}
        </CardTitle>
        {selectedOrg && (
          <div className="flex gap-2">
            <Dialog open={licenseOpen} onOpenChange={setLicenseOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10">
                  <KeyRound className="w-4 h-4 mr-1" /> লাইসেন্স
                </Button>
              </DialogTrigger>
              <LicenseDialog org={selectedOrg} onSaved={onLicenseSaved} />
            </Dialog>
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                  <UserPlus className="w-4 h-4 mr-1" /> যোগ করুন
                </Button>
              </DialogTrigger>
              <AddMemberDialog orgId={selectedOrg.id} onAdded={onMemberAdded} />
            </Dialog>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!selectedOrg ? (
          <p className="text-slate-400 text-sm">বাঁদিক থেকে একটি অর্গানাইজেশন বেছে নিন।</p>
        ) : (
          <ScrollArea className="h-[480px] pr-2">
            <div className="space-y-2">
              {members.length === 0 && <p className="text-slate-400 text-sm">কোনো সদস্য নেই।</p>}
              {members.map(m => (
                <div key={m.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm truncate flex items-center gap-2">
                      {m.role === 'org_owner' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {m.profile?.user_name || m.profile?.phone || m.user_id.slice(0, 8)}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {m.profile?.phone || ''} {m.profile?.email ? `· ${m.profile.email}` : ''}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      m.role === 'org_owner'
                        ? 'border-amber-400/40 text-amber-300'
                        : m.role === 'org_admin'
                          ? 'border-emerald-400/40 text-emerald-300'
                          : 'border-slate-400/30 text-slate-300'
                    }
                  >
                    {roleLabel[m.role]}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-300 hover:bg-slate-700/40"
                    onClick={() => onEditMember(m)}
                    title="রোল এডিট করুন"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => onRemoveMember(m)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-cyan-400" />
                  <span className="text-white text-sm font-medium">আওতাভুক্ত ফার্ম</span>
                  <Badge variant="outline" className="border-cyan-400/40 text-cyan-300 text-[10px]">
                    {orgFarms.length}
                  </Badge>
                </div>
                <Button size="sm" className="h-7 bg-cyan-600 hover:bg-cyan-700" onClick={onAddFarm}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> ফার্ম যোগ
                </Button>
              </div>
              {farmsLoading ? (
                <p className="text-slate-400 text-xs">লোড হচ্ছে...</p>
              ) : orgFarms.length === 0 ? (
                <p className="text-slate-400 text-xs">এই অর্গানাইজেশনের অধীনে কোনো ফার্ম নেই — "ফার্ম যোগ" চাপুন।</p>
              ) : (
                <div className="space-y-2">
                  {orgFarms.map(f => {
                    const owner = ownerMap.get(f.owner_id);
                    return (
                      <div key={f.id} className="p-2.5 rounded-md bg-slate-800/40 border border-white/5 flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-white text-sm truncate">{f.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            মালিক: {owner?.user_name || owner?.phone || f.owner_id.slice(0, 8)}
                          </div>
                        </div>
                        <Select
                          value={selectedOrgId!}
                          onValueChange={(v) => {
                            if (v === selectedOrgId) return;
                            onReassignFarm(f.id, v);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[150px] bg-slate-900 border-white/10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {orgs.map(o => (
                              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                          title="এই অর্গ থেকে সরান"
                          onClick={() => onRemoveFarm({ id: f.id, name: f.name })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
