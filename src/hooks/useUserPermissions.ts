import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type AccessRole = 'viewer' | 'farmer' | 'admin';

export interface UserPermissions {
  role: AccessRole;
  canViewDashboard: boolean;
  canViewAlerts: boolean;
  canControlDevices: boolean;
  canTemporaryControl: boolean;
  canFullControl: boolean;
  canEditFarmSettings: boolean;
  canEditAdvancedSettings: boolean;
  canEditDeviceSettings: boolean;
  canUpdateFirmware: boolean;
  canCalibrate: boolean;
  canEditThresholds: boolean;
  canViewLogs: boolean;
  canManageUsers: boolean;
  canDisableAutomation: boolean;
}

const ROLE_PERMISSIONS: Record<AccessRole, Omit<UserPermissions, 'role'>> = {
  viewer: {
    canViewDashboard: true,
    canViewAlerts: true,
    canControlDevices: false,
    canTemporaryControl: false,
    canFullControl: false,
    canEditFarmSettings: false,
    canEditAdvancedSettings: false,
    canEditDeviceSettings: false,
    canUpdateFirmware: false,
    canCalibrate: false,
    canEditThresholds: false,
    canViewLogs: false,
    canManageUsers: false,
    canDisableAutomation: false,
  },
  farmer: {
    canViewDashboard: true,
    canViewAlerts: true,
    canControlDevices: true,
    canTemporaryControl: true,
    canFullControl: false,
    canEditFarmSettings: true,
    canEditAdvancedSettings: false,
    canEditDeviceSettings: false,
    canUpdateFirmware: false,
    canCalibrate: false,
    canEditThresholds: false,
    canViewLogs: false,
    canManageUsers: false,
    canDisableAutomation: false,
  },
  admin: {
    canViewDashboard: true,
    canViewAlerts: true,
    canControlDevices: true,
    canTemporaryControl: true,
    canFullControl: true,
    canEditFarmSettings: true,
    canEditAdvancedSettings: true,
    canEditDeviceSettings: true,
    canUpdateFirmware: true,
    canCalibrate: true,
    canEditThresholds: true,
    canViewLogs: true,
    canManageUsers: true,
    canDisableAutomation: true,
  },
};

export function useUserPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_permissions', user?.id],
    queryFn: async (): Promise<UserPermissions> => {
      if (!user) {
        return { role: 'viewer', ...ROLE_PERMISSIONS.viewer };
      }

      // Call the database function to get user's access role
      const { data, error } = await supabase
        .rpc('get_user_access_role', { _user_id: user.id });

      if (error) {
        console.error('Error fetching user role:', error);
        // Default to farmer for authenticated users
        return { role: 'farmer', ...ROLE_PERMISSIONS.farmer };
      }

      const role = (data as AccessRole) || 'farmer';
      return { role, ...ROLE_PERMISSIONS[role] };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useIsAdmin() {
  const { data } = useUserPermissions();
  return data?.role === 'admin';
}

export function useIsFarmer() {
  const { data } = useUserPermissions();
  return data?.role === 'farmer' || data?.role === 'admin';
}

export function useIsViewer() {
  const { data } = useUserPermissions();
  return data?.role === 'viewer';
}

export function useCanAccess(permission: keyof Omit<UserPermissions, 'role'>) {
  const { data } = useUserPermissions();
  return data?.[permission] ?? false;
}
