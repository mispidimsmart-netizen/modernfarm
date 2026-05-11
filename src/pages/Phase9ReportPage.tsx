import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Cpu, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useFarmContext } from '@/context/FarmContext';
import {
  useSensorUpgradeSummary,
  useDeviceSensorInventory,
  useAirQualityAlerts,
} from '@/hooks/useAirQuality';

interface PreciseRow {
  recorded_at: string;
  temp_precise: number | null;
  humidity_precise: number | null;
  lux_precise: number | null;
  nh3_ppm_precise: number | null;
  co2_ppm: number | null;
  pm25_ugm3: number | null;
  pm10_ugm3: number | null;
  sensor_source: Record<string, unknown> | null;
}

function useRecentPreciseReadings(farmId: string | null) {
  return useQuery({
    queryKey: ['phase9-recent-precise', farmId],
    enabled: !!farmId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<PreciseRow[]> => {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('recorded_at,temp_precise,humidity_precise,lux_precise,nh3_ppm_precise,co2_ppm,pm25_ugm3,pm10_ugm3,sensor_source')
        .eq('farm_id', farmId!)
        .order('recorded_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PreciseRow[];
    },
  });
}

interface TestResult {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export default function Phase9ReportPage() {
  const navigate = useNavigate();
  const { selectedFarmId } = useFarmContext();
  const { data: summary, isLoading: sLoad, refetch: refetchSummary } = useSensorUpgradeSummary();
  const { data: inventory, refetch: refetchInv } = useDeviceSensorInventory();
  const { data: alerts, refetch: refetchAlerts } = useAirQualityAlerts(50);
  const { data: readings, isLoading: rLoad, refetch: refetchReadings } = useRecentPreciseReadings(selectedFarmId);

  const latest = readings?.[0];
  const lastRunAt = latest?.recorded_at ?? null;

  const has = (key: keyof PreciseRow) =>
    !!readings?.some((r) => r[key] !== null && r[key] !== undefined);

  const tests: TestResult[] = [
    {
      id: 'sht31',
      label: 'SHT31 — temp/humidity precise',
      passed: has('temp_precise') && has('humidity_precise'),
      detail: `temp_precise / humidity_precise কলামে ডেটা — ইনভেন্টরি ${summary?.sht31_count ?? 0}`,
    },
    {
      id: 'bh1750',
      label: 'BH1750 — lux precise',
      passed: has('lux_precise'),
      detail: `lux_precise কলাম — ইনভেন্টরি ${summary?.bh1750_count ?? 0}`,
    },
    {
      id: 'ze03',
      label: 'ZE03-NH3 — NH3 ppm',
      passed: has('nh3_ppm_precise'),
      detail: `nh3_ppm_precise — ইনভেন্টরি ${summary?.ze03_count ?? 0}`,
    },
    {
      id: 'scd41',
      label: 'SCD41 — CO₂ ppm',
      passed: has('co2_ppm'),
      detail: `co2_ppm — ইনভেন্টরি ${summary?.scd41_count ?? 0}`,
    },
    {
      id: 'pms5003',
      label: 'PMS5003 — PM2.5 / PM10',
      passed: has('pm25_ugm3') || has('pm10_ugm3'),
      detail: `pm25_ugm3 / pm10_ugm3 — ইনভেন্টরি ${summary?.pms5003_count ?? 0}`,
    },
    {
      id: 'co2_alert',
      label: 'Alert — CO₂ threshold (>3000)',
      passed: !!alerts?.some((a) => a.alert_type === 'co2_high'),
      detail: 'air_quality_alerts টেবিলে co2_high রেকর্ড',
    },
    {
      id: 'pm25_alert',
      label: 'Alert — PM2.5 threshold (>75)',
      passed: !!alerts?.some((a) => a.alert_type === 'pm25_high'),
      detail: 'air_quality_alerts টেবিলে pm25_high রেকর্ড',
    },
    {
      id: 'nh3_alert',
      label: 'Alert — NH3 threshold (>25)',
      passed: !!alerts?.some((a) => a.alert_type === 'nh3_high'),
      detail: 'air_quality_alerts টেবিলে nh3_high রেকর্ড',
    },
  ];

  const passed = tests.filter((t) => t.passed).length;
  const total = tests.length;
  const allPassed = passed === total;

  const alertCounts = (alerts ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.alert_type] = (acc[a.alert_type] ?? 0) + 1;
    return acc;
  }, {});

  const refetchAll = () => {
    refetchSummary();
    refetchInv();
    refetchAlerts();
    refetchReadings();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ফিরে যান">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Phase 9 — টেস্ট রিপোর্ট</h1>
            <p className="text-xs text-muted-foreground">
              শেষ রান:{' '}
              {lastRunAt
                ? new Date(lastRunAt).toLocaleString('bn-BD')
                : 'এখনো কোনো ডেটা নেই'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetchAll}>
            <RefreshCw className="h-4 w-4 mr-1" /> রিফ্রেশ
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Summary banner */}
        <Card className={allPassed ? 'border-primary' : 'border-destructive/50'}>
          <CardContent className="p-4 flex items-center gap-3">
            {allPassed ? (
              <CheckCircle2 className="h-8 w-8 text-primary" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            )}
            <div className="flex-1">
              <p className="text-2xl font-bold">
                {passed} / {total} টেস্ট পাশ
              </p>
              <p className="text-sm text-muted-foreground">
                {allPassed
                  ? 'সব Tier (1+2+3) সেন্সর ও alert সক্রিয়'
                  : 'কিছু সেন্সর/alert এখনো ভেরিফাই হয়নি'}
              </p>
            </div>
            <Badge variant={allPassed ? 'default' : 'destructive'}>
              {allPassed ? 'PASS' : 'PARTIAL'}
            </Badge>
          </CardContent>
        </Card>

        {/* Test checklist */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">টেস্ট চেকলিস্ট</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(sLoad || rLoad) && <Skeleton className="h-32 w-full" />}
            {!sLoad && !rLoad && tests.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                {t.passed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.detail}</p>
                </div>
                <Badge variant={t.passed ? 'default' : 'outline'} className="text-[10px]">
                  {t.passed ? 'PASS' : 'FAIL'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sensor counts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> সেন্সর কাউন্ট
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <Stat label="মোট ডিভাইস" value={summary?.total_devices ?? 0} />
              <Stat label="SHT31" value={summary?.sht31_count ?? 0} />
              <Stat label="BH1750" value={summary?.bh1750_count ?? 0} />
              <Stat label="ZE03-NH3" value={summary?.ze03_count ?? 0} />
              <Stat label="SCD41" value={summary?.scd41_count ?? 0} />
              <Stat label="PMS5003" value={summary?.pms5003_count ?? 0} />
              <Stat label="Tier 1 ডিভাইস" value={summary?.tier1_devices ?? 0} />
              <Stat label="Tier 2 ডিভাইস" value={summary?.tier2_devices ?? 0} />
              <Stat label="Tier 3 ডিভাইস" value={summary?.tier3_devices ?? 0} />
            </div>
          </CardContent>
        </Card>

        {/* Alert counts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Air Quality Alert কাউন্ট (সর্বশেষ ৫০)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Stat label="CO₂ high" value={alertCounts['co2_high'] ?? 0} />
              <Stat label="PM2.5 high" value={alertCounts['pm25_high'] ?? 0} />
              <Stat label="PM10 high" value={alertCounts['pm10_high'] ?? 0} />
              <Stat label="NH3 high" value={alertCounts['nh3_high'] ?? 0} />
            </div>
          </CardContent>
        </Card>

        {/* Recent inventory heartbeats */}
        {inventory && inventory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> সাম্প্রতিক ইনভেন্টরি Heartbeat
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Sensor</TableHead>
                    <TableHead>Last seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.slice(0, 10).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs truncate max-w-[140px]">
                        {s.device_id.slice(0, 16)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{s.sensor_model}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.last_seen_at).toLocaleString('bn-BD')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
