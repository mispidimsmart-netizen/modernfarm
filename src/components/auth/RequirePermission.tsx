import { ReactNode } from 'react';
import { useUserPermissions, AccessRole, UserPermissions } from '@/hooks/useUserPermissions';
import { useAuth } from '@/context/AuthContext';

interface RequirePermissionProps {
  children: ReactNode;
  permission?: keyof Omit<UserPermissions, 'role'>;
  role?: AccessRole;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user's role or permission.
 * If user doesn't have required access, renders fallback or nothing.
 */
export function RequirePermission({
  children,
  permission,
  role,
  fallback = null,
}: RequirePermissionProps) {
  const { data: permissions, isLoading } = useUserPermissions();
  const { language } = useAuth();

  if (isLoading) {
    return null;
  }

  // Check role requirement
  if (role) {
    const roleHierarchy: Record<AccessRole, number> = {
      viewer: 0,
      farmer: 1,
      admin: 2,
    };
    
    const userRoleLevel = roleHierarchy[permissions?.role || 'viewer'];
    const requiredRoleLevel = roleHierarchy[role];
    
    if (userRoleLevel < requiredRoleLevel) {
      return <>{fallback}</>;
    }
  }

  // Check specific permission
  if (permission && permissions) {
    if (!permissions[permission]) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permission: keyof Omit<UserPermissions, 'role'>): boolean {
  const { data: permissions } = useUserPermissions();
  return permissions?.[permission] ?? false;
}

/**
 * Hook to check if user has minimum required role
 */
export function useHasRole(requiredRole: AccessRole): boolean {
  const { data: permissions } = useUserPermissions();
  
  const roleHierarchy: Record<AccessRole, number> = {
    viewer: 0,
    farmer: 1,
    admin: 2,
  };
  
  const userRoleLevel = roleHierarchy[permissions?.role || 'viewer'];
  const requiredRoleLevel = roleHierarchy[requiredRole];
  
  return userRoleLevel >= requiredRoleLevel;
}
