import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Crown, Shield, Tractor, Users } from 'lucide-react';
import { licenseLabel, roleLabel, type MyOrg } from '@/lib/orgAdmin';

export function OrgSummaryCards({ selected }: { selected: MyOrg }) {
  return (
    <>
      <Card className={`border ${selected.license_valid ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/40'}`}>
        <CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            {selected.my_role === 'org_owner'
              ? <Crown className="w-5 h-5 text-amber-400" />
              : <Shield className="w-5 h-5 text-emerald-400" />}
            <div>
              <div className="font-semibold">{selected.name}</div>
              <div className="text-xs text-slate-400">
                {selected.name_en} · /{selected.slug} · {roleLabel[selected.my_role]}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={selected.license_valid ? 'border-emerald-400/40 text-emerald-300' : 'border-rose-400/40 text-rose-300'}
            >
              {licenseLabel[selected.license_type]}
            </Badge>
            {selected.license_expires_at && (
              <Badge variant="outline" className="border-amber-400/40 text-amber-300">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(selected.license_expires_at).toLocaleDateString('bn-BD')}
              </Badge>
            )}
            {!selected.license_valid && (
              <span className="text-xs text-rose-300">⚠ লাইসেন্স অবৈধ — অ্যাকসেস বন্ধ</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-slate-900/80 border-white/10">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1"><Tractor className="w-3.5 h-3.5" />ফার্ম</div>
            <div className="text-2xl font-bold mt-1">
              {selected.farm_count} <span className="text-sm text-slate-500">/ {selected.max_farms}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-white/10">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" />সদস্য</div>
            <div className="text-2xl font-bold mt-1">
              {selected.member_count} <span className="text-sm text-slate-500">/ {selected.max_users}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-white/10">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400">আপনার রোল</div>
            <div className="text-lg font-bold mt-1">{roleLabel[selected.my_role]}</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
