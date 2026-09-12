import { supabase } from '@/integrations/supabase/client';
import {
  SENSOR_META, DEVICE_META, ALL_SENSORS, ALL_DEVICES,
  type SensorKey, type DeviceKey,
} from '@/lib/sensorDeviceImpact';
import type { CorrelatedRow, HourlyRow, RuntimeRow } from '@/hooks/useSensorDeviceImpact';

interface ExportArgs {
  userId: string;
  selectedFarmId?: string | null;
  farmName: string;
  language: string;
  selectedSensors: Set<SensorKey>;
  selectedDevices: Set<DeviceKey>;
  correlated: CorrelatedRow[];
  hourlySummary: HourlyRow[];
  runtime: RuntimeRow[];
  deviceCommands: any[];
}

export async function exportSensorImpactExcel({
  userId, selectedFarmId, farmName, language,
  selectedSensors, selectedDevices, correlated, hourlySummary, runtime, deviceCommands,
}: ExportArgs) {
  const XLSX = await import('xlsx');
  const bn = language === 'bn';

  const farmFilter = (q: any) => (selectedFarmId ? q.eq('farm_id', selectedFarmId) : q);

  const [eggsRes, feedRes, mortalityRes, expensesRes, incomeRes, batchesRes, weightsRes, broilerFeedRes, alertsRes, summaryRes] =
    await Promise.all([
      farmFilter(supabase.from('egg_production').select('*').eq('user_id', userId)).order('production_date', { ascending: false }),
      farmFilter(supabase.from('feed_consumption').select('*').eq('user_id', userId)).order('consumption_date', { ascending: false }),
      farmFilter(supabase.from('broiler_mortality').select('*').eq('user_id', userId)).order('record_date', { ascending: false }),
      farmFilter(supabase.from('expenses').select('*').eq('user_id', userId)).order('expense_date', { ascending: false }),
      farmFilter(supabase.from('broiler_sales').select('*').eq('user_id', userId)).order('sale_date', { ascending: false }),
      farmFilter(supabase.from('broiler_batches').select('*').eq('user_id', userId)).order('start_date', { ascending: false }),
      farmFilter(supabase.from('broiler_weights').select('*').eq('user_id', userId)).order('record_date', { ascending: false }),
      farmFilter(supabase.from('broiler_feed').select('*').eq('user_id', userId)).order('feed_date', { ascending: false }),
      farmFilter(supabase.from('alerts').select('*').eq('user_id', userId)).order('created_at', { ascending: false }).limit(500),
      farmFilter(supabase.from('daily_summary').select('*').eq('user_id', userId)).order('summary_date', { ascending: false }),
    ]);

  const wb = XLSX.utils.book_new();

  const sensorLabel = (k: SensorKey) => `${bn ? SENSOR_META[k].bn : SENSOR_META[k].en} (${SENSOR_META[k].unit})`;
  const deviceLabel = (k: DeviceKey) => (bn ? DEVICE_META[k].bn : DEVICE_META[k].en);

  // Sheet 1: Sensor ↔ Device ↔ Impact
  const corrSheet = XLSX.utils.json_to_sheet(
    correlated.map((r: any) => {
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

  // Sheet 2: hourly analysis
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

  // Sheet 3: device transitions
  const transitionRows = deviceCommands
    .filter((c) => ALL_DEVICES.includes(c.command_type as DeviceKey))
    .map((c) => ({
      [bn ? 'সময়' : 'Time']: new Date(c.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US'),
      [bn ? 'ডিভাইস' : 'Device']: bn
        ? DEVICE_META[c.command_type as DeviceKey]?.bn || c.command_type
        : DEVICE_META[c.command_type as DeviceKey]?.en || c.command_type,
      [bn ? 'অবস্থা' : 'State']: c.command_value ? (bn ? 'চালু' : 'ON') : (bn ? 'বন্ধ' : 'OFF'),
      [bn ? 'স্ট্যাটাস' : 'Status']: c.status,
    }));
  const transSheet = XLSX.utils.json_to_sheet(
    transitionRows.length > 0 ? transitionRows : [{ [bn ? 'তথ্য' : 'Info']: bn ? 'কোনো ট্রানজিশন নেই' : 'No transitions' }]
  );
  XLSX.utils.book_append_sheet(wb, transSheet, bn ? 'ডিভাইস ট্রানজিশন' : 'Device Transitions');

  // Sheet 4: runtime
  const runtimeSheet = XLSX.utils.json_to_sheet(
    runtime.map((r) => ({
      [bn ? 'ডিভাইস' : 'Device']: r.label,
      [bn ? 'মোট রানটাইম (মিনিট)' : 'Total runtime (min)']: r.minutes,
      [bn ? 'মোট রানটাইম (ঘণ্টা)' : 'Total runtime (hr)']: Number((r.minutes / 60).toFixed(2)),
    }))
  );
  XLSX.utils.book_append_sheet(wb, runtimeSheet, bn ? 'ডিভাইস রানটাইম' : 'Device Runtime');

  // Sheet 5: summary statistics
  const sensorStats = () => {
    if (correlated.length === 0) return [];
    const calc = (key: SensorKey, label: string, unit: string) => {
      const vals = correlated.map((r: any) => r[key] as number);
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), bn ? 'সারাংশ পরিসংখ্যান' : 'Summary Statistics');

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

  const ts = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${farmName}_report_${ts}.xlsx`);
}
