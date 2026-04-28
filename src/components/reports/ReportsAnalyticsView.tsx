import { useState, useMemo } from 'react';
import { Droplet, Thermometer, BarChart3, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSensorReadings } from '@/hooks/useFarmData';
import { useLiveSensorData } from '@/hooks/useSensorData';
import { translations } from '@/lib/translations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { CostAnalyticsDashboard } from '@/components/analytics/CostAnalyticsDashboard';
import { FarmPerformanceView } from '@/components/analytics/FarmPerformanceView';
import { DailyLightSummaryCard } from '@/components/dashboard/DailyLightSummaryCard';
import { LightTrendChart } from '@/components/dashboard/LightTrendChart';

/**
 * ReportsAnalyticsView — embeddable version of the old /reports page.
 * Shows Overview / Performance / Costs tabs without page chrome (Header/BottomNav).
 */
export function ReportsAnalyticsView() {
  const { language } = useAuth();
  const sensorData = useLiveSensorData();
  const { data: sensorReadings } = useSensorReadings(24);

  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'costs'>('overview');

  const chartData = useMemo(() => {
    if (sensorReadings && sensorReadings.length > 0) {
      return sensorReadings.map(r => ({
        time: new Date(r.recorded_at).toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        temperature: Number(r.temperature),
        humidity: Number(r.humidity),
        ammonia: Number(r.ammonia),
      }));
    }
    return [];
  }, [sensorReadings, language]);

  const hasData = chartData.length > 0;
  const dailyAvgTemp = hasData ? chartData.reduce((acc, d) => acc + d.temperature, 0) / chartData.length : 0;
  const totalWater = Math.round((sensorData.waterUsage || 0) * 24);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
          <TrendingUp size={14} />
          <span>{language === 'bn' ? 'ওভারভিউ' : 'Overview'}</span>
        </TabsTrigger>
        <TabsTrigger value="performance" className="gap-1 text-xs sm:text-sm">
          <Award size={14} />
          <span>{language === 'bn' ? 'পারফরম্যান্স' : 'Performance'}</span>
        </TabsTrigger>
        <TabsTrigger value="costs" className="gap-1 text-xs sm:text-sm">
          <BarChart3 size={14} />
          <span>{language === 'bn' ? 'খরচ' : 'Costs'}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card p-4 text-center shadow-card">
            <Thermometer size={24} className="mx-auto mb-2 text-sensor-temperature" />
            <p className="text-2xl font-bold">{dailyAvgTemp.toFixed(1)}°C</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'গড় তাপমাত্রা' : 'Avg Temperature'}
            </p>
          </div>
          <div className="rounded-xl bg-card p-4 text-center shadow-card">
            <Droplet size={24} className="mx-auto mb-2 text-sensor-water" />
            <p className="text-2xl font-bold">{totalWater}L</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'মোট পানি ব্যবহার' : 'Total Water Usage'}
            </p>
          </div>
        </div>

        <DailyLightSummaryCard />
        <LightTrendChart />

        <div className="rounded-2xl bg-card p-4 shadow-card">
          <h3 className="mb-4 font-medium">
            {translations.reports.last24Hours[language]} - {translations.sensors.temperature[language]}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="temperature" stroke="hsl(var(--sensor-temperature))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-card">
          <h3 className="mb-4 font-medium">
            {translations.reports.last24Hours[language]} - {translations.sensors.humidity[language]}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="humidity" stroke="hsl(var(--sensor-humidity))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="performance" className="mt-4">
        <FarmPerformanceView />
      </TabsContent>

      <TabsContent value="costs" className="mt-4">
        <CostAnalyticsDashboard />
      </TabsContent>
    </Tabs>
  );
}
