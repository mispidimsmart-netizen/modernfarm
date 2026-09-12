import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { ALL_SENSORS, ALL_DEVICES, type SensorKey, type DeviceKey } from '@/lib/sensorDeviceImpact';
import { useSensorDeviceImpact, type Hours } from '@/hooks/useSensorDeviceImpact';
import { exportSensorImpactExcel } from '@/lib/sensorImpactExcel';
import { ImpactFilters } from './impact/ImpactFilters';
import { ImpactCharts } from './impact/ImpactCharts';
import { ImpactTable } from './impact/ImpactTable';

export function SensorDeviceImpactReport() {
  const { language, user } = useAuth();
  const { selectedFarmId, currentFarm } = useFarmContext();
  const { toast } = useToast();
  const [hours, setHours] = useState<Hours>(24);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState<Set<SensorKey>>(new Set(ALL_SENSORS));
  const [selectedDevices, setSelectedDevices] = useState<Set<DeviceKey>>(new Set(ALL_DEVICES));

  const bn = language === 'bn';

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

  const { loadingSensors, deviceCommands, correlated, runtime, hourlySummary } = useSensorDeviceImpact({
    userId: user?.id,
    selectedFarmId,
    hours,
    language,
    selectedDevices,
  });

  const visibleSensors = useMemo(() => ALL_SENSORS.filter((s) => selectedSensors.has(s)), [selectedSensors]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      if (!user) throw new Error('Not authenticated');
      await exportSensorImpactExcel({
        userId: user.id,
        selectedFarmId,
        farmName: currentFarm?.name_en || 'Farm',
        language,
        selectedSensors,
        selectedDevices,
        correlated,
        hourlySummary,
        runtime,
        deviceCommands,
      });
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

          <ImpactFilters
            bn={bn}
            selectedSensors={selectedSensors}
            selectedDevices={selectedDevices}
            setSelectedSensors={setSelectedSensors}
            setSelectedDevices={setSelectedDevices}
            toggleSensor={toggleSensor}
            toggleDevice={toggleDevice}
          />

          <ImpactCharts bn={bn} chartData={correlated} visibleSensors={visibleSensors} runtime={runtime} />

          <ImpactTable
            bn={bn}
            loading={loadingSensors}
            correlated={correlated}
            selectedSensors={selectedSensors}
            selectedDevices={selectedDevices}
          />

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
