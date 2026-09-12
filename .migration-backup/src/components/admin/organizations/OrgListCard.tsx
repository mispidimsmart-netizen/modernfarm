import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Trash2, Pencil } from 'lucide-react';
import { Org, licenseLabel } from './types';
import { CreateOrgDialog } from './OrgCreateEditDialogs';

interface Props {
  orgs: Org[];
  isLoading: boolean;
  selectedOrgId: string | null;
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
  onSelect: (id: string) => void;
  onEdit: (org: Org) => void;
  onDelete: (org: Org) => void;
  onCreated: () => void;
}

export function OrgListCard({
  orgs, isLoading, selectedOrgId, createOpen, setCreateOpen, onSelect, onEdit, onDelete, onCreated,
}: Props) {
  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-400" />
          কোম্পানি/অর্গানাইজেশন
        </CardTitle>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> নতুন
            </Button>
          </DialogTrigger>
          <CreateOrgDialog onCreated={onCreated} />
        </Dialog>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[480px] pr-2">
          {isLoading && <p className="text-slate-400 text-sm">লোড হচ্ছে...</p>}
          {!isLoading && orgs.length === 0 && (
            <p className="text-slate-400 text-sm">কোনো অর্গানাইজেশন নেই — "নতুন" চাপুন।</p>
          )}
          <div className="space-y-2">
            {orgs.map(o => (
              <div
                key={o.id}
                onClick={() => onSelect(o.id)}
                className={`w-full text-left p-3 rounded-lg border transition cursor-pointer ${
                  selectedOrgId === o.id
                    ? 'bg-emerald-500/10 border-emerald-400/50'
                    : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{o.name}</div>
                    <div className="text-xs text-slate-400 truncate">{o.name_en} · /{o.slug}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 text-[10px]">
                      {licenseLabel[o.license_type]}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-300 hover:bg-slate-700/40"
                      onClick={(e) => { e.stopPropagation(); onEdit(o); }}
                      title="এডিট"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-rose-400 hover:bg-rose-500/10"
                      onClick={(e) => { e.stopPropagation(); onDelete(o); }}
                      title="ডিলিট"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>সর্বোচ্চ ফার্ম: {o.max_farms} · ইউজার: {o.max_users}</span>
                  {o.license_expires_at && (
                    <span className="text-amber-300/80">
                      মেয়াদ: {new Date(o.license_expires_at).toLocaleDateString('bn-BD')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
