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
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-700/80 to-slate-800/90 p-5 shadow-xl border border-slate-600/60">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-[220px] w-full rounded-2xl" />
      </div>
    );
  }

  // If no historical data, show a placeholder with current data simulation
  const chartData = historyData && historyData.length > 0 ? historyData : generateMockData();

  // Calculate stats
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
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-700/80 to-slate-800/90 p-5 shadow-xl border border-slate-600/60 dark:from-slate-800/95 dark:via-slate-700/85 dark:to-slate-800/95 dark:border-slate-500/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              {labels.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-white/80 font-medium">{labels.last24h}</span>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/10 p-2.5 border border-orange-500/30">
            <div className="text-[10px] text-orange-300 font-medium mb-0.5">
              {language === 'bn' ? 'গড় তাপ' : 'Avg Temp'}
            </div>
            <div className="text-lg font-bold text-white">{avgTemp.toFixed(1)}°</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 p-2.5 border border-cyan-500/30">
            <div className="text-[10px] text-cyan-300 font-medium mb-0.5">
              {language === 'bn' ? 'গড় আর্দ্রতা' : 'Avg Humid'}
            </div>
            <div className="text-lg font-bold text-white">{avgHumid.toFixed(0)}%</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/10 p-2.5 border border-rose-500/30">
            <div className="text-[10px] text-rose-300 font-medium mb-0.5">
              {language === 'bn' ? 'সর্বোচ্চ' : 'Max'}
            </div>
            <div className="text-lg font-bold text-white">{maxTemp.toFixed(1)}°</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 p-2.5 border border-sky-500/30">
            <div className="text-[10px] text-sky-300 font-medium mb-0.5">
              {language === 'bn' ? 'সর্বনিম্ন' : 'Min'}
            </div>
            <div className="text-lg font-bold text-white">{minTemp.toFixed(1)}°</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="temperature" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-white/5 border border-white/10 rounded-xl p-1">
            <TabsTrigger 
              value="temperature" 
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 rounded-lg text-white/70"
            >
              <Thermometer className="h-3.5 w-3.5" />
              {labels.temperature}
            </TabsTrigger>
            <TabsTrigger 
              value="humidity" 
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 rounded-lg text-white/70"
            >
              <Droplets className="h-3.5 w-3.5" />
              {labels.humidity}
            </TabsTrigger>
            <TabsTrigger 
              value="ammonia" 
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 rounded-lg text-white/70"
            >
              <Wind className="h-3.5 w-3.5" />
              {labels.ammonia}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temperature" className="mt-0">
            <div className="h-[200px] w-full rounded-2xl bg-black/20 p-3 border border-white/5">
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
            <div className="h-[200px] w-full rounded-2xl bg-black/20 p-3 border border-white/5">
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
            <div className="h-[200px] w-full rounded-2xl bg-black/20 p-3 border border-white/5">
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

// Generate mock data when no real data exists
function generateMockData() {
  const data = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now);
    time.setHours(time.getHours() - i);
    
    data.push({
      time: time.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      temperature: 25 + Math.sin(i / 4) * 5 + Math.random() * 2,
      humidity: 60 + Math.cos(i / 3) * 10 + Math.random() * 5,
      ammonia: 10 + Math.random() * 5,
      water_usage: 40 + Math.random() * 20,
    });
  }
  
  return data;
}
