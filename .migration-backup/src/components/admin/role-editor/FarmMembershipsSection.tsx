import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { HardHat, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FARM_ROLES, type DraftFarm, type FarmOpt } from './roleEditorTypes';

interface Props {
  draftFarms: DraftFarm[];
  setDraftFarms: React.Dispatch<React.SetStateAction<DraftFarm[]>>;
  availableFarms: FarmOpt[];
  allFarms: FarmOpt[];
}

export function FarmMembershipsSection({ draftFarms, setDraftFarms, availableFarms, allFarms }: Props) {
  const [newFarmId, setNewFarmId] = useState('');
  const [newFarmRole, setNewFarmRole] = useState('member');

  return (
    <section className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-400/20 space-y-2">
      <div className="flex items-center gap-2">
        <HardHat className="w-4 h-4 text-cyan-400" />
        <span className="font-semibold text-cyan-200">ফার্ম মেম্বারশিপ (ওয়ার্কার/ম্যানেজার)</span>
      </div>
      {draftFarms.length === 0 && <p className="text-xs text-slate-400">কোনো ফার্মে সদস্য না।</p>}
      {draftFarms.map(f => (
        <div key={f.farm_id} className="flex items-center gap-2 p-2 rounded bg-slate-800/60">
          <div className="flex-1 min-w-0 text-sm text-white truncate">{f.farm_name}</div>
          <Select
            value={f.role}
            onValueChange={(v) => setDraftFarms(prev =>
              prev.map(x => x.farm_id === f.farm_id ? { ...x, role: v } : x)
            )}
          >
            <SelectTrigger className="h-8 w-[130px] bg-slate-900 border-white/10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FARM_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="icon" variant="ghost"
            className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
            onClick={() => setDraftFarms(prev => prev.filter(x => x.farm_id !== f.farm_id))}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {availableFarms.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <Select value={newFarmId} onValueChange={setNewFarmId}>
            <SelectTrigger className="h-8 flex-1 bg-slate-900 border-white/10 text-xs">
              <SelectValue placeholder="ফার্ম বেছে নিন..." />
            </SelectTrigger>
            <SelectContent>
              {availableFarms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newFarmRole} onValueChange={setNewFarmRole}>
            <SelectTrigger className="h-8 w-[130px] bg-slate-900 border-white/10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FARM_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm" className="h-8 bg-cyan-600 hover:bg-cyan-700"
            disabled={!newFarmId}
            onClick={() => {
              const farm = allFarms.find(x => x.id === newFarmId);
              if (!farm) return;
              setDraftFarms(prev => [...prev, {
                farm_id: farm.id,
                role: newFarmRole,
                farm_name: farm.name,
              }]);
              setNewFarmId('');
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </section>
  );
}
