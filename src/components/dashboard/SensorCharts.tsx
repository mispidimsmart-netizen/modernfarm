import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Thermometer, Droplets, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SensorCharts() {
  const { language } = useAuth();
  const { data: historyData, isLoading } = useSensorHistory(24);

  const labels = {
    title: language === 'bn' ? 'সেন্সর ট্রেন্ড' : 'Sensor Trends',
    temperature: language === 'bn' ? 'তাপমাত্রা' : 'Temperature',
    humidity: language === 'bn' ? 'আর্দ্রতা' : 'Humidity',
    noData: language === 'bn' ? 'কোনো ডেটা নেই' : 'No data available',
    last24h: language === 'bn' ? 'গত ২৪ ঘণ্টা' : 'Last 24 hours',
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // If no historical data, show a placeholder with current data simulation
  const chartData = historyData && historyData.length > 0 ? historyData : generateMockData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              {labels.title}
            </CardTitle>
            <span className="text-xs text-muted-foreground">{labels.last24h}</span>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <Tabs defaultValue="temperature" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="temperature" className="flex items-center gap-1.5 text-xs">
                <Thermometer className="h-3.5 w-3.5" />
                {labels.temperature}
              </TabsTrigger>
              <TabsTrigger value="humidity" className="flex items-center gap-1.5 text-xs">
                <Droplets className="h-3.5 w-3.5" />
                {labels.humidity}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="temperature" className="mt-0">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={['dataMin - 2', 'dataMax + 2']}
                      className="fill-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`${value.toFixed(1)}°C`, labels.temperature]}
                    />
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      fill="url(#tempGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="humidity" className="mt-0">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="humidGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      className="fill-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, labels.humidity]}
                    />
                    <Area
                      type="monotone"
                      dataKey="humidity"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      fill="url(#humidGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
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
