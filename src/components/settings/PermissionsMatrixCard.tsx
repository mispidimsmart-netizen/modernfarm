import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Eye, Tractor, Crown, Building2, Check, X } from 'lucide-react';

type Role = 'super_admin' | 'org_owner' | 'farm_owner' | 'worker';

interface Capability {
  key: string;
  label: { bn: string; en: string };
  access: Record<Role, boolean>;
}

// Rule recap:
//   super_admin             → everything
//   org_owner (কোম্পানি/অর্গ) → manages org's farms & members; NO direct farm operation, NO hardware
//   farm_owner (ফার্ম)        → full control of own farm including hardware
//   worker (ওয়ার্কার)         → same as farm_owner EXCEPT hardware/automation/threshold/ESP32
const CAPS: Capability[] = [
  {
    key: 'view_dashboard',
    label: { bn: 'ড্যাশবোর্ড দেখা', en: 'View Dashboard' },
    access: { super_admin: true, org_owner: true, farm_owner: true, worker: true },
  },
  {
    key: 'view_alerts',
    label: { bn: 'অ্যালার্ট দেখা', en: 'View Alerts' },
    access: { super_admin: true, org_owner: true, farm_owner: true, worker: true },
  },
  {
    key: 'temp_override',
    label: { bn: '২০ মিনিট ম্যানুয়াল ওভাররাইড', en: '20-min Manual Override' },
    access: { super_admin: true, org_owner: false, farm_owner: true, worker: true },
  },
  {
    key: 'log_daily',
    label: { bn: 'খাবার/পানি/মৃত্যু/ডিম এন্ট্রি', en: 'Daily Logs (feed/water/mortality/eggs)' },
    access: { super_admin: true, org_owner: false, farm_owner: true, worker: true },
  },
  {
    key: 'finance',
    label: { bn: 'ফাইন্যান্স রিপোর্ট ও এন্ট্রি', en: 'Finance Reports & Entries' },
    access: { super_admin: true, org_owner: true, farm_owner: true, worker: true },
  },
  {
    key: 'batches',
    label: { bn: 'ব্যাচ তৈরি/বন্ধ', en: 'Batch Create/Close' },
    access: { super_admin: true, org_owner: false, farm_owner: true, worker: false },
  },
  {
    key: 'edit_automation',
    label: { bn: 'অটোমেশন রুল এডিট', en: 'Edit Automation Rules' },
    access: { super_admin: true, org_owner: false, farm_owner: true, worker: false },
  },
  {
    key: 'edit_thresholds',
    label: { bn: 'থ্রেশহোল্ড পরিবর্তন', en: 'Edit Thresholds' },
    access: { super_admin: true, org_owner: false, farm_owner: true, worker: false },
  },
  {
    key: 'manage_workers',
    label: { bn: 'ওয়ার্কার ম্যানেজমেন্ট', en: 'Manage Workers' },
    access: { super_admin: true, org_owner: true, farm_owner: true, worker: false },
  },
  {
    key: 'manage_farm',
    label: { bn: 'ফার্ম যোগ/মুছে দেওয়া', en: 'Add/Remove Farm' },
    access: { super_admin: true, org_owner: true, farm_owner: false, worker: false },
  },
  {
    key: 'manage_org_members',
    label: { bn: 'অর্গানাইজেশন মেম্বার ম্যানেজ', en: 'Manage Org Members' },
    access: { super_admin: true, org_owner: true, farm_owner: false, worker: false },
  },
  {
    key: 'esp32_config',
    label: { bn: 'ESP32 ফার্মওয়্যার / কনফিগ', en: 'ESP32 Firmware / Config' },
    access: { super_admin: true, org_owner: false, farm_owner: false, worker: false },
  },
  {
    key: 'platform_admin',
    label: { bn: 'সকল ইউজার/অর্গ নিয়োগ', en: 'Appoint Users/Orgs' },
    access: { super_admin: true, org_owner: false, farm_owner: false, worker: false },
  },
];

const ROLE_META: Record<Role, { icon: typeof Crown; label: { bn: string; en: string }; color: string }> = {
  super_admin: { icon: Crown, label: { bn: 'সুপার এডমিন', en: 'Super Admin' }, color: 'text-purple-600 dark:text-purple-400' },
  org_owner: { icon: Building2, label: { bn: 'কোম্পানি/অর্গ', en: 'Company/Org' }, color: 'text-emerald-600 dark:text-emerald-400' },
  farm_owner: { icon: Tractor, label: { bn: 'ফার্ম', en: 'Farm' }, color: 'text-primary' },
  worker: { icon: Eye, label: { bn: 'ওয়ার্কার', en: 'Worker' }, color: 'text-amber-600 dark:text-amber-400' },
};

export function PermissionsMatrixCard() {
  const { language } = useAuth();
  const roles: Role[] = ['super_admin', 'org_owner', 'farm_owner', 'worker'];

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
        <div className="p-3 border-t bg-muted/20 space-y-1">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {language === 'bn'
              ? '⚠️ ওয়ার্কার hardware/automation/threshold বদলাতে পারবে না — শুধু ২০ মিনিটের সাময়িক ওভাররাইড ও দৈনিক ডেটা এন্ট্রি।'
              : 'Workers cannot change hardware/automation/thresholds — only 20-min override and daily logs.'}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {language === 'bn'
              ? 'ℹ️ সুপার এডমিন ও কোম্পানি/অর্গানাইজেশন সরাসরি ফার্ম পরিচালনা করেন না — তারা অ্যাসাইন/মনিটর করেন।'
              : 'Super Admin & Company/Org do not directly run farms — they assign and monitor.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
