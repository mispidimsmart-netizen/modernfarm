import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Eye, Tractor, Crown, Building2, Check, X } from 'lucide-react';

type Role = 'super_admin' | 'org_admin' | 'owner' | 'worker';

interface Capability {
  key: string;
  label: { bn: string; en: string };
  access: Record<Role, boolean>;
}

const CAPS: Capability[] = [
  {
    key: 'view_dashboard',
    label: { bn: 'ড্যাশবোর্ড দেখা', en: 'View Dashboard' },
    access: { super_admin: true, org_admin: true, owner: true, worker: true },
  },
  {
    key: 'view_alerts',
    label: { bn: 'অ্যালার্ট দেখা', en: 'View Alerts' },
    access: { super_admin: true, org_admin: true, owner: true, worker: true },
  },
  {
    key: 'temp_override',
    label: { bn: '২০ মিনিট ম্যানুয়াল ওভাররাইড', en: '20-min Manual Override' },
    access: { super_admin: true, org_admin: true, owner: true, worker: true },
  },
  {
    key: 'edit_automation',
    label: { bn: 'অটোমেশন রুল এডিট', en: 'Edit Automation Rules' },
    access: { super_admin: true, org_admin: true, owner: true, worker: false },
  },
  {
    key: 'edit_thresholds',
    label: { bn: 'থ্রেশহোল্ড পরিবর্তন', en: 'Edit Thresholds' },
    access: { super_admin: true, org_admin: true, owner: true, worker: false },
  },
  {
    key: 'manage_workers',
    label: { bn: 'কর্মী ম্যানেজমেন্ট', en: 'Manage Workers' },
    access: { super_admin: true, org_admin: true, owner: true, worker: false },
  },
  {
    key: 'finance',
    label: { bn: 'ফাইন্যান্স রিপোর্ট', en: 'Finance Reports' },
    access: { super_admin: true, org_admin: true, owner: true, worker: false },
  },
  {
    key: 'esp32_config',
    label: { bn: 'ESP32 ফার্মওয়্যার / কনফিগ', en: 'ESP32 Firmware / Config' },
    access: { super_admin: true, org_admin: false, owner: false, worker: false },
  },
  {
    key: 'multi_farm',
    label: { bn: 'একাধিক ফার্ম ম্যানেজ', en: 'Manage Multiple Farms' },
    access: { super_admin: true, org_admin: true, owner: false, worker: false },
  },
];

const ROLE_META: Record<Role, { icon: typeof Crown; label: { bn: string; en: string }; color: string }> = {
  super_admin: { icon: Crown, label: { bn: 'অ্যাডমিন', en: 'Admin' }, color: 'text-purple-600 dark:text-purple-400' },
  org_admin: { icon: Building2, label: { bn: 'অর্গ', en: 'Org' }, color: 'text-emerald-600 dark:text-emerald-400' },
  owner: { icon: Tractor, label: { bn: 'মালিক', en: 'Owner' }, color: 'text-primary' },
  worker: { icon: Eye, label: { bn: 'কর্মী', en: 'Worker' }, color: 'text-amber-600 dark:text-amber-400' },
};

export function PermissionsMatrixCard() {
  const { language } = useAuth();
  const roles: Role[] = ['super_admin', 'org_admin', 'owner', 'worker'];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {language === 'bn' ? 'কে কী করতে পারবে' : 'Permissions Matrix'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2.5 font-medium text-muted-foreground sticky left-0 bg-muted/50">
                  {language === 'bn' ? 'ক্ষমতা' : 'Capability'}
                </th>
                {roles.map((r) => {
                  const meta = ROLE_META[r];
                  const Icon = meta.icon;
                  return (
                    <th key={r} className="p-2 text-center font-medium">
                      <div className="flex flex-col items-center gap-0.5">
                        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                        <span className="text-[10px]">{meta.label[language]}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {CAPS.map((cap, i) => (
                <tr key={cap.key} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="p-2.5 sticky left-0 bg-inherit font-medium">{cap.label[language]}</td>
                  {roles.map((r) => (
                    <td key={r} className="p-2 text-center">
                      {cap.access[r] ? (
                        <Check className="h-3.5 w-3.5 text-status-normal mx-auto" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t bg-muted/20">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {language === 'bn'
              ? '⚠️ কর্মীরা পরিবর্তন করতে পারবে না — শুধুমাত্র ২০ মিনিটের সাময়িক ওভাররাইড। সব অটোমেশন রুল ও থ্রেশহোল্ড মালিক/অ্যাডমিন নিয়ন্ত্রণ করেন।'
              : 'Workers can only do 20-min temporary overrides. All automation rules and thresholds are controlled by Owner/Admin.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
