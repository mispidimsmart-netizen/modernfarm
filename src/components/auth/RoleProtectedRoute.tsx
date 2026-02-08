import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUserPermissions, AccessRole } from '@/hooks/useUserPermissions';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AccessRole;
  requiredPermission?: keyof ReturnType<typeof useUserPermissions>['data'];
  fallbackPath?: string;
}

export function RoleProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallbackPath = '/',
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading, language } = useAuth();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions();

  // Loading state
  if (authLoading || permissionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">
            {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role requirement
  if (requiredRole) {
    const roleHierarchy: Record<AccessRole, number> = {
      viewer: 0,
      farmer: 1,
      admin: 2,
    };
    
    const userRoleLevel = roleHierarchy[permissions?.role || 'viewer'];
    const requiredRoleLevel = roleHierarchy[requiredRole];
    
    if (userRoleLevel < requiredRoleLevel) {
      return (
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
          <Card className="max-w-md w-full border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {language === 'bn' ? 'অ্যাক্সেস অস্বীকৃত' : 'Access Denied'}
              </h2>
              <p className="text-muted-foreground mb-4">
                {language === 'bn' 
                  ? `এই পৃষ্ঠা দেখতে ${requiredRole === 'admin' ? 'অ্যাডমিন' : 'ফার্মার'} অনুমতি প্রয়োজন`
                  : `${requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)} permission required to view this page`}
              </p>
              <a 
                href={fallbackPath}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {language === 'bn' ? 'হোমে ফিরে যান' : 'Go Home'}
              </a>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Check specific permission requirement
  if (requiredPermission && permissions) {
    const hasPermission = permissions[requiredPermission as keyof typeof permissions];
    if (!hasPermission) {
      return (
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
          <Card className="max-w-md w-full border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {language === 'bn' ? 'অনুমতি নেই' : 'Permission Denied'}
              </h2>
              <p className="text-muted-foreground mb-4">
                {language === 'bn' 
                  ? 'এই ফিচার ব্যবহার করার অনুমতি নেই'
                  : 'You do not have permission to use this feature'}
              </p>
              <a 
                href={fallbackPath}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {language === 'bn' ? 'হোমে ফিরে যান' : 'Go Home'}
              </a>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Simple access denied component for inline use
export function AccessDenied({ 
  message,
  showBackLink = true,
}: { 
  message?: string;
  showBackLink?: boolean;
}) {
  const { language } = useAuth();
  
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-foreground">
              {language === 'bn' ? 'অ্যাক্সেস অস্বীকৃত' : 'Access Denied'}
            </p>
            <p className="text-sm text-muted-foreground">
              {message || (language === 'bn' 
                ? 'এই ফিচার ব্যবহার করার অনুমতি নেই'
                : 'You do not have permission to use this feature')}
            </p>
          </div>
        </div>
        {showBackLink && (
          <a 
            href="/"
            className="mt-3 inline-flex items-center text-sm text-primary hover:underline"
          >
            {language === 'bn' ? '← হোমে ফিরুন' : '← Back to Home'}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
