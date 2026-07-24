import { useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Crown, Building2, ShieldAlert, Lock, UserCog } from 'lucide-react';
import { AdminManagementTab } from './AdminManagementTab';
import { OrganizationsPanel } from './OrganizationsPanel';
import { UnifiedRoleEditorPanel } from './UnifiedRoleEditorPanel';
import { usePlatformRole, type PlatformRole } from '@/hooks/usePlatformRole';
import { Card, CardContent } from '@/components/ui/card';

interface Props { language: 'bn' | 'en'; }

// Simplified: 3 tabs instead of 5. Farms & Workers are now inside the
// Organizations master-detail view.
type SubTabKey = 'orgs' | 'roles' | 'admins';

const ACCESS: Record<SubTabKey, PlatformRole[]> = {
  orgs: ['super_admin', 'org_owner', 'org_admin'],
  roles: ['super_admin'],
  admins: ['super_admin'],
};

const TAB_LABEL: Record<SubTabKey, string> = {
  orgs: 'অর্গানাইজেশন ও ফার্ম',
  roles: 'ইউজার রোল',
  admins: 'সুপার এডমিন',
};

// Legacy sub-tab keys that used to exist — redirect them into the new orgs tab
const LEGACY_TABS = new Set(['farms', 'workers']);

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

export function UserManagementTab({ language: _language }: Props) {
  const { data: role, isLoading } = usePlatformRole();

  const can = useMemo(() => {
    const userRole: PlatformRole = role?.topRole ?? 'user';
    return (key: SubTabKey) => ACCESS[key].includes(userRole);
  }, [role?.topRole]);

  const firstAllowed: SubTabKey = useMemo(() => {
    const order: SubTabKey[] = ['orgs', 'roles', 'admins'];
    return order.find(can) ?? 'orgs';
  }, [can]);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlTab = searchParams.get('subtab');

  // Redirect legacy subtabs (?subtab=farms|workers) into the new orgs view
  useEffect(() => {
    if (urlTab && LEGACY_TABS.has(urlTab)) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'users');
      next.set('subtab', 'orgs');
      setSearchParams(next, { replace: true });
    }
  }, [urlTab, searchParams, setSearchParams]);

  const active: SubTabKey = (urlTab && (['orgs', 'roles', 'admins'] as SubTabKey[]).includes(urlTab as SubTabKey))
    ? (urlTab as SubTabKey)
    : firstAllowed;

  useEffect(() => {
    if (!role) return;
    if (urlTab && ['orgs', 'roles', 'admins'].includes(urlTab) && !can(urlTab as SubTabKey)) {
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
      <TabsList className="bg-slate-900/80 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-1 p-1.5 rounded-xl shadow-lg h-auto w-full">
        {renderTrigger('orgs', Building2, 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg')}
        {renderTrigger('roles', UserCog, 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg')}
        {renderTrigger('admins', Crown, 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-lg')}
      </TabsList>

      <TabsContent value="orgs" className="mt-4">
        {can('orgs') ? (
          <>
            <div className="mb-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-400/20 text-xs text-emerald-200">
              <strong>টিপ:</strong> বাঁদিকে অর্গানাইজেশন বেছে নিলে ডানপাশে তার সদস্য ও ফার্ম দেখতে পাবেন। ফার্ম যোগ, অন্য অর্গে সরানো বা বাদ দেওয়া — সবই এখান থেকে।
            </div>
            <OrganizationsPanel />
          </>
        ) : <DeniedCard tab="orgs" />}
      </TabsContent>
      <TabsContent value="roles" className="mt-4">
        {can('roles') ? <UnifiedRoleEditorPanel /> : <DeniedCard tab="roles" />}
      </TabsContent>
      <TabsContent value="admins" className="mt-4">
        {can('admins') ? <AdminManagementTab language={_language} /> : <DeniedCard tab="admins" />}
      </TabsContent>
    </Tabs>
  );
}
