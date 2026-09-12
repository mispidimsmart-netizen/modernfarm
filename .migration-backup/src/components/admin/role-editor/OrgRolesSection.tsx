import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ORG_ROLES, type DraftOrg, type OrgOpt } from './roleEditorTypes';

interface Props {
  draftOrgs: DraftOrg[];
  setDraftOrgs: React.Dispatch<React.SetStateAction<DraftOrg[]>>;
  availableOrgs: OrgOpt[];
  realOrgs: OrgOpt[];
}

export function OrgRolesSection({ draftOrgs, setDraftOrgs, availableOrgs, realOrgs }: Props) {
  const [newOrgId, setNewOrgId] = useState('');
  const [newOrgRole, setNewOrgRole] = useState('member');

  return (
    <section className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-400/20 space-y-2">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-emerald-400" />
        <span className="font-semibold text-emerald-200">অর্গানাইজেশন রোল</span>
      </div>
      {draftOrgs.length === 0 && <p className="text-xs text-slate-400">কোনো অর্গে সদস্য না।</p>}
      {draftOrgs.map(o => (
        <div key={o.organization_id} className="flex items-center gap-2 p-2 rounded bg-slate-800/60">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">{o.org_name}</div>
            <div className="text-[10px] text-slate-500 truncate">{o.org_slug}</div>
          </div>
          <Select
            value={o.role}
            onValueChange={(v) => setDraftOrgs(prev =>
              prev.map(x => x.organization_id === o.organization_id ? { ...x, role: v } : x)
            )}
          >
            <SelectTrigger className="h-8 w-[140px] bg-slate-900 border-white/10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="icon" variant="ghost"
            className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
            onClick={() => setDraftOrgs(prev => prev.filter(x => x.organization_id !== o.organization_id))}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {availableOrgs.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <Select value={newOrgId} onValueChange={setNewOrgId}>
            <SelectTrigger className="h-8 flex-1 bg-slate-900 border-white/10 text-xs">
              <SelectValue placeholder="অর্গ বেছে নিন..." />
            </SelectTrigger>
            <SelectContent>
              {availableOrgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newOrgRole} onValueChange={setNewOrgRole}>
            <SelectTrigger className="h-8 w-[130px] bg-slate-900 border-white/10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700"
            disabled={!newOrgId}
            onClick={() => {
              const org = realOrgs.find(o => o.id === newOrgId);
              if (!org) return;
              setDraftOrgs(prev => [...prev, {
                organization_id: org.id,
                role: newOrgRole,
                org_name: org.name,
                org_slug: org.slug || '',
              }]);
              setNewOrgId('');
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </section>
  );
}
