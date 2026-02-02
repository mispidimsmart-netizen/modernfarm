import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Egg, Droplet, Thermometer, BarChart3, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSensorReadings, useDailyReports, useUpsertDailyReport } from '@/hooks/useFarmData';
import { useLiveSensorData } from '@/hooks/useSensorData';
import { translations } from '@/lib/translations';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { CostAnalyticsDashboard } from '@/components/analytics/CostAnalyticsDashboard';

export function ReportsPage() {
  const { language } = useAuth();
  const sensorData = useLiveSensorData();
  const { data: sensorReadings } = useSensorReadings(24);
  const { data: dailyReports } = useDailyReports(7);
  const upsertReport = useUpsertDailyReport();
  
  const [eggCount, setEggCount] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const todayReport = dailyReports?.find(r => r.report_date === new Date().toISOString().split('T')[0]);

  // Generate chart data from sensor readings or mock data
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
    
    // Mock data for demo
    const data = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000);
      data.push({
        time: time.getHours().toString().padStart(2, '0') + ':00',
        temperature: 25 + Math.random() * 8,
        humidity: 55 + Math.random() * 20,
        ammonia: 8 + Math.random() * 12,
      });
    }
    return data;
  }, [sensorReadings, language]);

  const handleSaveEggs = () => {
    const count = parseInt(eggCount);
    if (!isNaN(count) && count >= 0) {
      upsertReport.mutate({
        report_date: new Date().toISOString().split('T')[0],
        egg_production: count,
      });
      setEggCount('');
    }
  };

  // Calculate daily averages from chart data
  const dailyAvgTemp = chartData.reduce((acc, d) => acc + d.temperature, 0) / chartData.length;
  const dailyAvgHumidity = chartData.reduce((acc, d) => acc + d.humidity, 0) / chartData.length;
  const totalWater = Math.round(sensorData.waterUsage * 24);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="section-title">{translations.reports.title[language]}</h2>

          {/* Tabs for Overview and Cost Analytics */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="gap-2">
                <TrendingUp size={16} />
                {language === 'bn' ? 'ওভারভিউ' : 'Overview'}
              </TabsTrigger>
              <TabsTrigger value="costs" className="gap-2">
                <BarChart3 size={16} />
                {language === 'bn' ? 'খরচ বিশ্লেষণ' : 'Cost Analytics'}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-6">
              {/* Daily Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-card p-3 text-center shadow-card">
                  <Thermometer size={20} className="mx-auto mb-1 text-sensor-temperature" />
                  <p className="text-lg font-bold">{dailyAvgTemp.toFixed(1)}°</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'গড় তাপ' : 'Avg Temp'}
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3 text-center shadow-card">
                  <Droplet size={20} className="mx-auto mb-1 text-sensor-water" />
                  <p className="text-lg font-bold">{totalWater}L</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'মোট পানি' : 'Total Water'}
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3 text-center shadow-card">
                  <Egg size={20} className="mx-auto mb-1 text-secondary" />
                  <p className="text-lg font-bold">{todayReport?.egg_production ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'ডিম' : 'Eggs'}
                  </p>
                </div>
              </div>

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

              {/* Egg Production Input */}
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <h3 className="mb-4 font-medium">
                  {translations.reports.eggProduction[language]}
                </h3>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    value={eggCount}
                    onChange={(e) => setEggCount(e.target.value)}
                    placeholder={translations.reports.enterCount[language]}
                    className="h-12 flex-1 text-lg"
                  />
                  <Button 
                    onClick={handleSaveEggs} 
                    className="h-12 px-6"
                    disabled={upsertReport.isPending}
                  >
                    {translations.common.save[language]}
                  </Button>
                </div>
                {todayReport?.egg_production !== undefined && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    {translations.common.today[language]}: {todayReport.egg_production} {translations.reports.eggs[language]}
                  </p>
                )}
              </div>
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
