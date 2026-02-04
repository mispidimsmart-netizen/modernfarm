import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
  User,
  Wind,
  ChevronsUpDown,
  Check,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subHours } from 'date-fns';

const t = {
  bn: {
    title: 'রিয়েল-টাইম সেন্সর অ্যানালিটিক্স',
    temperatureTrend: 'তাপমাত্রা ট্রেন্ড',
    humidityTrend: 'আর্দ্রতা ট্রেন্ড',
    farmComparison: 'ফার্ম তুলনা',
    last24Hours: 'গত ২৪ ঘণ্টা',
    noData: 'কোনো সেন্সর ডেটা নেই',
    avgTemp: 'গড় তাপমাত্রা',
    avgHumidity: 'গড় আর্দ্রতা',
    avgAmmonia: 'গড় অ্যামোনিয়া',
    temperature: 'তাপমাত্রা',
    humidity: 'আর্দ্রতা',
    ammonia: 'অ্যামোনিয়া',
    farms: 'ফার্ম',
    loading: 'লোড হচ্ছে...',
    selectUser: 'ইউজার সিলেক্ট করুন',
    allFarms: 'সব ফার্ম',
    selectedFarm: 'নির্বাচিত ফার্ম',
    readings: 'রিডিং',
    searchPlaceholder: 'ইউজার খুঁজুন...',
    noUserFound: 'কোনো ইউজার পাওয়া যায়নি',
  },
  en: {
    title: 'Real-time Sensor Analytics',
    temperatureTrend: 'Temperature Trend',
    humidityTrend: 'Humidity Trend',
    farmComparison: 'Farm Comparison',
    last24Hours: 'Last 24 Hours',
    noData: 'No sensor data available',
    avgTemp: 'Avg Temperature',
    avgHumidity: 'Avg Humidity',
    avgAmmonia: 'Avg Ammonia',
    temperature: 'Temperature',
    humidity: 'Humidity',
    ammonia: 'Ammonia',
    farms: 'Farms',
    loading: 'Loading...',
    selectUser: 'Select User',
    allFarms: 'All Farms',
    selectedFarm: 'Selected Farm',
    readings: 'Readings',
    searchPlaceholder: 'Search users...',
    noUserFound: 'No user found',
  },
};

interface AdminSensorChartsProps {
  language?: 'bn' | 'en';
}

interface HourlyData {
  hour: string;
  avgTemp: number;
  avgHumidity: number;
  avgAmmonia: number;
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
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [open, setOpen] = useState(false);

  // Fetch all profiles for user selector
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles-for-charts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, farm_name, phone, avatar_url')
        .order('farm_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch 24-hour sensor data - filtered by selected user if any
  const { data: sensorData, isLoading } = useQuery({
    queryKey: ['admin-all-sensor-data', selectedUserId],
    queryFn: async () => {
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();
      
      let query = supabase
        .from('sensor_logs')
        .select('temperature, humidity, ammonia, timestamp, user_id')
        .gte('timestamp', twentyFourHoursAgo)
        .order('timestamp', { ascending: true });

      // Filter by selected user if not "all"
      if (selectedUserId !== 'all') {
        query = query.eq('user_id', selectedUserId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Process data for hourly trend chart
  const hourlyData: HourlyData[] = (() => {
    if (!sensorData || sensorData.length === 0) return [];

    const hourMap = new Map<string, { temps: number[]; humidities: number[]; ammonias: number[] }>();

    sensorData.forEach(reading => {
      const hour = format(new Date(reading.timestamp), 'HH:00');
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { temps: [], humidities: [], ammonias: [] });
      }
      const hourData = hourMap.get(hour)!;
      hourData.temps.push(reading.temperature);
      hourData.humidities.push(reading.humidity);
      hourData.ammonias.push(reading.ammonia);
    });

    return Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour,
        avgTemp: Math.round((data.temps.reduce((a, b) => a + b, 0) / data.temps.length) * 10) / 10,
        avgHumidity: Math.round((data.humidities.reduce((a, b) => a + b, 0) / data.humidities.length) * 10) / 10,
        avgAmmonia: Math.round((data.ammonias.reduce((a, b) => a + b, 0) / data.ammonias.length) * 10) / 10,
        count: data.temps.length,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  })();

  // Process data for farm comparison (only when "all" is selected)
  const farmComparison: FarmComparison[] = (() => {
    if (!sensorData || sensorData.length === 0 || !profiles || selectedUserId !== 'all') return [];

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
      return { avgTemp: 0, avgHumidity: 0, avgAmmonia: 0, totalReadings: 0, farmCount: 0 };
    }

    const temps = sensorData.map(s => s.temperature);
    const humidities = sensorData.map(s => s.humidity);
    const ammonias = sensorData.map(s => s.ammonia);
    const uniqueFarms = new Set(sensorData.map(s => s.user_id));

    return {
      avgTemp: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
      avgHumidity: Math.round((humidities.reduce((a, b) => a + b, 0) / humidities.length) * 10) / 10,
      avgAmmonia: Math.round((ammonias.reduce((a, b) => a + b, 0) / ammonias.length) * 10) / 10,
      totalReadings: sensorData.length,
      farmCount: uniqueFarms.size,
    };
  })();

  const selectedProfile = profiles?.find(p => p.id === selectedUserId);

  const chartConfig = {
    avgTemp: {
      label: labels.temperature,
      color: 'hsl(25, 95%, 53%)',
    },
    avgHumidity: {
      label: labels.humidity,
      color: 'hsl(210, 100%, 50%)',
    },
    avgAmmonia: {
      label: labels.ammonia,
      color: 'hsl(280, 80%, 60%)',
    },
  };

  if (isLoading || profilesLoading) {
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
      {/* Header with User Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          {labels.title}
        </h3>
        
        {/* User Selector with Search */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[280px] justify-between bg-slate-700/50 border-white/10 text-white hover:bg-slate-600/50"
            >
              <div className="flex items-center gap-2 truncate">
                {selectedUserId === 'all' ? (
                  <>
                    <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{labels.allFarms}</span>
                  </>
                ) : selectedProfile ? (
                  <>
                    {selectedProfile.avatar_url ? (
                      <img 
                        src={selectedProfile.avatar_url} 
                        alt="" 
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <span className="truncate">{selectedProfile.farm_name}</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{labels.selectUser}</span>
                  </>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0 bg-slate-800 border-white/10 z-50" align="end">
            <Command className="bg-slate-800">
              <CommandInput 
                placeholder={labels.searchPlaceholder} 
                className="h-9 bg-slate-800 text-white placeholder:text-gray-400 border-white/10"
              />
              <CommandList className="max-h-[300px]">
                <CommandEmpty className="py-3 text-center text-gray-400 text-sm">
                  {labels.noUserFound}
                </CommandEmpty>
                <CommandGroup>
                  {/* All Farms Option */}
                  <CommandItem
                    value="all-farms"
                    onSelect={() => {
                      setSelectedUserId('all');
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 text-white cursor-pointer hover:bg-slate-700 aria-selected:bg-slate-700"
                  >
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span>{labels.allFarms}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedUserId === 'all' ? "opacity-100 text-green-400" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                  
                  {/* Individual Users */}
                  {profiles?.map((profile) => (
                    <CommandItem
                      key={profile.id}
                      value={`${profile.farm_name} ${profile.phone || ''}`}
                      onSelect={() => {
                        setSelectedUserId(profile.id);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 text-white cursor-pointer hover:bg-slate-700 aria-selected:bg-slate-700"
                    >
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="" 
                          className="w-5 h-5 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center shrink-0">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{profile.farm_name}</span>
                        {profile.phone && (
                          <span className="text-xs text-gray-400">{profile.phone}</span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4 shrink-0",
                          selectedUserId === profile.id ? "opacity-100 text-green-400" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats Badges */}
      <div className="flex flex-wrap gap-2">
        {selectedUserId !== 'all' && selectedProfile && (
          <Badge variant="outline" className="border-green-500/30 text-green-400">
            <User className="w-3 h-3 mr-1" />
            {labels.selectedFarm}: {selectedProfile.farm_name}
          </Badge>
        )}
        <Badge variant="outline" className="border-orange-500/30 text-orange-400">
          <Thermometer className="w-3 h-3 mr-1" />
          {labels.avgTemp}: {overallStats.avgTemp}°C
        </Badge>
        <Badge variant="outline" className="border-blue-500/30 text-blue-400">
          <Droplets className="w-3 h-3 mr-1" />
          {labels.avgHumidity}: {overallStats.avgHumidity}%
        </Badge>
        <Badge variant="outline" className="border-purple-500/30 text-purple-400">
          <Wind className="w-3 h-3 mr-1" />
          {labels.avgAmmonia}: {overallStats.avgAmmonia} ppm
        </Badge>
        {selectedUserId === 'all' && (
          <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
            <Building2 className="w-3 h-3 mr-1" />
            {overallStats.farmCount} {labels.farms}
          </Badge>
        )}
        <Badge variant="outline" className="border-gray-500/30 text-gray-400">
          {overallStats.totalReadings} {labels.readings}
        </Badge>
      </div>

      {sensorData && sensorData.length > 0 ? (
        <>
          {/* Temperature, Humidity & Ammonia Trend Charts */}
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

          {/* Ammonia Trend (full width when viewing specific user) */}
          {selectedUserId !== 'all' && (
            <Card className="bg-slate-800/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Wind className="w-4 h-4 text-purple-400" />
                  অ্যামোনিয়া ট্রেন্ড
                </CardTitle>
                <p className="text-xs text-gray-400">{labels.last24Hours}</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="ammoniaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0} />
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
                      domain={[0, 'dataMax + 5']}
                      unit=" ppm"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="avgAmmonia"
                      stroke="hsl(280, 80%, 60%)"
                      fill="url(#ammoniaGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Farm Comparison Bar Chart (only when all farms selected) */}
          {selectedUserId === 'all' && farmComparison.length > 0 && (
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
            {selectedUserId !== 'all' && (
              <p className="text-gray-500 text-sm mt-2">
                এই ইউজারের কোনো সেন্সর ডেটা পাওয়া যায়নি
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
