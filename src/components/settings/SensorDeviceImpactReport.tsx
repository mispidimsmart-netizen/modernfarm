import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell as TCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Activity, FileSpreadsheet, Loader2, Thermometer, Droplet, Wind, Power,
  LineChart as LineChartIcon, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

type Hours = 6 | 12 | 24 | 72 | 168;
type SensorKey = 'temperature' | 'humidity' | 'ammonia' | 'water_usage' | 'light_lux';
type DeviceKey = 'fan' | 'heater' | 'fogger' | 'sprinkler' | 'ceiling_fan' | 'light' | 'alarm';

const SENSOR_META: Record<SensorKey, { bn: string; en: string; color: string; unit: string }> = {
  temperature: { bn: 'তাপমাত্রা', en: 'Temperature', color: 'hsl(var(--sensor-temperature, 14 90% 55%))', unit: '°C' },
  humidity:    { bn: 'আর্দ্রতা',   en: 'Humidity',    color: 'hsl(var(--sensor-humidity, 200 80% 55%))',     unit: '%' },
  ammonia:     { bn: 'অ্যামোনিয়া', en: 'Ammonia',     color: 'hsl(var(--sensor-ammonia, 280 70% 60%))',      unit: 'ppm' },
  water_usage: { bn: 'পানি',       en: 'Water',       color: 'hsl(var(--sensor-water, 190 80% 50%))',        unit: 'L' },
  light_lux:   { bn: 'আলো (LDR)',  en: 'Light (LDR)', color: 'hsl(45 95% 55%)',                              unit: 'lux' },
};

const DEVICE_META: Record<DeviceKey, { bn: string; en: string; color: string }> = {
  fan:          { bn: 'ফ্যান',       en: 'Fan',         color: 'hsl(200 80% 55%)' },
  heater:       { bn: 'হিটার',       en: 'Heater',      color: 'hsl(14 90% 55%)' },
  fogger:       { bn: 'ফগার',        en: 'Fogger',      color: 'hsl(190 75% 50%)' },
  sprinkler:    { bn: 'স্প্রিংকলার', en: 'Sprinkler',   color: 'hsl(160 70% 45%)' },
  ceiling_fan:  { bn: 'সিলিং ফ্যান',  en: 'Ceiling Fan', color: 'hsl(220 70% 60%)' },
  light:        { bn: 'লাইট',         en: 'Light',       color: 'hsl(45 95% 55%)' },
  alarm:        { bn: 'অ্যালার্ম',     en: 'Alarm',       color: 'hsl(0 80% 55%)' },
};

const ALL_SENSORS: SensorKey[] = ['temperature', 'humidity', 'ammonia', 'water_usage', 'light_lux'];
const ALL_DEVICES: DeviceKey[] = ['fan', 'heater', 'fogger', 'sprinkler', 'ceiling_fan', 'light', 'alarm'];

function statusFromSensors(t: number, h: number, nh3: number, hsi: number) {
  if (nh3 > 25 || t > 35 || hsi > 85) return { en: 'CRITICAL', bn: 'জরুরি', reason: 'উচ্চ তাপ/অ্যামোনিয়া/HSI' };
  if (t > 32 || nh3 > 20 || hsi > 78) return { en: 'WARNING', bn: 'সতর্ক', reason: 'তাপ বা গ্যাস বেশি' };
  if (t < 18) return { en: 'COLD', bn: 'ঠান্ডা', reason: 'তাপমাত্রা কম, হিটার দরকার' };
  if (h > 85) return { en: 'HUMID', bn: 'আর্দ্রতা বেশি', reason: 'বায়ুচলাচল প্রয়োজন' };
  return { en: 'NORMAL', bn: 'স্বাভাবিক', reason: 'সব ঠিক আছে' };
}

// Build a timeline of device states from command history
// Returns a map: deviceKey -> sorted array of {ts, on}
function buildDeviceTimeline(commands: any[]): Record<string, { ts: number; on: boolean }[]> {
  const timeline: Record<string, { ts: number; on: boolean }[]> = {};
  ALL_DEVICES.forEach((d) => (timeline[d] = []));

  const sorted = [...commands].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const cmd of sorted) {
    const key = cmd.command_type as DeviceKey;
    if (!ALL_DEVICES.includes(key)) continue;
    const ts = new Date(cmd.created_at).getTime();
    const on = !!cmd.command_value;
    timeline[key].push({ ts, on });
  }
  return timeline;
}

// Get device state at a specific timestamp using binary search
function getDeviceStateAt(timeline: { ts: number; on: boolean }[], timestamp: number): boolean {
  let state = false;
  for (const entry of timeline) {
    if (entry.ts > timestamp) break;
    state = entry.on;
  }
  return state;
}

export function SensorDeviceImpactReport() {
  const { language, user } = useAuth();
  const { selectedFarmId, currentFarm } = useFarmContext();
  const { toast } = useToast();
  const [hours, setHours] = useState<Hours>(24);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState<Set<SensorKey>>(new Set(ALL_SENSORS));
  const [selectedDevices, setSelectedDevices] = useState<Set<DeviceKey>>(new Set(ALL_DEVICES));

  const since = useMemo(() => new Date(Date.now() - hours * 3600000).toISOString(), [hours]);

  const toggleSensor = (k: SensorKey) => {
    const next = new Set(selectedSensors);
    next.has(k) ? next.delete(k) : next.add(k);
    setSelectedSensors(next);
  };
  const toggleDevice = (k: DeviceKey) => {
    const next = new Set(selectedDevices);
    next.has(k) ? next.delete(k) : next.add(k);
    setSelectedDevices(next);
  };

  // Sensor readings
  const { data: sensors = [], isLoading: loadingSensors } = useQuery({
    queryKey: ['impact-sensors', user?.id, selectedFarmId, hours],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('sensor_readings')
        .select('recorded_at, temperature, humidity, ammonia, water_usage, light_lux')
        .eq('user_id', user.id)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true })
        .limit(2000);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Device commands (primary source — device_command_log is empty for most farms)
  const { data: deviceCommands = [] } = useQuery({
    queryKey: ['impact-device-cmds', user?.id, selectedFarmId, hours],
    queryFn: async () => {
      if (!user) return [];

      // Source 1: device_commands (primary — ESP32 uses this)
      let q1 = supabase
        .from('device_commands')
        .select('command_type, command_value, executed_at, created_at, executed')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(2000);
      if (selectedFarmId) q1 = q1.eq('farm_id', selectedFarmId);

      // Source 2: device_command_log (newer table, may have extra data)
      let q2 = supabase
        .from('device_command_log')
        .select('command_type, command_value, sent_at, acked_at, created_at, status')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(2000);
      if (selectedFarmId) q2 = q2.eq('farm_id', selectedFarmId);

      const [r1, r2] = await Promise.all([q1, q2]);
      if (r1.error) throw r1.error;

      // Normalize both sources into a unified format
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

      // Merge & deduplicate by command_type + created_at
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
    enabled: !!user,
  });

  // Build device timeline once
  const deviceTimeline = useMemo(() => buildDeviceTimeline(deviceCommands), [deviceCommands]);

  // Build correlated rows: for each sensor reading, find device states at that time
  const correlated = useMemo(() => {
    return sensors.map((s) => {
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

  // Chart data (already ascending from query)
  const chartData = correlated;

  // Device runtime totals from timeline
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
        } else {
          if (lastOnTs !== null) {
            total += entry.ts - lastOnTs;
            lastOnTs = null;
          }
        }
      }
      // If still ON, count until now
      if (lastOnTs !== null) {
        total += nowMs - lastOnTs;
      }
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

  // Build hourly summary for analysis
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
        const avg = (arr: number[]) => arr.length > 0 ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : 0;
        const max = (arr: number[]) => arr.length > 0 ? Number(Math.max(...arr).toFixed(1)) : 0;
        const min = (arr: number[]) => arr.length > 0 ? Number(Math.min(...arr).toFixed(1)) : 0;
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

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      if (!user) throw new Error('Not authenticated');

      const farmFilter = (q: any) => (selectedFarmId ? q.eq('farm_id', selectedFarmId) : q);

      const [eggsRes, feedRes, mortalityRes, expensesRes, incomeRes, batchesRes, weightsRes, broilerFeedRes, alertsRes, summaryRes] =
        await Promise.all([
          farmFilter(supabase.from('egg_production').select('*').eq('user_id', user.id)).order('production_date', { ascending: false }),
          farmFilter(supabase.from('feed_consumption').select('*').eq('user_id', user.id)).order('consumption_date', { ascending: false }),
          farmFilter(supabase.from('broiler_mortality').select('*').eq('user_id', user.id)).order('record_date', { ascending: false }),
          farmFilter(supabase.from('expenses').select('*').eq('user_id', user.id)).order('expense_date', { ascending: false }),
          farmFilter(supabase.from('broiler_sales').select('*').eq('user_id', user.id)).order('sale_date', { ascending: false }),
          farmFilter(supabase.from('broiler_batches').select('*').eq('user_id', user.id)).order('start_date', { ascending: false }),
          farmFilter(supabase.from('broiler_weights').select('*').eq('user_id', user.id)).order('record_date', { ascending: false }),
          farmFilter(supabase.from('broiler_feed').select('*').eq('user_id', user.id)).order('feed_date', { ascending: false }),
          farmFilter(supabase.from('alerts').select('*').eq('user_id', user.id)).order('created_at', { ascending: false }).limit(500),
          farmFilter(supabase.from('daily_summary').select('*').eq('user_id', user.id)).order('summary_date', { ascending: false }),
        ]);

      const wb = XLSX.utils.book_new();
      const bn = language === 'bn';

      // ──── Sheet 1: Sensor ↔ Device ↔ Impact ────
      const sensorLabel = (k: SensorKey) =>
        `${bn ? SENSOR_META[k].bn : SENSOR_META[k].en} (${SENSOR_META[k].unit})`;
      const deviceLabel = (k: DeviceKey) => (bn ? DEVICE_META[k].bn : DEVICE_META[k].en);

      const corrSheet = XLSX.utils.json_to_sheet(
        correlated.map((r) => {
          const row: Record<string, any> = { [bn ? 'সময়' : 'Time']: r.time };
          ALL_SENSORS.forEach((k) => {
            if (selectedSensors.has(k)) row[sensorLabel(k)] = r[k];
          });
          row['HSI'] = r.hsi;
          ALL_DEVICES.forEach((k) => {
            if (selectedDevices.has(k)) row[deviceLabel(k)] = r[k];
          });
          row[bn ? 'অবস্থা' : 'Status'] = r.status_bn;
          row[bn ? 'প্রভাব / কারণ' : 'Impact / Reason'] = r.reason_bn;
          return row;
        })
      );
      XLSX.utils.book_append_sheet(wb, corrSheet, bn ? 'সেন্সর-ডিভাইস-প্রভাব' : 'Sensor-Device-Impact');

      // ──── Sheet 2: ঘণ্টাভিত্তিক বিশ্লেষণ ────
      const hourlySheet = XLSX.utils.json_to_sheet(
        hourlySummary.map((h) => {
          const row: Record<string, any> = {
            [bn ? 'ঘণ্টা' : 'Hour']: h.hour,
            [bn ? 'রিডিং সংখ্যা' : 'Readings']: h.readings,
            [bn ? 'গড় তাপমাত্রা (°C)' : 'Avg Temp (°C)']: h.avgTemp,
            [bn ? 'সর্বোচ্চ তাপমাত্রা' : 'Max Temp']: h.maxTemp,
            [bn ? 'সর্বনিম্ন তাপমাত্রা' : 'Min Temp']: h.minTemp,
            [bn ? 'গড় আর্দ্রতা (%)' : 'Avg Humidity (%)']: h.avgHumidity,
            [bn ? 'গড় অ্যামোনিয়া (ppm)' : 'Avg Ammonia (ppm)']: h.avgAmmonia,
            [bn ? 'মোট পানি (L)' : 'Total Water (L)']: h.totalWater,
            [bn ? 'গড় আলো (lux)' : 'Avg Light (lux)']: h.avgLux,
            [bn ? 'সর্বোচ্চ আলো (lux)' : 'Max Light (lux)']: h.maxLux,
            'HSI': h.hsi,
          };
          ALL_DEVICES.forEach((d) => {
            row[`${deviceLabel(d)} (${bn ? 'সক্রিয়' : 'active'})`] = h.activeDevices[d] || 0;
          });
          return row;
        })
      );
      XLSX.utils.book_append_sheet(wb, hourlySheet, bn ? 'ঘণ্টাভিত্তিক বিশ্লেষণ' : 'Hourly Analysis');

      // ──── Sheet 3: Device Transitions (ON/OFF log) ────
      const transitionRows = deviceCommands
        .filter((c) => ALL_DEVICES.includes(c.command_type as DeviceKey))
        .map((c) => ({
          [bn ? 'সময়' : 'Time']: new Date(c.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US'),
          [bn ? 'ডিভাইস' : 'Device']: bn ? DEVICE_META[c.command_type as DeviceKey]?.bn || c.command_type : DEVICE_META[c.command_type as DeviceKey]?.en || c.command_type,
          [bn ? 'অবস্থা' : 'State']: c.command_value ? (bn ? 'চালু' : 'ON') : (bn ? 'বন্ধ' : 'OFF'),
          [bn ? 'স্ট্যাটাস' : 'Status']: c.status,
        }));
      const transSheet = XLSX.utils.json_to_sheet(transitionRows.length > 0 ? transitionRows : [{ [bn ? 'তথ্য' : 'Info']: bn ? 'কোনো ট্রানজিশন নেই' : 'No transitions' }]);
      XLSX.utils.book_append_sheet(wb, transSheet, bn ? 'ডিভাইস ট্রানজিশন' : 'Device Transitions');

      // ──── Sheet 4: Device Runtime totals ────
      const runtimeSheet = XLSX.utils.json_to_sheet(
        runtime.map((r) => ({
          [bn ? 'ডিভাইস' : 'Device']: r.label,
          [bn ? 'মোট রানটাইম (মিনিট)' : 'Total runtime (min)']: r.minutes,
          [bn ? 'মোট রানটাইম (ঘণ্টা)' : 'Total runtime (hr)']: Number((r.minutes / 60).toFixed(2)),
        }))
      );
      XLSX.utils.book_append_sheet(wb, runtimeSheet, bn ? 'ডিভাইস রানটাইম' : 'Device Runtime');

      // ──── Sheet 5: Summary Statistics ────
      const sensorStats = () => {
        if (correlated.length === 0) return [];
        const calc = (key: SensorKey, label: string, unit: string) => {
          const vals = correlated.map((r) => r[key]);
          const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
          return {
            [bn ? 'মেট্রিক' : 'Metric']: label,
            [bn ? 'গড়' : 'Average']: Number(avg.toFixed(2)),
            [bn ? 'সর্বোচ্চ' : 'Maximum']: Number(Math.max(...vals).toFixed(2)),
            [bn ? 'সর্বনিম্ন' : 'Minimum']: Number(Math.min(...vals).toFixed(2)),
            [bn ? 'একক' : 'Unit']: unit,
            [bn ? 'মোট রিডিং' : 'Total readings']: vals.length,
          };
        };
        return [
          calc('temperature', bn ? 'তাপমাত্রা' : 'Temperature', '°C'),
          calc('humidity', bn ? 'আর্দ্রতা' : 'Humidity', '%'),
          calc('ammonia', bn ? 'অ্যামোনিয়া' : 'Ammonia', 'ppm'),
          calc('water_usage', bn ? 'পানি ব্যবহার' : 'Water Usage', 'L'),
          calc('light_lux', bn ? 'আলো (LDR)' : 'Light (LDR)', 'lux'),
        ];
      };

      const statusCounts: Record<string, number> = {};
      correlated.forEach((r) => {
        statusCounts[r.status_bn] = (statusCounts[r.status_bn] || 0) + 1;
      });

      const summaryData = [
        ...sensorStats(),
        { [bn ? 'মেট্রিক' : 'Metric']: '', [bn ? 'গড়' : 'Average']: '', [bn ? 'সর্বোচ্চ' : 'Maximum']: '', [bn ? 'সর্বনিম্ন' : 'Minimum']: '' },
        { [bn ? 'মেট্রিক' : 'Metric']: bn ? '--- অবস্থা সারাংশ ---' : '--- Status Summary ---' },
        ...Object.entries(statusCounts).map(([status, count]) => ({
          [bn ? 'মেট্রিক' : 'Metric']: status,
          [bn ? 'গড়' : 'Average']: count,
          [bn ? 'সর্বোচ্চ' : 'Maximum']: `${((count / correlated.length) * 100).toFixed(1)}%`,
        })),
      ];
      const statsSheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, statsSheet, bn ? 'সারাংশ পরিসংখ্যান' : 'Summary Statistics');

      // ──── Remaining data sheets ────
      const addSheet = (name: string, rows: any[]) => {
        if (!rows || rows.length === 0) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[bn ? 'কোনো ডেটা নেই' : 'No data']]), name);
        } else {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
        }
      };

      addSheet(bn ? 'ডিম উৎপাদন' : 'Egg Production', eggsRes.data || []);
      addSheet(bn ? 'খাদ্য খরচ' : 'Feed Consumption', feedRes.data || []);
      addSheet(bn ? 'মৃত্যু' : 'Mortality', mortalityRes.data || []);
      addSheet(bn ? 'ব্যয়' : 'Expenses', expensesRes.data || []);
      addSheet(bn ? 'বিক্রয়' : 'Sales', incomeRes.data || []);
      addSheet(bn ? 'ব্রয়লার ব্যাচ' : 'Broiler Batches', batchesRes.data || []);
      addSheet(bn ? 'ব্রয়লার ওজন' : 'Broiler Weights', weightsRes.data || []);
      addSheet(bn ? 'ব্রয়লার খাদ্য' : 'Broiler Feed', broilerFeedRes.data || []);
      addSheet(bn ? 'অ্যালার্ট' : 'Alerts', alertsRes.data || []);
      addSheet(bn ? 'দৈনিক সারাংশ' : 'Daily Summary', summaryRes.data || []);

      const farmName = currentFarm?.name_en || 'Farm';
      const ts = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `${farmName}_report_${ts}.xlsx`);

      toast({
        title: bn ? '✅ Excel ডাউনলোড সফল' : '✅ Excel downloaded',
        description: bn
          ? `${selectedSensors.size} সেন্সর, ${selectedDevices.size} ডিভাইস, ${hourlySummary.length} ঘণ্টা বিশ্লেষণ সহ`
          : `With ${selectedSensors.size} sensors, ${selectedDevices.size} devices, ${hourlySummary.length} hourly analysis`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: bn ? 'এক্সপোর্ট ব্যর্থ' : 'Export failed',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const bn = language === 'bn';
  const visibleSensors = ALL_SENSORS.filter((s) => selectedSensors.has(s));

  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {bn ? 'সেন্সর ↔ ডিভাইস ↔ প্রভাব রিপোর্ট' : 'Sensor ↔ Device ↔ Impact Report'}
          </CardTitle>
          <CardDescription>
            {bn
              ? 'কোন সেন্সর ডাটায় কোন ডিভাইস কখন চলেছে এবং ফার্মে কী প্রভাব পড়েছে'
              : 'See which devices ran in response to sensor data and the resulting farm impact'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time range + export */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 min-w-[160px]">
              <Label className="text-xs">{bn ? 'সময়সীমা' : 'Time range'}</Label>
              <Select value={String(hours)} onValueChange={(v) => setHours(Number(v) as Hours)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">{bn ? '৬ ঘণ্টা' : '6 hours'}</SelectItem>
                  <SelectItem value="12">{bn ? '১২ ঘণ্টা' : '12 hours'}</SelectItem>
                  <SelectItem value="24">{bn ? '২৪ ঘণ্টা' : '24 hours'}</SelectItem>
                  <SelectItem value="72">{bn ? '৩ দিন' : '3 days'}</SelectItem>
                  <SelectItem value="168">{bn ? '৭ দিন' : '7 days'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleExportExcel}
              disabled={isExporting || (selectedSensors.size === 0 && selectedDevices.size === 0)}
              className="gap-2 h-10"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {bn ? 'সম্পূর্ণ রিপোর্ট Excel এ ডাউনলোড' : 'Download full report as Excel'}
            </Button>
          </div>

          {/* Filters */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">
                  {bn ? '🌡️ সেন্সর নির্বাচন' : '🌡️ Sensors'}
                </Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedSensors(new Set(ALL_SENSORS))}
                  >
                    {bn ? 'সব' : 'All'}
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedSensors(new Set())}
                  >
                    {bn ? 'কোনোটি না' : 'None'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SENSORS.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedSensors.has(k)}
                      onCheckedChange={() => toggleSensor(k)}
                    />
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: SENSOR_META[k].color }}
                    />
                    {bn ? SENSOR_META[k].bn : SENSOR_META[k].en}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">
                  {bn ? '⚡ ডিভাইস নির্বাচন' : '⚡ Devices'}
                </Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedDevices(new Set(ALL_DEVICES))}
                  >
                    {bn ? 'সব' : 'All'}
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedDevices(new Set())}
                  >
                    {bn ? 'কোনোটি না' : 'None'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_DEVICES.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedDevices.has(k)}
                      onCheckedChange={() => toggleDevice(k)}
                    />
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: DEVICE_META[k].color }}
                    />
                    {bn ? DEVICE_META[k].bn : DEVICE_META[k].en}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sensor line chart */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-2">
              <LineChartIcon className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold">
                {bn ? 'সেন্সর ট্রেন্ড (সময়ের সাথে)' : 'Sensor trend over time'}
              </Label>
            </div>
            <div className="h-56">
              {visibleSensors.length === 0 || chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  {chartData.length === 0
                    ? (bn ? 'এই সময়সীমায় কোনো সেন্সর ডেটা নেই' : 'No sensor data for this range')
                    : (bn ? 'কমপক্ষে একটি সেন্সর নির্বাচন করুন' : 'Select at least one sensor')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="timeShort" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {visibleSensors.map((k) => (
                      <Line
                        key={k}
                        type="monotone"
                        dataKey={k}
                        name={`${bn ? SENSOR_META[k].bn : SENSOR_META[k].en} (${SENSOR_META[k].unit})`}
                        stroke={SENSOR_META[k].color}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Device runtime bar chart */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold">
                {bn ? 'ডিভাইস রানটাইম (মিনিট)' : 'Device runtime (minutes)'}
              </Label>
            </div>
            <div className="h-56">
              {runtime.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  {bn ? 'কমপক্ষে একটি ডিভাইস নির্বাচন করুন' : 'Select at least one device'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runtime} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any) => [`${v} ${bn ? 'মিনিট' : 'min'}`, '']}
                    />
                    <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                      {runtime.map((r, i) => (
                        <Cell key={i} fill={r.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick runtime tiles */}
          {runtime.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {runtime.map((r) => (
                <div key={r.device} className="rounded-lg bg-muted/50 p-3 flex items-center gap-2">
                  <Power className="h-4 w-4" style={{ color: r.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground capitalize truncate">{r.label}</p>
                    <p className="text-sm font-semibold">
                      {r.minutes < 60
                        ? `${r.minutes} ${bn ? 'মিনিট' : 'min'}`
                        : `${(r.minutes / 60).toFixed(1)} ${bn ? 'ঘণ্টা' : 'hr'}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Correlation table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="text-xs">{bn ? 'সময়' : 'Time'}</TableHead>
                    {selectedSensors.has('temperature') && (
                      <TableHead className="text-xs"><Thermometer className="h-3 w-3 inline" /> °C</TableHead>
                    )}
                    {selectedSensors.has('humidity') && (
                      <TableHead className="text-xs"><Droplet className="h-3 w-3 inline" /> %</TableHead>
                    )}
                    {selectedSensors.has('ammonia') && (
                      <TableHead className="text-xs"><Wind className="h-3 w-3 inline" /> NH₃</TableHead>
                    )}
                    <TableHead className="text-xs">{bn ? 'সক্রিয় ডিভাইস' : 'Active devices'}</TableHead>
                    <TableHead className="text-xs">{bn ? 'প্রভাব' : 'Impact'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSensors ? (
                    <TableRow>
                      <TCell colSpan={6} className="text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      </TCell>
                    </TableRow>
                  ) : correlated.length === 0 ? (
                    <TableRow>
                      <TCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                        {bn ? 'এই সময়সীমার জন্য কোনো ডেটা নেই' : 'No data for this range'}
                      </TCell>
                    </TableRow>
                  ) : (
                    correlated.slice(-100).reverse().map((r, i) => {
                      const active = ALL_DEVICES
                        .filter((d) => selectedDevices.has(d) && r.deviceState[d])
                        .map((d) => (bn ? DEVICE_META[d].bn : DEVICE_META[d].en));
                      const variant: any =
                        r.status === 'CRITICAL' ? 'destructive' : r.status === 'WARNING' ? 'default' : 'secondary';
                      return (
                        <TableRow key={i}>
                          <TCell className="text-xs whitespace-nowrap">{r.time}</TCell>
                          {selectedSensors.has('temperature') && (
                            <TCell className="text-xs">{r.temperature.toFixed(1)}</TCell>
                          )}
                          {selectedSensors.has('humidity') && (
                            <TCell className="text-xs">{r.humidity.toFixed(0)}</TCell>
                          )}
                          {selectedSensors.has('ammonia') && (
                            <TCell className="text-xs">{r.ammonia.toFixed(1)}</TCell>
                          )}
                          <TCell className="text-xs">
                            {active.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {active.map((a) => (
                                  <Badge key={a} variant="outline" className="text-[10px] px-1 py-0">
                                    {a}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TCell>
                          <TCell className="text-xs">
                            <Badge variant={variant} className="text-[10px]">
                              {r.status_bn}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{r.reason_bn}</p>
                          </TCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {bn
              ? '💡 Excel ফাইলে ১০+ শীট থাকবে: সেন্সর-ডিভাইস কোরিলেশন, ঘণ্টাভিত্তিক বিশ্লেষণ, ডিভাইস ON/OFF ট্রানজিশন লগ, রানটাইম, সারাংশ পরিসংখ্যান, এবং খামার ব্যবস্থাপনার সকল ডেটা।'
              : '💡 Excel file includes 10+ sheets: Sensor-Device correlation, hourly analysis, device ON/OFF transitions, runtime, summary stats, and all farm management data.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
