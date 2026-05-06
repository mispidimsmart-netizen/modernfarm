import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CommandLogStatus = 'pending' | 'sent' | 'acked' | 'failed' | 'expired';

export interface DeviceCommandLogFilters {
  farmId?: string;
  shedId?: string;
  deviceName?: string;
  status?: CommandLogStatus | 'all';
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DeviceCommandLogEntry {
  id: string;
  command_id: string;
  command_type: string;
  command_value: boolean;
  device_name: string;
  status: string;
  source: string | null;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  user_id: string;
  farm_id: string | null;
  shed_id: string | null;
  created_at: string;
  sent_at: string | null;
  acked_at: string | null;
  expired_at: string | null;
}

const PAGE_SIZE = 200;

export function useDeviceCommandLog(filters: DeviceCommandLogFilters = {}) {
  return useQuery({
    queryKey: ['device-command-log', filters],
    queryFn: async (): Promise<DeviceCommandLogEntry[]> => {
      let query = supabase
        .from('device_command_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (filters.farmId) query = query.eq('farm_id', filters.farmId);
      if (filters.shedId) query = query.eq('shed_id', filters.shedId);
      if (filters.deviceName) query = query.eq('device_name', filters.deviceName);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

      const { data, error } = await query;
      if (error) {
        console.error('[useDeviceCommandLog]', error);
        throw error;
      }

      const rows = (data || []) as DeviceCommandLogEntry[];

      // Client-side text search across command_type, device_name, command_id
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        return rows.filter(
          r =>
            r.command_type?.toLowerCase().includes(q) ||
            r.device_name?.toLowerCase().includes(q) ||
            r.command_id?.toLowerCase().includes(q),
        );
      }

      return rows;
    },
    staleTime: 30 * 1000,
  });
}

/** Returns the distinct device names from the command log for a farm (filter dropdown). */
export function useDeviceCommandDevices(farmId?: string) {
  return useQuery({
    queryKey: ['device-command-log-devices', farmId],
    queryFn: async (): Promise<string[]> => {
      let query = supabase
        .from('device_command_log')
        .select('device_name')
        .order('created_at', { ascending: false })
        .limit(500);
      if (farmId) query = query.eq('farm_id', farmId);
      const { data, error } = await query;
      if (error) throw error;
      const set = new Set<string>();
      (data || []).forEach((r: any) => r.device_name && set.add(r.device_name));
      return Array.from(set).sort();
    },
    staleTime: 60 * 1000,
  });
}
