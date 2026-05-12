import { lazy, Suspense } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { PlatformRoleGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const AdminManagementTab = lazy(() =>
  import('@/components/admin/AdminManagementTab').then(m => ({ default: m.AdminManagementTab })),
);
const OrganizationsPanel = lazy(() =>
  import('@/components/admin/OrganizationsPanel').then(m => ({ default: m.OrganizationsPanel })),
);
const FarmsAdminPanel = lazy(() =>
  import('@/components/admin/FarmsAdminPanel').then(m => ({ default: m.FarmsAdminPanel })),
);
const WorkersAdminPanel = lazy(() =>
  import('@/components/admin/WorkersAdminPanel').then(m => ({ default: m.WorkersAdminPanel })),
);

type SubTab = 'admins' | 'orgs' | 'farms' | 'workers';

const CONFIG: Record<SubTab, {
  title: string;
  require: 'super_admin' | 'org_admin';
  render: (lang: 'bn' | 'en') => JSX.Element;
}> = {
  admins: {
    title: 'অ্যাডমিন ব্যবস্থাপনা',
    require: 'super_admin',
    render: (lang) => <AdminManagementTab language={lang} />,
  },
  orgs: {
    title: 'অর্গানাইজেশন ব্যবস্থাপনা',
    require: 'super_admin',
    render: () => <OrganizationsPanel />,
  },
  farms: {
    title: 'ফার্ম ব্যবস্থাপনা',
    require: 'org_admin',
    render: () => <FarmsAdminPanel />,
  },
  workers: {
    title: 'ওয়ার্কার ব্যবস্থাপনা',
    require: 'org_admin',
    render: () => <WorkersAdminPanel />,
  },
};

export default function AdminUserSubTabPage() {
  const { subtab } = useParams<{ subtab: string }>();

  if (!subtab || !(subtab in CONFIG)) {
    return <Navigate to="/admin?tab=users" replace />;
  }

  const cfg = CONFIG[subtab as SubTab];

  return (
    <PlatformRoleGuard require={cfg.require} fallbackPath="/admin">
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{cfg.title}</h1>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin?tab=users">
                <ArrowLeft className="w-4 h-4 mr-1" />
                অ্যাডমিন ড্যাশবোর্ড
              </Link>
            </Button>
          </div>
          <Suspense fallback={
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }>
            {cfg.render('bn')}
          </Suspense>
        </div>
      </div>
    </PlatformRoleGuard>
  );
}
