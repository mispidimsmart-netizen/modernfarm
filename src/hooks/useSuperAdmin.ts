import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface AdminUser {
  id: string;
  phone: string | null;
  farm_name: string;
  avatar_url: string | null;
  created_at: string;
  sheds_count?: number;
  last_sensor_reading?: {
    temperature: number;
    humidity: number;
    ammonia: number;
    recorded_at: string;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalSheds: number;
  activeDevices: number;
  alertsToday: number;
}

export function useSuperAdmin() {
  const { user } = useAuth();

  const { data: isSuperAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking super admin status:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id,
  });

  const { data: allUsers, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Get sheds count per user
      const { data: sheds, error: shedsError } = await supabase
        .from('sheds')
        .select('user_id');

      if (shedsError) {
        console.error('Error fetching sheds:', shedsError);
      }

      // Count sheds per user
      const shedCounts: Record<string, number> = {};
      sheds?.forEach(shed => {
        shedCounts[shed.user_id] = (shedCounts[shed.user_id] || 0) + 1;
      });

      // Map profiles with shed counts
      const users: AdminUser[] = profiles.map(profile => ({
        id: profile.id,
        phone: profile.phone,
        farm_name: profile.farm_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        sheds_count: shedCounts[profile.id] || 0,
      }));

      return users;
    },
    enabled: isSuperAdmin === true,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total sheds
      const { count: shedsCount } = await supabase
        .from('sheds')
        .select('*', { count: 'exact', head: true });

      // Get active devices (online in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: devicesCount } = await supabase
        .from('device_health')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true)
        .gte('last_seen_at', fiveMinutesAgo);

      // Get alerts today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: alertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const adminStats: AdminStats = {
        totalUsers: usersCount || 0,
        totalSheds: shedsCount || 0,
        activeDevices: devicesCount || 0,
        alertsToday: alertsCount || 0,
      };

      return adminStats;
    },
    enabled: isSuperAdmin === true,
  });

  const { data: userDetails, isLoading: loadingUserDetails } = useQuery({
    queryKey: ['admin-user-details'],
    queryFn: async () => {
      // Get latest sensor readings per user
      const { data: sensorLogs, error } = await supabase
        .from('sensor_logs')
        .select('user_id, temperature, humidity, ammonia, timestamp')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching sensor logs:', error);
        return {};
      }

      // Get latest reading per user
      const latestReadings: Record<string, { temperature: number; humidity: number; ammonia: number; recorded_at: string }> = {};
      sensorLogs?.forEach(log => {
        if (!latestReadings[log.user_id]) {
          latestReadings[log.user_id] = {
            temperature: log.temperature,
            humidity: log.humidity,
            ammonia: log.ammonia,
            recorded_at: log.timestamp,
          };
        }
      });

      return latestReadings;
    },
    enabled: isSuperAdmin === true,
  });

  return {
    isSuperAdmin: isSuperAdmin === true,
    checkingAdmin,
    allUsers,
    loadingUsers,
    refetchUsers,
    stats,
    loadingStats,
    userDetails,
    loadingUserDetails,
  };
}
