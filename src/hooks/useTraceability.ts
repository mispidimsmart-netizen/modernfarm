import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DataTraceRow {
  deviceId: string;
  source: string;
  shedId: string | null;
  readings: number;
  firstAt: string;
  lastAt: string;
  avgTemp: number | null;
  avgHumidity: number | null;
}

/** ১নং — ডেটা ট্রেসিবিলিটি: কোন ডিভাইস/সোর্স থেকে কত রিডিং এসেছে */
export function useDataTrace(farmId: string | null, days = 7) {
  return useQuery({
    queryKey: ['data-trace', farmId, days],
    enabled: !!farmId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('device_id, sensor_source, shed_id, recorded_at, temperature, humidity')
        .eq('farm_id', farmId!)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false })
        .limit(5000);
      if (error) throw error;

      const map = new Map<string, DataTraceRow & { _t: number[]; _h: number[] }>();
      for (const r of data ?? []) {
        const deviceId = r.device_id ?? 'unknown';
        const source = r.sensor_source ?? 'unknown';
        const key = `${deviceId}|${source}|${r.shed_id ?? ''}`;
        let row = map.get(key);
        if (!row) {
          row = {
            deviceId, source, shedId: r.shed_id ?? null,
            readings: 0, firstAt: r.recorded_at, lastAt: r.recorded_at,
            avgTemp: null, avgHumidity: null, _t: [], _h: [],
          };
          map.set(key, row);
        }
        row.readings += 1;
        if (r.recorded_at < row.firstAt) row.firstAt = r.recorded_at;
        if (r.recorded_at > row.lastAt) row.lastAt = r.recorded_at;
        if (typeof r.temperature === 'number') row._t.push(r.temperature);
        if (typeof r.humidity === 'number') row._h.push(r.humidity);
      }
      const avg = (a: number[]) => (a.length ? Math.round((a.reduce((s, v) => s + v, 0) / a.length) * 10) / 10 : null);
      return Array.from(map.values())
        .map(({ _t, _h, ...rest }) => ({ ...rest, avgTemp: avg(_t), avgHumidity: avg(_h) }))
        .sort((a, b) => b.readings - a.readings);
    },
  });
}

export interface RuntimeRow {
  deviceName: string;
  onCount: number;
  totalSeconds: number;
  manualCount: number;
  autoCount: number;
  lastAt: string | null;
}

export interface RuntimeEvent {
  deviceName: string;
  command: string;
  value: string;
  mode: string;
  at: string;
  userId: string | null;
}

/** ২নং — অপারেশন ট্রেসিবিলিটি: device_commands থেকে ON→OFF জোড়া মিলিয়ে রানটাইম */
export function useOperationTrace(farmId: string | null, days = 7) {
  return useQuery({
    queryKey: ['operation-trace', farmId, days],
    enabled: !!farmId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from('device_commands')
        .select('device_name, command_type, command_value, created_at, user_id')
        .eq('farm_id', farmId!)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(5000);
      if (error) throw error;

      const events: RuntimeEvent[] = (data ?? []).map((c) => ({
        deviceName: c.device_name ?? 'unknown',
        command: c.command_type ?? '',
        value: String(c.command_value ?? ''),
        mode: c.user_id ? 'manual' : 'auto',
        at: c.created_at,
        userId: c.user_id ?? null,
      }));

      const isOn = (v: string) => ['on', 'true', '1'].includes(v.toLowerCase());
      const isOff = (v: string) => ['off', 'false', '0'].includes(v.toLowerCase());

      const rows = new Map<string, RuntimeRow>();
      const openAt = new Map<string, string>();
      for (const e of events) {
        let row = rows.get(e.deviceName);
        if (!row) {
          row = { deviceName: e.deviceName, onCount: 0, totalSeconds: 0, manualCount: 0, autoCount: 0, lastAt: null };
          rows.set(e.deviceName, row);
        }
        row.lastAt = e.at;
        if (e.mode === 'manual') row.manualCount += 1; else row.autoCount += 1;
        if (isOn(e.value)) {
          row.onCount += 1;
          if (!openAt.has(e.deviceName)) openAt.set(e.deviceName, e.at);
        } else if (isOff(e.value)) {
          const start = openAt.get(e.deviceName);
          if (start) {
            row.totalSeconds += Math.max(0, Math.round((new Date(e.at).getTime() - new Date(start).getTime()) / 1000));
            openAt.delete(e.deviceName);
          }
        }
      }
      // এখনও চালু আছে এমন ডিভাইসের সময় এখন পর্যন্ত ধরা
      for (const [device, start] of openAt) {
        const row = rows.get(device);
        if (row) row.totalSeconds += Math.max(0, Math.round((Date.now() - new Date(start).getTime()) / 1000));
      }

      return {
        rows: Array.from(rows.values()).sort((a, b) => b.totalSeconds - a.totalSeconds),
        events: events.slice(-1000).reverse(),
      };
    },
  });
}

export interface BatchPage {
  id: string;
  batch_id: string;
  batch_kind: 'layer' | 'broiler';
  public_slug: string;
  is_published: boolean;
  batchName: string;
  breed: string | null;
  startDate: string | null;
}

/** ৩নং — ব্যাচ/QR ট্রেসিবিলিটি */
export function useBatchTracePages(farmId: string | null) {
  return useQuery({
    queryKey: ['batch-trace-pages', farmId],
    enabled: !!farmId,
    queryFn: async (): Promise<BatchPage[]> => {
      const { data: pages, error } = await supabase
        .from('batch_public_pages')
        .select('id, batch_id, batch_kind, public_slug, is_published')
        .eq('farm_id', farmId!);
      if (error) throw error;
      if (!pages?.length) return [];

      const [layers, broilers] = await Promise.all([
        supabase.from('layer_batches').select('id, batch_name, batch_name_bn, breed, start_date').eq('farm_id', farmId!),
        supabase.from('broiler_batches').select('id, batch_name, batch_name_bn, breed, start_date').eq('farm_id', farmId!),
      ]);
      const info = new Map<string, { name: string; breed: string | null; start: string | null }>();
      for (const b of [...(layers.data ?? []), ...(broilers.data ?? [])]) {
        info.set(b.id, { name: b.batch_name_bn || b.batch_name, breed: b.breed ?? null, start: b.start_date ?? null });
      }
      return pages.map((p) => ({
        ...(p as any),
        batchName: info.get(p.batch_id)?.name ?? p.batch_id.slice(0, 8),
        breed: info.get(p.batch_id)?.breed ?? null,
        startDate: info.get(p.batch_id)?.start ?? null,
      }));
    },
  });
}
