import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EdgeFnStat1h {
  function_name: string;
  request_count: number;
  error_5xx: number;
  error_4xx: number;
  unauthorized: number;
  rate_limited: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
}

export function useEdgeFunctionStats1h() {
  return useQuery({
    queryKey: ['edge_function_stats_1h'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('edge_function_stats_1h')
        .select('*');
      if (error) throw error;
      return (data || []) as EdgeFnStat1h[];
    },
    refetchInterval: 30_000,
  });
}

export function useRecentEdgeErrors(limit = 50) {
  return useQuery({
    queryKey: ['recent_edge_errors', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edge_request_log')
        .select('id, created_at, function_name, path, status_code, duration_ms, error_code, error_message, device_token_id, farm_id')
        .gte('status_code', 400)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30_000,
  });
}

export interface DeviceMetricRow {
  device_token_id: string;
  farm_id: string | null;
  bucket_hour: string;
  sync_count: number;
  signature_failures: number;
  nonce_reuse_count: number;
  rate_limited_count: number;
  error_count: number;
  total_latency_ms: number;
  max_latency_ms: number;
  sensor_gap_seconds_max: number;
  restart_count: number;
  last_sync_at: string | null;
}

/** Last 24h metrics for a specific farm (farmer-facing) */
export function useFarmDeviceMetrics24h(farmId: string | null | undefined) {
  return useQuery({
    queryKey: ['device_health_metrics_24h', farmId],
    enabled: !!farmId,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('device_health_metrics')
        .select('*')
        .eq('farm_id', farmId!)
        .gte('bucket_hour', since)
        .order('bucket_hour', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as DeviceMetricRow[];
    },
    refetchInterval: 60_000,
  });
}
