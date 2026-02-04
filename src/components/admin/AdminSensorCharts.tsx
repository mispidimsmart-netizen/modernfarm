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
    <div className="space-y-5">
      {/* Header with User Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-emerald-200 to-green-200 bg-clip-text text-transparent">
            {labels.title}
          </span>
        </h3>
        
        {/* User Selector with Search */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[280px] justify-between bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-emerald-500/30 text-white hover:bg-emerald-500/30 hover:border-emerald-400/50 transition-all shadow-lg"
            >
              <div className="flex items-center gap-2 truncate">
                {selectedUserId === 'all' ? (
                  <>
                    <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-100">{labels.allFarms}</span>
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

      {/* Stats Badges - Vibrant Gradient Pills */}
      <div className="flex flex-wrap gap-3">
        {selectedUserId !== 'all' && selectedProfile && (
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-green-500/30">
            <User className="w-3.5 h-3.5 mr-1.5" />
            {labels.selectedFarm}: {selectedProfile.farm_name}
          </Badge>
        )}
        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 px-4 py-1.5 shadow-lg shadow-orange-500/30">
          <Thermometer className="w-3.5 h-3.5 mr-1.5" />
          {labels.avgTemp}: {overallStats.avgTemp}°C
        </Badge>
        <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-cyan-500/30">
          <Droplets className="w-3.5 h-3.5 mr-1.5" />
          {labels.avgHumidity}: {overallStats.avgHumidity}%
        </Badge>
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-purple-500/30">
          <Wind className="w-3.5 h-3.5 mr-1.5" />
          {labels.avgAmmonia}: {overallStats.avgAmmonia} ppm
        </Badge>
        {selectedUserId === 'all' && (
          <Badge className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-indigo-500/30">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            {overallStats.farmCount} {labels.farms}
          </Badge>
        )}
        <Badge className="bg-gradient-to-r from-slate-600 to-slate-700 text-white border-0 px-4 py-1.5 shadow-lg">
          {overallStats.totalReadings} {labels.readings}
        </Badge>
      </div>

      {sensorData && sensorData.length > 0 ? (
        <>
          {/* Temperature, Humidity & Ammonia Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Temperature Trend */}
            <Card className="bg-gradient-to-br from-orange-950/40 via-slate-900/80 to-red-950/30 border-orange-500/20 shadow-xl shadow-orange-500/10 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/40">
                    <Thermometer className="w-4 h-4 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-orange-200 to-red-200 bg-clip-text text-transparent font-semibold">
                    {labels.temperatureTrend}
                  </span>
                </CardTitle>
                <p className="text-xs text-orange-300/60 ml-11">{labels.last24Hours}</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="hour"
                      stroke="#a1a1aa"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#a1a1aa"
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
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Humidity Trend */}
            <Card className="bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-blue-950/30 border-cyan-500/20 shadow-xl shadow-cyan-500/10 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                    <Droplets className="w-4 h-4 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent font-semibold">
                    {labels.humidityTrend}
                  </span>
                </CardTitle>
                <p className="text-xs text-cyan-300/60 ml-11">{labels.last24Hours}</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(195, 100%, 50%)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(195, 100%, 50%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="hour"
                      stroke="#a1a1aa"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#a1a1aa"
                      fontSize={10}
                      tickLine={false}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="avgHumidity"
                      stroke="hsl(195, 100%, 50%)"
                      fill="url(#humidityGradient)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Ammonia Trend (full width when viewing specific user) */}
          {selectedUserId !== 'all' && (
            <Card className="bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-pink-950/30 border-purple-500/20 shadow-xl shadow-purple-500/10 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
                    <Wind className="w-4 h-4 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent font-semibold">
                    অ্যামোনিয়া ট্রেন্ড
                  </span>
                </CardTitle>
                <p className="text-xs text-purple-300/60 ml-11">{labels.last24Hours}</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="ammoniaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="hour"
                      stroke="#a1a1aa"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#a1a1aa"
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
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Farm Comparison Bar Chart (only when all farms selected) */}
          {selectedUserId === 'all' && farmComparison.length > 0 && (
            <Card className="bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-violet-950/30 border-indigo-500/20 shadow-xl shadow-indigo-500/10 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-indigo-200 to-violet-200 bg-clip-text text-transparent font-semibold">
                    {labels.farmComparison}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <BarChart data={farmComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis type="number" stroke="#a1a1aa" fontSize={10} />
                    <YAxis
                      type="category"
                      dataKey="farmName"
                      stroke="#a1a1aa"
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
                      radius={[0, 6, 6, 0]}
                    />
                    <Bar
                      dataKey="avgHumidity"
                      name={labels.humidity}
                      fill="hsl(195, 100%, 50%)"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-800/80 border-slate-600/30 shadow-xl backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <RefreshCw className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-300 text-lg font-medium">{labels.noData}</p>
            {selectedUserId !== 'all' && (
              <p className="text-slate-500 text-sm mt-2">
                এই ইউজারের কোনো সেন্সর ডেটা পাওয়া যায়নি
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
