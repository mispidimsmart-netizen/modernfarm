import { useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Crown, Building2, Tractor, HardHat, ShieldAlert, Lock, UserCog } from 'lucide-react';
import { AdminManagementTab } from './AdminManagementTab';
import { OrganizationsPanel } from './OrganizationsPanel';
import { FarmsAdminPanel } from './FarmsAdminPanel';
import { WorkersAdminPanel } from './WorkersAdminPanel';
import { UnifiedRoleEditorPanel } from './UnifiedRoleEditorPanel';
import { usePlatformRole, type PlatformRole } from '@/hooks/usePlatformRole';
import { Card, CardContent } from '@/components/ui/card';

interface Props { language: 'bn' | 'en'; }

type SubTabKey = 'roles' | 'admins' | 'orgs' | 'farms' | 'workers';

// Role-based access matrix per sub-tab. super_admin always implied.
const ACCESS: Record<SubTabKey, PlatformRole[]> = {
  roles: ['super_admin'],
  admins: ['super_admin'],
  orgs: ['super_admin'],
  farms: ['super_admin', 'org_owner', 'org_admin'],
  workers: ['super_admin', 'org_owner', 'org_admin'],
};

const TAB_LABEL: Record<SubTabKey, string> = {
  roles: 'রোল',
  admins: 'অ্যাডমিন',
  orgs: 'অর্গানাইজেশন',
  farms: 'ফার্ম',
  workers: 'ওয়ার্কার',
};

function DeniedCard({ tab }: { tab: SubTabKey }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="pt-6 text-center space-y-3">
        <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-foreground">অ্যাক্সেস নেই</h3>
        <p className="text-sm text-muted-foreground">
          "{TAB_LABEL[tab]}" ট্যাবটি দেখার অনুমতি আপনার রোলে নেই।
        </p>
      </CardContent>
    </Card>
  );
}

export function UserManagementTab({ language }: Props) {
  const { data: role, isLoading } = usePlatformRole();

  const can = useMemo(() => {
    const userRole: PlatformRole = role?.topRole ?? 'user';
    return (key: SubTabKey) => ACCESS[key].includes(userRole);
  }, [role?.topRole]);

  // Pick first allowed tab as default
  const firstAllowed: SubTabKey = useMemo(() => {
    const order: SubTabKey[] = ['admins', 'orgs', 'farms', 'workers'];
    return order.find(can) ?? 'admins';
  }, [can]);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlTab = searchParams.get('subtab') as SubTabKey | null;
  const active: SubTabKey = (urlTab && (['admins','orgs','farms','workers'] as SubTabKey[]).includes(urlTab))
    ? urlTab
    : firstAllowed;

  // If URL points to a sub-tab the user can't access, redirect to a deep-link guarded route
  // so the route-level PlatformRoleGuard handles the denial uniformly.
  useEffect(() => {
    if (!role) return;
    if (urlTab && !can(urlTab)) {
      navigate(`/admin/users/${urlTab}`, { replace: true });
    }
  }, [urlTab, role, can, navigate]);

  const setActive = (v: SubTabKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'users');
    next.set('subtab', v);
    setSearchParams(next, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const renderTrigger = (
    key: SubTabKey,
    Icon: typeof Crown,
    activeClasses: string,
  ) => {
    const allowed = can(key);
    return (
      <TabsTrigger
        value={key}
        disabled={!allowed}
        title={allowed ? undefined : 'এই ট্যাবে অ্যাক্সেস নেই'}
        className={`${activeClasses} text-slate-400 hover:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {allowed ? <Icon className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
        {TAB_LABEL[key]}
      </TabsTrigger>
    );
  };

  return (
    <Tabs value={active} onValueChange={(v) => setActive(v as SubTabKey)} className="w-full">
      <TabsList className="bg-slate-900/80 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-1 p-1.5 rounded-xl shadow-lg h-auto w-full">
        {renderTrigger('admins', Crown, 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-lg')}
        {renderTrigger('orgs', Building2, 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg')}
        {renderTrigger('farms', Tractor, 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg')}
        {renderTrigger('workers', HardHat, 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg')}
      </TabsList>

      <TabsContent value="admins" className="mt-4">
        {can('admins') ? <AdminManagementTab language={language} /> : <DeniedCard tab="admins" />}
      </TabsContent>
      <TabsContent value="orgs" className="mt-4">
        {can('orgs') ? <OrganizationsPanel /> : <DeniedCard tab="orgs" />}
      </TabsContent>
      <TabsContent value="farms" className="mt-4">
        {can('farms') ? <FarmsAdminPanel /> : <DeniedCard tab="farms" />}
      </TabsContent>
      <TabsContent value="workers" className="mt-4">
        {can('workers') ? <WorkersAdminPanel /> : <DeniedCard tab="workers" />}
      </TabsContent>
    </Tabs>
  );
}
