import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
type SensorKey = 'temperature' | 'humidity' | 'ammonia' | 'water_usage';
type DeviceKey = 'fan' | 'heater' | 'fogger' | 'sprinkler' | 'ceiling_fan' | 'light' | 'alarm';

const SENSOR_META: Record<SensorKey, { bn: string; en: string; color: string; unit: string }> = {
  temperature: { bn: 'তাপমাত্রা', en: 'Temperature', color: 'hsl(var(--sensor-temperature, 14 90% 55%))', unit: '°C' },
  humidity:    { bn: 'আর্দ্রতা',   en: 'Humidity',    color: 'hsl(var(--sensor-humidity, 200 80% 55%))',     unit: '%' },
  ammonia:     { bn: 'অ্যামোনিয়া', en: 'Ammonia',     color: 'hsl(var(--sensor-ammonia, 280 70% 60%))',      unit: 'ppm' },
  water_usage: { bn: 'পানি',       en: 'Water',       color: 'hsl(var(--sensor-water, 190 80% 50%))',        unit: 'L' },
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

const ALL_SENSORS: SensorKey[] = ['temperature', 'humidity', 'ammonia', 'water_usage'];
const ALL_DEVICES: DeviceKey[] = ['fan', 'heater', 'fogger', 'sprinkler', 'ceiling_fan', 'light', 'alarm'];

function statusFromSensors(t: number, h: number, nh3: number, hsi: number) {
  if (nh3 > 25 || t > 35 || hsi > 85) return { en: 'CRITICAL', bn: 'জরুরি', reason: 'উচ্চ তাপ/অ্যামোনিয়া/HSI' };
  if (t > 32 || nh3 > 20 || hsi > 78) return { en: 'WARNING', bn: 'সতর্ক', reason: 'তাপ বা গ্যাস বেশি' };
  if (t < 18) return { en: 'COLD', bn: 'ঠান্ডা', reason: 'তাপমাত্রা কম, হিটার দরকার' };
  if (h > 85) return { en: 'HUMID', bn: 'আর্দ্রতা বেশি', reason: 'বায়ুচলাচল প্রয়োজন' };
  return { en: 'NORMAL', bn: 'স্বাভাবিক', reason: 'সব ঠিক আছে' };
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
        .select('recorded_at, temperature, humidity, ammonia, water_usage')
        .eq('user_id', user.id)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false })
        .limit(500);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Device command log -> runtime
  const { data: deviceLogs = [] } = useQuery({
    queryKey: ['impact-device-logs', user?.id, selectedFarmId, hours],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('device_command_log')
        .select('command_type, command_value, sent_at, acked_at, created_at, status')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Build correlated rows
  const correlated = useMemo(() => {
    return sensors.map((s) => {
      const t = Number(s.temperature) || 0;
      const h = Number(s.humidity) || 0;
      const nh3 = Number(s.ammonia) || 0;
      const water = Number(s.water_usage) || 0;
      const sensorTime = new Date(s.recorded_at).getTime();

      const deviceState: Record<string, boolean> = {};
      ALL_DEVICES.forEach((d) => (deviceState[d] = false));

      for (const log of deviceLogs) {
        const ts = new Date(log.sent_at || log.created_at).getTime();
        if (ts > sensorTime) continue;
        if (ALL_DEVICES.includes(log.command_type as DeviceKey) && deviceState[log.command_type] === false) {
          deviceState[log.command_type] = !!log.command_value;
        }
      }

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
  }, [sensors, deviceLogs, language]);

  // Chart data: chronological order (oldest first)
  const chartData = useMemo(() => [...correlated].reverse(), [correlated]);

  // Device runtime totals from log
  const runtime = useMemo(() => {
    const totals: Record<string, number> = {};
    const lastOn: Record<string, number> = {};
    const sorted = [...deviceLogs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    for (const log of sorted) {
      const ts = new Date(log.sent_at || log.created_at).getTime();
      const k = log.command_type;
      if (log.command_value === true) {
        if (lastOn[k] === undefined) lastOn[k] = ts;
      } else if (log.command_value === false && lastOn[k] !== undefined) {
        totals[k] = (totals[k] || 0) + (ts - lastOn[k]);
        delete lastOn[k];
      }
    }
    Object.keys(lastOn).forEach((k) => {
      totals[k] = (totals[k] || 0) + (Date.now() - lastOn[k]);
    });
    return ALL_DEVICES
      .filter((d) => selectedDevices.has(d))
      .map((d) => ({
        device: d,
        label: language === 'bn' ? DEVICE_META[d].bn : DEVICE_META[d].en,
        minutes: Math.round((totals[d] || 0) / 60000),
        color: DEVICE_META[d].color,
      }));
  }, [deviceLogs, selectedDevices, language]);

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

      // Sheet 1: Sensor ↔ Device ↔ Impact (only selected sensors + devices)
      const sensorLabel = (k: SensorKey) =>
        `${language === 'bn' ? SENSOR_META[k].bn : SENSOR_META[k].en} (${SENSOR_META[k].unit})`;
      const deviceLabel = (k: DeviceKey) => (language === 'bn' ? DEVICE_META[k].bn : DEVICE_META[k].en);

      const corrSheet = XLSX.utils.json_to_sheet(
        correlated.map((r) => {
          const row: Record<string, any> = { [language === 'bn' ? 'সময়' : 'Time']: r.time };
          ALL_SENSORS.forEach((k) => {
            if (selectedSensors.has(k)) row[sensorLabel(k)] = r[k];
          });
          row['HSI'] = r.hsi;
          ALL_DEVICES.forEach((k) => {
            if (selectedDevices.has(k)) row[deviceLabel(k)] = r[k];
          });
          row[language === 'bn' ? 'অবস্থা' : 'Status'] = r.status_bn;
          row[language === 'bn' ? 'প্রভাব / কারণ' : 'Impact / Reason'] = r.reason_bn;
          return row;
        })
      );
      XLSX.utils.book_append_sheet(wb, corrSheet, 'Sensor-Device-Impact');

      // Sheet 2: Device runtime totals (only selected)
      const runtimeSheet = XLSX.utils.json_to_sheet(
        runtime.map((r) => ({
          [language === 'bn' ? 'ডিভাইস' : 'Device']: r.label,
          [language === 'bn' ? 'মোট রানটাইম (মিনিট)' : 'Total runtime (min)']: r.minutes,
          [language === 'bn' ? 'মোট রানটাইম (ঘণ্টা)' : 'Total runtime (hr)']: (r.minutes / 60).toFixed(2),
        }))
      );
      XLSX.utils.book_append_sheet(wb, runtimeSheet, 'Device Runtime');

      const addSheet = (name: string, rows: any[]) => {
        if (!rows || rows.length === 0) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['কোনো ডেটা নেই']]), name);
        } else {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
        }
      };

      addSheet('Egg Production', eggsRes.data || []);
      addSheet('Feed Consumption', feedRes.data || []);
      addSheet('Mortality', mortalityRes.data || []);
      addSheet('Expenses', expensesRes.data || []);
      addSheet('Sales', incomeRes.data || []);
      addSheet('Broiler Batches', batchesRes.data || []);
      addSheet('Broiler Weights', weightsRes.data || []);
      addSheet('Broiler Feed', broilerFeedRes.data || []);
      addSheet('Alerts', alertsRes.data || []);
      addSheet('Daily Summary', summaryRes.data || []);

      const farmName = currentFarm?.name_en || 'Farm';
      const ts = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `${farmName}_filtered_report_${ts}.xlsx`);

      toast({
        title: language === 'bn' ? '✅ Excel ডাউনলোড সফল' : '✅ Excel downloaded',
        description: language === 'bn'
          ? `${selectedSensors.size} সেন্সর ও ${selectedDevices.size} ডিভাইস সহ`
          : `With ${selectedSensors.size} sensors and ${selectedDevices.size} devices`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: language === 'bn' ? 'এক্সপোর্ট ব্যর্থ' : 'Export failed',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const visibleSensors = ALL_SENSORS.filter((s) => selectedSensors.has(s));

  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'সেন্সর ↔ ডিভাইস ↔ প্রভাব রিপোর্ট' : 'Sensor ↔ Device ↔ Impact Report'}
          </CardTitle>
          <CardDescription>
            {language === 'bn'
              ? 'কোন সেন্সর ডাটায় কোন ডিভাইস কখন চলেছে এবং ফার্মে কী প্রভাব পড়েছে'
              : 'See which devices ran in response to sensor data and the resulting farm impact'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time range + export */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 min-w-[160px]">
              <Label className="text-xs">{language === 'bn' ? 'সময়সীমা' : 'Time range'}</Label>
              <Select value={String(hours)} onValueChange={(v) => setHours(Number(v) as Hours)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">{language === 'bn' ? '৬ ঘণ্টা' : '6 hours'}</SelectItem>
                  <SelectItem value="12">{language === 'bn' ? '১২ ঘণ্টা' : '12 hours'}</SelectItem>
                  <SelectItem value="24">{language === 'bn' ? '২৪ ঘণ্টা' : '24 hours'}</SelectItem>
                  <SelectItem value="72">{language === 'bn' ? '৩ দিন' : '3 days'}</SelectItem>
                  <SelectItem value="168">{language === 'bn' ? '৭ দিন' : '7 days'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleExportExcel}
              disabled={isExporting || (selectedSensors.size === 0 && selectedDevices.size === 0)}
              className="gap-2 h-10"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {language === 'bn' ? 'নির্বাচিত ডেটা Excel এ এক্সপোর্ট' : 'Export selected to Excel'}
            </Button>
          </div>

          {/* Filters */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">
                  {language === 'bn' ? '🌡️ সেন্সর নির্বাচন' : '🌡️ Sensors'}
                </Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedSensors(new Set(ALL_SENSORS))}
                  >
                    {language === 'bn' ? 'সব' : 'All'}
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedSensors(new Set())}
                  >
                    {language === 'bn' ? 'কোনোটি না' : 'None'}
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
                    {language === 'bn' ? SENSOR_META[k].bn : SENSOR_META[k].en}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">
                  {language === 'bn' ? '⚡ ডিভাইস নির্বাচন' : '⚡ Devices'}
                </Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedDevices(new Set(ALL_DEVICES))}
                  >
                    {language === 'bn' ? 'সব' : 'All'}
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedDevices(new Set())}
                  >
                    {language === 'bn' ? 'কোনোটি না' : 'None'}
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
                    {language === 'bn' ? DEVICE_META[k].bn : DEVICE_META[k].en}
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
                {language === 'bn' ? 'সেন্সর ট্রেন্ড (সময়ের সাথে)' : 'Sensor trend over time'}
              </Label>
            </div>
            <div className="h-56">
              {visibleSensors.length === 0 || chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  {language === 'bn' ? 'কমপক্ষে একটি সেন্সর নির্বাচন করুন' : 'Select at least one sensor'}
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
                        name={`${language === 'bn' ? SENSOR_META[k].bn : SENSOR_META[k].en} (${SENSOR_META[k].unit})`}
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
                {language === 'bn' ? 'ডিভাইস রানটাইম (মিনিট)' : 'Device runtime (minutes)'}
              </Label>
            </div>
            <div className="h-56">
              {runtime.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  {language === 'bn' ? 'কমপক্ষে একটি ডিভাইস নির্বাচন করুন' : 'Select at least one device'}
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
                      formatter={(v: any) => [`${v} ${language === 'bn' ? 'মিনিট' : 'min'}`, '']}
                    />
                    <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                      {runtime.map((r, i) => (
                        <rect key={i} fill={r.color} />
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
                        ? `${r.minutes} ${language === 'bn' ? 'মিনিট' : 'min'}`
                        : `${(r.minutes / 60).toFixed(1)} ${language === 'bn' ? 'ঘণ্টা' : 'hr'}`}
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
                    <TableHead className="text-xs">{language === 'bn' ? 'সময়' : 'Time'}</TableHead>
                    {selectedSensors.has('temperature') && (
                      <TableHead className="text-xs"><Thermometer className="h-3 w-3 inline" /> °C</TableHead>
                    )}
                    {selectedSensors.has('humidity') && (
                      <TableHead className="text-xs"><Droplet className="h-3 w-3 inline" /> %</TableHead>
                    )}
                    {selectedSensors.has('ammonia') && (
                      <TableHead className="text-xs"><Wind className="h-3 w-3 inline" /> NH₃</TableHead>
                    )}
                    <TableHead className="text-xs">{language === 'bn' ? 'সক্রিয় ডিভাইস' : 'Active devices'}</TableHead>
                    <TableHead className="text-xs">{language === 'bn' ? 'প্রভাব' : 'Impact'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSensors ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      </TableCell>
                    </TableRow>
                  ) : correlated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                        {language === 'bn' ? 'এই সময়সীমার জন্য কোনো ডেটা নেই' : 'No data for this range'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    correlated.slice(0, 100).map((r, i) => {
                      const active = ALL_DEVICES
                        .filter((d) => selectedDevices.has(d) && r.deviceState[d])
                        .map((d) => (language === 'bn' ? DEVICE_META[d].bn : DEVICE_META[d].en));
                      const variant: any =
                        r.status === 'CRITICAL' ? 'destructive' : r.status === 'WARNING' ? 'default' : 'secondary';
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-xs whitespace-nowrap">{r.time}</TableCell>
                          {selectedSensors.has('temperature') && (
                            <TableCell className="text-xs">{r.temperature.toFixed(1)}</TableCell>
                          )}
                          {selectedSensors.has('humidity') && (
                            <TableCell className="text-xs">{r.humidity.toFixed(0)}</TableCell>
                          )}
                          {selectedSensors.has('ammonia') && (
                            <TableCell className="text-xs">{r.ammonia.toFixed(1)}</TableCell>
                          )}
                          <TableCell className="text-xs">
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
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant={variant} className="text-[10px]">
                              {r.status_bn}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{r.reason_bn}</p>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {language === 'bn'
              ? '💡 শুধু নির্বাচিত সেন্সর ও ডিভাইস চার্ট, টেবিল ও Excel এ অন্তর্ভুক্ত হবে। ফার্ম মেনুর সব ডেটা (ডিম, খাদ্য, খরচ, মৃত্যু, ইত্যাদি) আলাদা শীটে থাকে।'
              : '💡 Only selected sensors & devices appear in charts, table, and Excel. Farm menu data (eggs, feed, expenses, mortality, etc.) is included in separate sheets.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
