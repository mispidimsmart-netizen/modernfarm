import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { 
  Thermometer, 
  Droplets, 
  TrendingUp,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { format, subHours, startOfDay, endOfDay } from 'date-fns';
import { bn } from 'date-fns/locale';

const t = {
  bn: {
    title: 'রিয়েল-টাইম সেন্সর অ্যানালিটিক্স',
    temperatureTrend: 'তাপমাত্রা ট্রেন্ড (সব ফার্ম)',
    humidityTrend: 'আর্দ্রতা ট্রেন্ড (সব ফার্ম)',
    farmComparison: 'ফার্ম তুলনা',
    last24Hours: 'গত ২৪ ঘণ্টা',
    noData: 'কোনো সেন্সর ডেটা নেই',
    avgTemp: 'গড় তাপমাত্রা',
    avgHumidity: 'গড় আর্দ্রতা',
    temperature: 'তাপমাত্রা',
    humidity: 'আর্দ্রতা',
    farms: 'ফার্ম',
    loading: 'লোড হচ্ছে...',
  },
  en: {
    title: 'Real-time Sensor Analytics',
    temperatureTrend: 'Temperature Trend (All Farms)',
    humidityTrend: 'Humidity Trend (All Farms)',
    farmComparison: 'Farm Comparison',
    last24Hours: 'Last 24 Hours',
    noData: 'No sensor data available',
    avgTemp: 'Avg Temperature',
    avgHumidity: 'Avg Humidity',
    temperature: 'Temperature',
    humidity: 'Humidity',
    farms: 'Farms',
    loading: 'Loading...',
  },
};

interface AdminSensorChartsProps {
  language?: 'bn' | 'en';
}

interface HourlyData {
  hour: string;
  avgTemp: number;
  avgHumidity: number;
  count: number;
}

interface FarmComparison {
  farmName: string;
  avgTemp: number;
  avgHumidity: number;
  readings: number;
}

export function AdminSensorCharts({ language = 'bn' }: AdminSensorChartsProps) {
  const labels = t[language];

  // Fetch 24-hour sensor data for all farms
  const { data: sensorData, isLoading } = useQuery({
    queryKey: ['admin-all-sensor-data'],
    queryFn: async () => {
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();
      
      const { data, error } = await supabase
        .from('sensor_logs')
        .select('temperature, humidity, ammonia, timestamp, user_id')
        .gte('timestamp', twentyFourHoursAgo)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch profiles to map user_id to farm names
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-for-charts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, farm_name');

      if (error) throw error;
      return data || [];
    },
  });

  // Process data for hourly trend chart
  const hourlyData: HourlyData[] = (() => {
    if (!sensorData || sensorData.length === 0) return [];

    const hourMap = new Map<string, { temps: number[]; humidities: number[] }>();

    sensorData.forEach(reading => {
      const hour = format(new Date(reading.timestamp), 'HH:00');
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { temps: [], humidities: [] });
      }
      const hourData = hourMap.get(hour)!;
      hourData.temps.push(reading.temperature);
      hourData.humidities.push(reading.humidity);
    });

    return Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour,
        avgTemp: Math.round((data.temps.reduce((a, b) => a + b, 0) / data.temps.length) * 10) / 10,
        avgHumidity: Math.round((data.humidities.reduce((a, b) => a + b, 0) / data.humidities.length) * 10) / 10,
        count: data.temps.length,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  })();

  // Process data for farm comparison
  const farmComparison: FarmComparison[] = (() => {
    if (!sensorData || sensorData.length === 0 || !profiles) return [];

    const farmMap = new Map<string, { temps: number[]; humidities: number[] }>();

    sensorData.forEach(reading => {
      const userId = reading.user_id;
      if (!farmMap.has(userId)) {
        farmMap.set(userId, { temps: [], humidities: [] });
      }
      const farmData = farmMap.get(userId)!;
      farmData.temps.push(reading.temperature);
      farmData.humidities.push(reading.humidity);
    });

    const profileMap = new Map(profiles.map(p => [p.id, p.farm_name]));

    return Array.from(farmMap.entries())
      .map(([userId, data]) => ({
        farmName: profileMap.get(userId) || 'Unknown',
        avgTemp: Math.round((data.temps.reduce((a, b) => a + b, 0) / data.temps.length) * 10) / 10,
        avgHumidity: Math.round((data.humidities.reduce((a, b) => a + b, 0) / data.humidities.length) * 10) / 10,
        readings: data.temps.length,
      }))
      .sort((a, b) => b.avgTemp - a.avgTemp);
  })();

  // Calculate overall stats
  const overallStats = (() => {
    if (!sensorData || sensorData.length === 0) {
      return { avgTemp: 0, avgHumidity: 0, totalReadings: 0, farmCount: 0 };
    }

    const temps = sensorData.map(s => s.temperature);
    const humidities = sensorData.map(s => s.humidity);
    const uniqueFarms = new Set(sensorData.map(s => s.user_id));

    return {
      avgTemp: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
      avgHumidity: Math.round((humidities.reduce((a, b) => a + b, 0) / humidities.length) * 10) / 10,
      totalReadings: sensorData.length,
      farmCount: uniqueFarms.size,
    };
  })();

  const chartConfig = {
    avgTemp: {
      label: labels.temperature,
      color: 'hsl(25, 95%, 53%)',
    },
    avgHumidity: {
      label: labels.humidity,
      color: 'hsl(210, 100%, 50%)',
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-700/50" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[300px] bg-slate-700/50" />
          <Skeleton className="h-[300px] bg-slate-700/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          {labels.title}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-orange-500/30 text-orange-400">
            <Thermometer className="w-3 h-3 mr-1" />
            {labels.avgTemp}: {overallStats.avgTemp}°C
          </Badge>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400">
            <Droplets className="w-3 h-3 mr-1" />
            {labels.avgHumidity}: {overallStats.avgHumidity}%
          </Badge>
          <Badge variant="outline" className="border-purple-500/30 text-purple-400">
            <Building2 className="w-3 h-3 mr-1" />
            {overallStats.farmCount} {labels.farms}
          </Badge>
        </div>
      </div>

      {sensorData && sensorData.length > 0 ? (
        <>
          {/* Temperature & Humidity Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Temperature Trend */}
            <Card className="bg-slate-800/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  {labels.temperatureTrend}
                </CardTitle>
                <p className="text-xs text-gray-400">{labels.last24Hours}</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="hour"
                      stroke="#9ca3af"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={10}
                      tickLine={false}
                      domain={['dataMin - 2', 'dataMax + 2']}
                      unit="°C"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="avgTemp"
                      stroke="hsl(25, 95%, 53%)"
                      fill="url(#tempGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Humidity Trend */}
            <Card className="bg-slate-800/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  {labels.humidityTrend}
                </CardTitle>
                <p className="text-xs text-gray-400">{labels.last24Hours}</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="hour"
                      stroke="#9ca3af"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={10}
                      tickLine={false}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="avgHumidity"
                      stroke="hsl(210, 100%, 50%)"
                      fill="url(#humidityGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Farm Comparison Bar Chart */}
          {farmComparison.length > 0 && (
            <Card className="bg-slate-800/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  {labels.farmComparison}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <BarChart data={farmComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                    <YAxis
                      type="category"
                      dataKey="farmName"
                      stroke="#9ca3af"
                      fontSize={10}
                      width={100}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar
                      dataKey="avgTemp"
                      name={labels.temperature}
                      fill="hsl(25, 95%, 53%)"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="avgHumidity"
                      name={labels.humidity}
                      fill="hsl(210, 100%, 50%)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-slate-800/50 border-white/10">
          <CardContent className="py-12 text-center">
            <RefreshCw className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">{labels.noData}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
