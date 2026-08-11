import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DEVICE_META, ALL_DEVICES,
  statusFromSensors, buildDeviceTimeline, getDeviceStateAt,
  type DeviceKey,
} from '@/lib/sensorDeviceImpact';

export type Hours = 6 | 12 | 24 | 72 | 168;

interface Params {
  userId?: string;
  selectedFarmId?: string | null;
  hours: Hours;
  language: string;
  selectedDevices: Set<DeviceKey>;
}

export function useSensorDeviceImpact({ userId, selectedFarmId, hours, language, selectedDevices }: Params) {
  const since = useMemo(() => new Date(Date.now() - hours * 3600000).toISOString(), [hours]);

  const { data: sensors = [], isLoading: loadingSensors } = useQuery({
    queryKey: ['impact-sensors', userId, selectedFarmId, hours],
    queryFn: async () => {
      if (!userId) return [];
      let q = supabase
        .from('sensor_readings')
        .select('recorded_at, temperature, humidity, ammonia, water_usage, light_lux')
        .eq('user_id', userId)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true })
        .limit(2000);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: deviceCommands = [] } = useQuery({
    queryKey: ['impact-device-cmds', userId, selectedFarmId, hours],
    queryFn: async () => {
      if (!userId) return [];

      let q1 = supabase
        .from('device_commands')
        .select('command_type, command_value, executed_at, created_at, executed')
        .eq('user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(2000);
      if (selectedFarmId) q1 = q1.eq('farm_id', selectedFarmId);

      let q2 = supabase
        .from('device_command_log')
        .select('command_type, command_value, sent_at, acked_at, created_at, status')
        .eq('user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(2000);
      if (selectedFarmId) q2 = q2.eq('farm_id', selectedFarmId);

      const [r1, r2] = await Promise.all([q1, q2]);
      if (r1.error) throw r1.error;

      const fromCommands = (r1.data || []).map((d: any) => ({
        command_type: d.command_type,
        command_value: d.command_value,
        created_at: d.created_at,
        status: d.executed ? 'executed' : 'pending',
      }));

      const fromLog = (r2.data || []).map((d: any) => ({
        command_type: d.command_type,
        command_value: d.command_value,
        created_at: d.created_at,
        status: d.status || 'unknown',
      }));

      const seen = new Set<string>();
      const merged: any[] = [];
      for (const cmd of [...fromCommands, ...fromLog]) {
        const key = `${cmd.command_type}_${cmd.created_at}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(cmd);
        }
      }
      return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    enabled: !!userId,
  });

  const deviceTimeline = useMemo(() => buildDeviceTimeline(deviceCommands), [deviceCommands]);

  const correlated = useMemo(() => {
    return sensors.map((s: any) => {
      const t = Number(s.temperature) || 0;
      const h = Number(s.humidity) || 0;
      const nh3 = Number(s.ammonia) || 0;
      const water = Number(s.water_usage) || 0;
      const lux = s.light_lux !== null && s.light_lux !== undefined ? Number(s.light_lux) : 0;
      const sensorTime = new Date(s.recorded_at).getTime();

      const deviceState: Record<string, boolean> = {};
      ALL_DEVICES.forEach((d) => {
        deviceState[d] = getDeviceStateAt(deviceTimeline[d] || [], sensorTime);
      });

      const hsi = Number((t + 0.36 * h).toFixed(1));
      const st = statusFromSensors(t, h, nh3, hsi);
      const onOff = (b: boolean) => (b ? (language === 'bn' ? 'চালু' : 'ON') : (language === 'bn' ? 'বন্ধ' : 'OFF'));

      return {
        ts: sensorTime,
        time: new Date(s.recorded_at).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US'),
        timeShort: new Date(s.recorded_at).toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        temperature: t,
        humidity: h,
        ammonia: nh3,
        water_usage: water,
        light_lux: lux,
        hsi,
        deviceState,
        fan: onOff(deviceState.fan),
        heater: onOff(deviceState.heater),
        fogger: onOff(deviceState.fogger),
        sprinkler: onOff(deviceState.sprinkler),
        ceiling_fan: onOff(deviceState.ceiling_fan),
        light: onOff(deviceState.light),
        alarm: onOff(deviceState.alarm),
        status: st.en,
        status_bn: st.bn,
        reason_bn: st.reason,
      };
    });
  }, [sensors, deviceTimeline, language]);

  const runtime = useMemo(() => {
    const totals: Record<string, number> = {};
    const nowMs = Date.now();

    ALL_DEVICES.forEach((d) => {
      let total = 0;
      const tl = deviceTimeline[d] || [];
      let lastOnTs: number | null = null;

      for (const entry of tl) {
        if (entry.on) {
          if (lastOnTs === null) lastOnTs = entry.ts;
        } else if (lastOnTs !== null) {
          total += entry.ts - lastOnTs;
          lastOnTs = null;
        }
      }
      if (lastOnTs !== null) total += nowMs - lastOnTs;
      totals[d] = total;
    });

    return ALL_DEVICES
      .filter((d) => selectedDevices.has(d))
      .map((d) => ({
        device: d,
        label: language === 'bn' ? DEVICE_META[d].bn : DEVICE_META[d].en,
        minutes: Math.round(totals[d] / 60000),
        color: DEVICE_META[d].color,
      }));
  }, [deviceTimeline, selectedDevices, language]);

  const hourlySummary = useMemo(() => {
    if (sensors.length === 0) return [];
    const buckets: Record<string, { temps: number[]; hums: number[]; nh3s: number[]; waters: number[]; luxes: number[]; devices: Record<string, number> }> = {};

    for (const r of correlated) {
      const d = new Date(r.ts);
      const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
      if (!buckets[hourKey]) {
        buckets[hourKey] = { temps: [], hums: [], nh3s: [], waters: [], luxes: [], devices: {} };
      }
      buckets[hourKey].temps.push(r.temperature);
      buckets[hourKey].hums.push(r.humidity);
      buckets[hourKey].nh3s.push(r.ammonia);
      buckets[hourKey].waters.push(r.water_usage);
      buckets[hourKey].luxes.push(r.light_lux);

      ALL_DEVICES.forEach((dev) => {
        if (r.deviceState[dev]) {
          buckets[hourKey].devices[dev] = (buckets[hourKey].devices[dev] || 0) + 1;
        }
      });
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, b]) => {
        const avg = (arr: number[]) => (arr.length > 0 ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : 0);
        const max = (arr: number[]) => (arr.length > 0 ? Number(Math.max(...arr).toFixed(1)) : 0);
        const min = (arr: number[]) => (arr.length > 0 ? Number(Math.min(...arr).toFixed(1)) : 0);
        return {
          hour,
          readings: b.temps.length,
          avgTemp: avg(b.temps),
          maxTemp: max(b.temps),
          minTemp: min(b.temps),
          avgHumidity: avg(b.hums),
          avgAmmonia: avg(b.nh3s),
          totalWater: Number(b.waters.reduce((s, v) => s + v, 0).toFixed(1)),
          avgLux: avg(b.luxes),
          maxLux: max(b.luxes),
          hsi: Number((avg(b.temps) + 0.36 * avg(b.hums)).toFixed(1)),
          activeDevices: b.devices,
        };
      });
  }, [correlated, sensors.length]);

  return { sensors, loadingSensors, deviceCommands, correlated, runtime, hourlySummary };
}

export type CorrelatedRow = ReturnType<typeof useSensorDeviceImpact>['correlated'][number];
export type RuntimeRow = ReturnType<typeof useSensorDeviceImpact>['runtime'][number];
export type HourlyRow = ReturnType<typeof useSensorDeviceImpact>['hourlySummary'][number];
