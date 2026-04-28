import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, TrendingUp, Wind, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SensorCharts() {
  const { language } = useAuth();
  const { data: historyData, isLoading } = useSensorHistory(24);

  const labels = {
    title: language === 'bn' ? 'সেন্সর ট্রেন্ড' : 'Sensor Trends',
    temperature: language === 'bn' ? 'তাপমাত্রা' : 'Temperature',
    humidity: language === 'bn' ? 'আর্দ্রতা' : 'Humidity',
    ammonia: language === 'bn' ? 'অ্যামোনিয়া' : 'Ammonia',
    noData: language === 'bn' ? 'কোনো ডেটা নেই' : 'No data available',
    last24h: language === 'bn' ? 'গত ২৪ ঘণ্টা' : 'Last 24 hours',
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-card p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-[220px] w-full rounded-2xl" />
      </div>
    );
  }

  // Show empty state if no real sensor data
  if (!historyData || historyData.length === 0) {
    return (
      <div className="rounded-3xl bg-card p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-base">{labels.title}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">{labels.noData}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {language === 'bn'
              ? 'ডিভাইস কানেক্ট হলে ডেটা এখানে দেখানো হবে'
              : 'Data will appear here once your device is connected'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = historyData;

  // Calculate stats from real data
  const temps = chartData.map(d => d.temperature);
  const humids = chartData.map(d => d.humidity);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const avgHumid = humids.reduce((a, b) => a + b, 0) / humids.length;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="rounded-3xl bg-card p-5 shadow-card border border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {labels.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
            <Activity className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground font-medium">{labels.last24h}</span>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl bg-orange-500/10 dark:bg-orange-500/20 p-2.5 border border-orange-500/30">
            <div className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mb-0.5">
              {language === 'bn' ? 'গড় তাপ' : 'Avg Temp'}
            </div>
            <div className="text-lg font-bold text-foreground">{avgTemp.toFixed(1)}°</div>
          </div>
          <div className="rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 p-2.5 border border-cyan-500/30">
            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium mb-0.5">
              {language === 'bn' ? 'গড় আর্দ্রতা' : 'Avg Humid'}
            </div>
            <div className="text-lg font-bold text-foreground">{avgHumid.toFixed(0)}%</div>
          </div>
          <div className="rounded-xl bg-rose-500/10 dark:bg-rose-500/20 p-2.5 border border-rose-500/30">
            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mb-0.5">
              {language === 'bn' ? 'সর্বোচ্চ' : 'Max'}
            </div>
            <div className="text-lg font-bold text-foreground">{maxTemp.toFixed(1)}°</div>
          </div>
          <div className="rounded-xl bg-sky-500/10 dark:bg-sky-500/20 p-2.5 border border-sky-500/30">
            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mb-0.5">
              {language === 'bn' ? 'সর্বনিম্ন' : 'Min'}
            </div>
            <div className="text-lg font-bold text-foreground">{minTemp.toFixed(1)}°</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="temperature" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted border border-border rounded-xl p-1">
            <TabsTrigger 
              value="temperature" 
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg text-muted-foreground"
            >
              <Thermometer className="h-3.5 w-3.5" />
              {labels.temperature}
            </TabsTrigger>
            <TabsTrigger 
              value="humidity" 
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg text-muted-foreground"
            >
              <Droplets className="h-3.5 w-3.5" />
              {labels.humidity}
            </TabsTrigger>
            <TabsTrigger 
              value="ammonia" 
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg text-muted-foreground"
            >
              <Wind className="h-3.5 w-3.5" />
              {labels.ammonia}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temperature" className="mt-0">
            <div className="h-[200px] w-full rounded-2xl bg-muted/50 p-3 border border-border">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(249, 115, 22, 0.3)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    }}
                    labelStyle={{ color: 'white', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value.toFixed(1)}°C`, labels.temperature]}
                  />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fill="url(#tempGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#f97316', stroke: 'white', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="humidity" className="mt-0">
            <div className="h-[200px] w-full rounded-2xl bg-muted/50 p-3 border border-border">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="humidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    }}
                    labelStyle={{ color: 'white', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, labels.humidity]}
                  />
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fill="url(#humidGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#06b6d4', stroke: 'white', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="ammonia" className="mt-0">
            <div className="h-[200px] w-full rounded-2xl bg-muted/50 p-3 border border-border">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ammoniaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#a855f7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 50]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    }}
                    labelStyle={{ color: 'white', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value.toFixed(1)} ppm`, labels.ammonia]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ammonia"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="url(#ammoniaGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#8b5cf6', stroke: 'white', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}

