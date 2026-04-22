import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, FileSpreadsheet, Loader2, Thermometer, Droplet, Wind, Power } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

type Hours = 6 | 12 | 24 | 72 | 168;

interface CorrelatedRow {
  time: string;
  temperature: number;
  humidity: number;
  ammonia: number;
  water_usage: number;
  fan: string;
  heater: string;
  fogger: string;
  sprinkler: string;
  ceiling_fan: string;
  light: string;
  alarm: string;
  hsi: number;
  status: string;
  status_bn: string;
  reason_bn: string;
}

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

  const since = useMemo(() => new Date(Date.now() - hours * 3600000).toISOString(), [hours]);

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

  // Current device snapshot for "is it running now" mapping
  const { data: deviceStatus } = useQuery({
    queryKey: ['impact-device-status', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return null;
      let q = supabase.from('device_status').select('*').eq('user_id', user.id);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      const { data, error } = await q.order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Build correlated rows: for each sensor reading, find devices "ON" at that time
  const correlated = useMemo<CorrelatedRow[]>(() => {
    return sensors.map((s) => {
      const t = Number(s.temperature) || 0;
      const h = Number(s.humidity) || 0;
      const nh3 = Number(s.ammonia) || 0;
      const water = Number(s.water_usage) || 0;
      const sensorTime = new Date(s.recorded_at).getTime();

      // Find most recent ON command for each device before this sensor moment
      const deviceState: Record<string, boolean> = {};
      const order = ['fan', 'heater', 'fogger', 'sprinkler', 'ceiling_fan', 'light', 'alarm'];
      order.forEach((d) => (deviceState[d] = false));

      for (const log of deviceLogs) {
        const ts = new Date(log.sent_at || log.created_at).getTime();
        if (ts > sensorTime) continue;
        if (order.includes(log.command_type) && deviceState[log.command_type] === false) {
          // Use latest known state (logs sorted DESC, so first match wins)
          deviceState[log.command_type] = !!log.command_value;
        }
      }

      const hsi = Number((t + 0.36 * h).toFixed(1));
      const st = statusFromSensors(t, h, nh3, hsi);
      const onOff = (b: boolean) => (b ? (language === 'bn' ? 'চালু' : 'ON') : (language === 'bn' ? 'বন্ধ' : 'OFF'));

      return {
        time: new Date(s.recorded_at).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US'),
        temperature: t,
        humidity: h,
        ammonia: nh3,
        water_usage: water,
        fan: onOff(deviceState.fan),
        heater: onOff(deviceState.heater),
        fogger: onOff(deviceState.fogger),
        sprinkler: onOff(deviceState.sprinkler),
        ceiling_fan: onOff(deviceState.ceiling_fan),
        light: onOff(deviceState.light),
        alarm: onOff(deviceState.alarm),
        hsi,
        status: st.en,
        status_bn: st.bn,
        reason_bn: st.reason,
      };
    });
  }, [sensors, deviceLogs, language]);

  // Device runtime totals (rough estimate from command log)
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
    // Devices still ON until now
    Object.keys(lastOn).forEach((k) => {
      totals[k] = (totals[k] || 0) + (Date.now() - lastOn[k]);
    });
    return Object.entries(totals).map(([device, ms]) => ({
      device,
      minutes: Math.round(ms / 60000),
    }));
  }, [deviceLogs]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      if (!user) throw new Error('Not authenticated');

      // Fetch farm data in parallel
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

      // Sheet 1: Sensor ↔ Device ↔ Impact (main correlation)
      const corrSheet = XLSX.utils.json_to_sheet(
        correlated.map((r) => ({
          'সময়': r.time,
          'তাপমাত্রা (°C)': r.temperature,
          'আর্দ্রতা (%)': r.humidity,
          'অ্যামোনিয়া (ppm)': r.ammonia,
          'পানি (L)': r.water_usage,
          'HSI': r.hsi,
          'ফ্যান': r.fan,
          'হিটার': r.heater,
          'ফগার': r.fogger,
          'স্প্রিংকলার': r.sprinkler,
          'সিলিং ফ্যান': r.ceiling_fan,
          'লাইট': r.light,
          'অ্যালার্ম': r.alarm,
          'অবস্থা': r.status_bn,
          'প্রভাব / কারণ': r.reason_bn,
        }))
      );
      XLSX.utils.book_append_sheet(wb, corrSheet, 'Sensor-Device-Impact');

      // Sheet 2: Device runtime totals
      const runtimeSheet = XLSX.utils.json_to_sheet(
        runtime.map((r) => ({
          'ডিভাইস': r.device,
          'মোট রানটাইম (মিনিট)': r.minutes,
          'মোট রানটাইম (ঘণ্টা)': (r.minutes / 60).toFixed(2),
        }))
      );
      XLSX.utils.book_append_sheet(wb, runtimeSheet, 'Device Runtime');

      // Helper to add sheet from query result
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
      XLSX.writeFile(wb, `${farmName}_full_report_${ts}.xlsx`);

      toast({
        title: language === 'bn' ? '✅ Excel ডাউনলোড সফল' : '✅ Excel downloaded',
        description: language === 'bn' ? 'সব শীট সহ রিপোর্ট তৈরি হয়েছে' : 'Multi-sheet report generated',
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
            <Button onClick={handleExportExcel} disabled={isExporting} className="gap-2 h-10">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {language === 'bn' ? 'Excel এ এক্সপোর্ট (সব ডেটা)' : 'Export Excel (all data)'}
            </Button>
          </div>

          {/* Quick device runtime summary */}
          {runtime.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {runtime.map((r) => (
                <div key={r.device} className="rounded-lg bg-muted/50 p-3 flex items-center gap-2">
                  <Power className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground capitalize truncate">{r.device.replace('_', ' ')}</p>
                    <p className="text-sm font-semibold">
                      {r.minutes < 60 ? `${r.minutes} ${language === 'bn' ? 'মিনিট' : 'min'}` : `${(r.minutes / 60).toFixed(1)} ${language === 'bn' ? 'ঘণ্টা' : 'hr'}`}
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
                    <TableHead className="text-xs">
                      <Thermometer className="h-3 w-3 inline" /> °C
                    </TableHead>
                    <TableHead className="text-xs">
                      <Droplet className="h-3 w-3 inline" /> %
                    </TableHead>
                    <TableHead className="text-xs">
                      <Wind className="h-3 w-3 inline" /> NH₃
                    </TableHead>
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
                      const active = [
                        r.fan === 'ON' || r.fan === 'চালু' ? 'Fan' : null,
                        r.heater === 'ON' || r.heater === 'চালু' ? 'Heater' : null,
                        r.fogger === 'ON' || r.fogger === 'চালু' ? 'Fogger' : null,
                        r.sprinkler === 'ON' || r.sprinkler === 'চালু' ? 'Sprinkler' : null,
                        r.ceiling_fan === 'ON' || r.ceiling_fan === 'চালু' ? 'Ceiling' : null,
                        r.light === 'ON' || r.light === 'চালু' ? 'Light' : null,
                        r.alarm === 'ON' || r.alarm === 'চালু' ? 'Alarm' : null,
                      ].filter(Boolean);
                      const variant: any =
                        r.status === 'CRITICAL' ? 'destructive' : r.status === 'WARNING' ? 'default' : 'secondary';
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-xs whitespace-nowrap">{r.time}</TableCell>
                          <TableCell className="text-xs">{r.temperature.toFixed(1)}</TableCell>
                          <TableCell className="text-xs">{r.humidity.toFixed(0)}</TableCell>
                          <TableCell className="text-xs">{r.ammonia.toFixed(1)}</TableCell>
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
              ? '💡 টেবিলে সর্বশেষ ১০০ এন্ট্রি দেখাচ্ছে। Excel এ সম্পূর্ণ ডেটা সব শীটসহ পাবেন (সেন্সর, ডিভাইস রানটাইম, ডিম, খাদ্য, মৃত্যু, খরচ, বিক্রি, ব্যাচ, ওজন, অ্যালার্ট)।'
              : '💡 Showing latest 100 entries. Excel export contains full data across all sheets (sensors, runtime, eggs, feed, mortality, expenses, sales, batches, weights, alerts).'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
