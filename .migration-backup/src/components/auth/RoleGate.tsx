import { ReactNode } from 'react';
import { useUserPermissions, AccessRole, UserPermissions } from '@/hooks/useUserPermissions';
import { useUserRole } from '@/hooks/useUserRole';

const ROLE_HIERARCHY: Record<AccessRole, number> = {
  viewer: 0,
  farmer: 1,
  admin: 2,
};

interface RoleGateProps {
  /** Minimum role required (viewer < farmer < admin). Owner always passes. */
  role?: AccessRole;
  /** Specific permission flag required. */
  permission?: keyof Omit<UserPermissions, 'role'>;
  /** Render this when access is denied (default: nothing). */
  fallback?: ReactNode;
  /** Render this while permissions are loading (default: nothing). */
  loading?: ReactNode;
  children: ReactNode;
}

/**
 * Inline conditional render based on the current user's role/permission.
 * Use for hiding buttons, sections or inputs from lower-privileged users.
 *
 *   <RoleGate role="farmer"><Button>...</Button></RoleGate>
 *   <RoleGate permission="canControlDevices" fallback={<ReadOnlyHint/>}>...</RoleGate>
 */
export function RoleGate({
  role,
  permission,
  fallback = null,
  loading = null,
  children,
}: RoleGateProps) {
  const { data: permissions, isLoading: permsLoading } = useUserPermissions();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  if (permsLoading || roleLoading) return <>{loading}</>;

  // Farm owner bypasses all role gates.
  if (userRole?.role === 'owner') return <>{children}</>;

  if (role) {
    const userLevel = ROLE_HIERARCHY[permissions?.role ?? 'viewer'];
    if (userLevel < ROLE_HIERARCHY[role]) return <>{fallback}</>;
  }

  if (permission) {
    if (!permissions?.[permission]) return <>{fallback}</>;
  }

  return <>{children}</>;
}
