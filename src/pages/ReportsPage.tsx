import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Droplet, Thermometer, BarChart3, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSensorReadings } from '@/hooks/useFarmData';
import { useLiveSensorData } from '@/hooks/useSensorData';
import { translations } from '@/lib/translations';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { CostAnalyticsDashboard } from '@/components/analytics/CostAnalyticsDashboard';
import { FarmPerformanceView } from '@/components/analytics/FarmPerformanceView';
import { DailyLightSummaryCard } from '@/components/dashboard/DailyLightSummaryCard';
import { LightTrendChart } from '@/components/dashboard/LightTrendChart';
export function ReportsPage() {
  const { language } = useAuth();
  const [searchParams] = useSearchParams();
  const sensorData = useLiveSensorData();
  const { data: sensorReadings } = useSensorReadings(24);
  
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === 'costs' ? 'costs' : tabFromUrl === 'performance' ? 'performance' : 'overview'
  );
  
  useEffect(() => {
    if (['costs', 'overview', 'performance'].includes(tabFromUrl || '')) {
      setActiveTab(tabFromUrl!);
    }
  }, [tabFromUrl]);

  // Generate chart data from REAL sensor readings only — no mock data
  const chartData = useMemo(() => {
    if (sensorReadings && sensorReadings.length > 0) {
      return sensorReadings.map(r => ({
        time: new Date(r.recorded_at).toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        temperature: Number(r.temperature),
        humidity: Number(r.humidity),
        ammonia: Number(r.ammonia),
      }));
    }
    return [];
  }, [sensorReadings, language]);

  const hasData = chartData.length > 0;

  // Calculate daily averages from real chart data only
  const dailyAvgTemp = hasData ? chartData.reduce((acc, d) => acc + d.temperature, 0) / chartData.length : 0;
  const dailyAvgHumidity = hasData ? chartData.reduce((acc, d) => acc + d.humidity, 0) / chartData.length : 0;
  const totalWater = Math.round((sensorData.waterUsage || 0) * 24);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="section-title">{translations.reports.title[language]}</h2>

          {/* Tabs for Overview, Performance and Cost Analytics */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
                <TrendingUp size={14} />
                <span className="hidden xs:inline">{language === 'bn' ? 'ওভারভিউ' : 'Overview'}</span>
                <span className="xs:hidden">{language === 'bn' ? 'ওভার' : 'Over'}</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-1 text-xs sm:text-sm">
                <Award size={14} />
                <span className="hidden xs:inline">{language === 'bn' ? 'পারফরম্যান্স' : 'Performance'}</span>
                <span className="xs:hidden">{language === 'bn' ? 'পার্ফম' : 'Perf'}</span>
              </TabsTrigger>
              <TabsTrigger value="costs" className="gap-1 text-xs sm:text-sm">
                <BarChart3 size={14} />
                <span className="hidden xs:inline">{language === 'bn' ? 'খরচ' : 'Costs'}</span>
                <span className="xs:hidden">{language === 'bn' ? 'খরচ' : 'Cost'}</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-6">
              {/* Daily Summary Cards */}
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

              {/* Daily Light Summary (only if LDR installed) */}
              <DailyLightSummaryCard />

              {/* 24h Light Trend Chart (only if LDR installed) */}
              <LightTrendChart />

              {/* Temperature Chart */}
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <h3 className="mb-4 font-medium">
                  {translations.reports.last24Hours[language]} - {translations.sensors.temperature[language]}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="hsl(var(--sensor-temperature))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Humidity Chart */}
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <h3 className="mb-4 font-medium">
                  {translations.reports.last24Hours[language]} - {translations.sensors.humidity[language]}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="humidity"
                        stroke="hsl(var(--sensor-humidity))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="mt-4">
              <FarmPerformanceView />
            </TabsContent>

            {/* Cost Analytics Tab */}
            <TabsContent value="costs" className="mt-4">
              <CostAnalyticsDashboard />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
