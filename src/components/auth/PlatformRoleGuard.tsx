import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  /** 'super_admin' = only Nexiot super admins, 'org_admin' = org owner OR admin */
  require: 'super_admin' | 'org_admin';
  fallbackPath?: string;
}

/**
 * Platform-level guard. Distinct from RoleProtectedRoute (farm-level roles).
 *  - super_admin → only `is_super_admin = true`
 *  - org_admin   → `is_super_admin` OR org_owner/org_admin in any org
 */
export function PlatformRoleGuard({ children, require, fallbackPath = '/' }: Props) {
  const { data, isLoading } = usePlatformRole();
  const { logAccessDenied } = useAuditLog();
  const location = useLocation();
  const loggedRef = useRef<string | null>(null);

  let allowed = false;
  if (data) {
    if (require === 'super_admin') {
      allowed = data.isSuperAdmin;
    } else if (require === 'org_admin') {
      allowed = data.isSuperAdmin || data.isOrgOwner || data.isOrgAdmin;
    }
  }
  const denied = !isLoading && !!data && !allowed;

  useEffect(() => {
    if (!denied) return;
    const key = `${location.pathname}|${require}`;
    if (loggedRef.current === key) return;
    loggedRef.current = key;
    logAccessDenied(
      location.pathname + location.search,
      data?.topRole || 'user',
      require,
    );
  }, [denied, location.pathname, location.search, require, data?.topRole, logAccessDenied]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }


  if (!allowed) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md w-full border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-center space-y-3">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">অ্যাক্সেস নেই</h2>
            <p className="text-sm text-muted-foreground">
              {require === 'super_admin'
                ? 'এই পেজটি শুধুমাত্র Nexiot Labs সুপার অ্যাডমিনদের জন্য।'
                : 'এই পেজটি শুধুমাত্র কোম্পানির মালিক বা অ্যাডমিনদের জন্য।'}
            </p>
            <Button asChild variant="outline">
              <Link to={fallbackPath}>ড্যাশবোর্ডে ফিরুন</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
