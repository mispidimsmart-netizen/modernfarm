import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFarmContext } from '@/context/FarmContext';
import { toast } from 'sonner';

export interface DeliveryRow {
  id: string;
  channel: string;
  status: string;
  recipient: string | null;
  error_message: string | null;
  sent_at: string | null;
  is_escalation: boolean;
}

export interface AlertHistoryRow {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  message_bn: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  farm_id: string;
  deliveries: DeliveryRow[];
}

export interface HistoryFilters {
  severity?: string; // 'all' | 'low' | 'medium' | 'high' | 'critical'
  acknowledged?: 'all' | 'yes' | 'no';
  channelStatus?: 'all' | 'failed' | 'sent' | 'skipped';
  hours?: number;
}

export function useAlertDeliveryHistory(filters: HistoryFilters = {}) {
  const { selectedFarmId: activeFarmId } = useFarmContext();
  const hours = filters.hours ?? 168; // 7 days default

  return useQuery({
    queryKey: ['alert-delivery-history', activeFarmId, filters],
    enabled: !!activeFarmId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<AlertHistoryRow[]> => {
      if (!activeFarmId) return [];
      const since = new Date(Date.now() - hours * 3600_000).toISOString();

      let q = supabase
        .from('alerts')
        .select('id, alert_type, severity, message, message_bn, acknowledged, acknowledged_at, created_at, farm_id')
        .eq('farm_id', activeFarmId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.severity && filters.severity !== 'all') {
        q = q.eq('severity', filters.severity as any);
      }
      if (filters.acknowledged === 'yes') q = q.eq('acknowledged', true);
      if (filters.acknowledged === 'no') q = q.eq('acknowledged', false);

      const { data: alerts, error } = await q;
      if (error) throw error;
      const ids = (alerts ?? []).map((a) => a.id);
      if (ids.length === 0) return [];

      const { data: deliveries } = await supabase
        .from('alert_deliveries')
        .select('id, alert_id, channel, status, recipient, error_message, sent_at, is_escalation')
        .in('alert_id', ids);

      const byAlert = new Map<string, DeliveryRow[]>();
      (deliveries ?? []).forEach((d: any) => {
        const arr = byAlert.get(d.alert_id) ?? [];
        arr.push(d);
        byAlert.set(d.alert_id, arr);
      });

      let rows: AlertHistoryRow[] = (alerts ?? []).map((a: any) => ({
        ...a,
        deliveries: byAlert.get(a.id) ?? [],
      }));

      if (filters.channelStatus && filters.channelStatus !== 'all') {
        rows = rows.filter((r) =>
          r.deliveries.some((d) =>
            filters.channelStatus === 'failed'
              ? d.status === 'failed'
              : filters.channelStatus === 'sent'
              ? d.status === 'sent'
              : d.status.startsWith('skipped')
          )
        );
      }
      return rows;
    },
  });
}

export function useResendAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase.functions.invoke('alert-dispatcher', {
        body: { alert_id: alertId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('পুনরায় পাঠানো হয়েছে');
      qc.invalidateQueries({ queryKey: ['alert-delivery-history'] });
    },
    onError: (e: any) => {
      toast.error('পুনরায় পাঠানো যায়নি', { description: e?.message });
    },
  });
}
