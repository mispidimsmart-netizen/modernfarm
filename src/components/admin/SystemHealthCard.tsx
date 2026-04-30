import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  WifiOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  ChevronsUpDown,
  Check,
  User,
  Cpu,
  Battery,
  Clock,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SystemHealthCardProps {
  language?: 'bn' | 'en';
}

const t = {
  bn: {
    systemHealth: 'সিস্টেম হেলথ',
    database: 'ডেটাবেজ',
    connected: 'সংযুক্ত',
    disconnected: 'বিচ্ছিন্ন',
    recentActivity: 'সাম্প্রতিক কার্যকলাপ',
    noActivity: 'কোনো কার্যকলাপ নেই',
    deviceStatus: 'ডিভাইস স্ট্যাটাস',
    online: 'অনলাইন',
    offline: 'অফলাইন',
    lastSeen: 'শেষ দেখা',
    sensorLogs: 'সেন্সর লগ (আজ)',
    automationRuns: 'অটোমেশন রান',
    powerOutages: 'বিদ্যুৎ বিভ্রাট',
    errorLogs: 'এরর লগ',
    noErrors: 'কোনো এরর নেই',
    systemOk: 'সিস্টেম স্বাভাবিক',
    allUsers: 'সকল ইউজার',
    selectUser: 'ইউজার নির্বাচন করুন',
    searchPlaceholder: 'নাম বা ফোন দিয়ে খুঁজুন...',
    noUserFound: 'কোনো ইউজার পাওয়া যায়নি',
    userHealth: 'ইউজার হেলথ',
    noDeviceData: 'কোনো ডিভাইস ডেটা নেই',
    mode: 'মোড',
    battery: 'ব্যাটারি',
    signal: 'সিগন্যাল',
    uptime: 'আপটাইম',
    lastSync: 'শেষ সিঙ্ক',
    firmware: 'ফার্মওয়্যার',
    alertsToday: 'আজকের অ্যালার্ট',
    sensorHealth: 'সেন্সর হেলথ',
    temperature: 'তাপমাত্রা',
    humidity: 'আর্দ্রতা',
    ammonia: 'অ্যামোনিয়া',
    waterFlow: 'পানি প্রবাহ',
    working: 'সচল',
    notWorking: 'অচল',
    noData: 'ডেটা নেই',
    lastReading: 'শেষ রিডিং',
    outOfRange: 'অস্বাভাবিক',
    normal: 'স্বাভাবিক',
    attentionRequired: 'মনোযোগ প্রয়োজন',
    problemUsers: 'সমস্যাযুক্ত ইউজার',
    noProblem: 'সকল সিস্টেম স্বাভাবিক',
    deviceOffline: 'ডিভাইস অফলাইন',
    noSensorData: 'সেন্সর ডেটা নেই',
    powerOutage: 'বিদ্যুৎ বিভ্রাট',
    criticalAlert: 'জরুরি অ্যালার্ট',
    viewDetails: 'বিস্তারিত দেখুন',
  },
  en: {
    systemHealth: 'System Health',
    database: 'Database',
    connected: 'Connected',
    disconnected: 'Disconnected',
    recentActivity: 'Recent Activity',
    noActivity: 'No activity',
    deviceStatus: 'Device Status',
    online: 'Online',
    offline: 'Offline',
    lastSeen: 'Last seen',
    sensorLogs: 'Sensor Logs (Today)',
    automationRuns: 'Automation Runs',
    powerOutages: 'Power Outages',
    errorLogs: 'Error Logs',
    noErrors: 'No errors',
    systemOk: 'System OK',
    allUsers: 'All Users',
    selectUser: 'Select User',
    searchPlaceholder: 'Search by name or phone...',
    noUserFound: 'No user found',
    userHealth: 'User Health',
    noDeviceData: 'No device data',
    mode: 'Mode',
    battery: 'Battery',
    signal: 'Signal',
    uptime: 'Uptime',
    lastSync: 'Last Sync',
    firmware: 'Firmware',
    alertsToday: 'Alerts Today',
    sensorHealth: 'Sensor Health',
    temperature: 'Temperature',
    humidity: 'Humidity',
    ammonia: 'Ammonia',
    waterFlow: 'Water Flow',
    working: 'Working',
    notWorking: 'Not Working',
    noData: 'No Data',
    lastReading: 'Last Reading',
    outOfRange: 'Out of Range',
    normal: 'Normal',
    attentionRequired: 'Attention Required',
    problemUsers: 'Problem Users',
    noProblem: 'All Systems Normal',
    deviceOffline: 'Device Offline',
    noSensorData: 'No Sensor Data',
    powerOutage: 'Power Outage',
    criticalAlert: 'Critical Alert',
    viewDetails: 'View Details',
  },
};

export function SystemHealthCard({ language = 'bn' }: SystemHealthCardProps) {
  const labels = t[language];
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  // Fetch all profiles for user selector with farm_type
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-for-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, farm_name, phone, avatar_url, farm_type')
        .order('farm_name');
      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        farm_type: (p as any).farm_type || 'layer',
      }));
    },
  });

  const selectedUser = profiles?.find(p => p.id === selectedUserId);

  // Detect problem users
  const { data: problemUsers, isLoading: loadingProblems } = useQuery({
    queryKey: ['admin-problem-users'],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Get users with offline devices
      const { data: offlineDevices } = await supabase
        .from('device_health')
        .select('user_id, is_online, last_seen_at')
        .eq('is_online', false);

      // Get users with ongoing power outages
      const { data: powerOutages } = await supabase
        .from('power_outages')
        .select('user_id')
        .eq('is_ongoing', true);

      // Get users with critical alerts today
      const { data: criticalAlerts } = await supabase
        .from('alerts')
        .select('user_id')
        .eq('severity', 'danger')
        .gte('created_at', todayStr);

      // Get users with no recent sensor data (no data in last hour)
      const { data: recentSensorUsers } = await supabase
        .from('sensor_readings')
        .select('user_id')
        .gte('recorded_at', oneHourAgo);

      const recentUserIds = new Set(recentSensorUsers?.map(s => s.user_id) || []);
      const allUserIds = new Set(profiles?.map(p => p.id) || []);
      
      // Users without recent sensor data
      const noDataUserIds = [...allUserIds].filter(id => !recentUserIds.has(id));

      // Compile problem users
      const problemMap: Record<string, { 
        userId: string; 
        issues: Array<{ type: string; detail?: string }>;
      }> = {};

      // Add offline device users
      offlineDevices?.forEach(d => {
        if (!problemMap[d.user_id]) {
          problemMap[d.user_id] = { userId: d.user_id, issues: [] };
        }
        problemMap[d.user_id].issues.push({ 
          type: 'device_offline',
          detail: d.last_seen_at ? formatDistanceToNow(new Date(d.last_seen_at), { addSuffix: true, locale: bn }) : undefined
        });
      });

      // Add power outage users
      powerOutages?.forEach(p => {
        if (!problemMap[p.user_id]) {
          problemMap[p.user_id] = { userId: p.user_id, issues: [] };
        }
        if (!problemMap[p.user_id].issues.find(i => i.type === 'power_outage')) {
          problemMap[p.user_id].issues.push({ type: 'power_outage' });
        }
      });

      // Add critical alert users
      criticalAlerts?.forEach(a => {
        if (!problemMap[a.user_id]) {
          problemMap[a.user_id] = { userId: a.user_id, issues: [] };
        }
        if (!problemMap[a.user_id].issues.find(i => i.type === 'critical_alert')) {
          problemMap[a.user_id].issues.push({ type: 'critical_alert' });
        }
      });

      // Add no sensor data users
      noDataUserIds.forEach(userId => {
        if (!problemMap[userId]) {
          problemMap[userId] = { userId, issues: [] };
        }
        problemMap[userId].issues.push({ type: 'no_sensor_data' });
      });

      // Map to profiles
      return Object.values(problemMap).map(p => ({
        ...p,
        profile: profiles?.find(profile => profile.id === p.userId),
      })).filter(p => p.profile); // Only include users with profiles
    },
    enabled: !!profiles && profiles.length > 0,
    refetchInterval: 60000,
  });

  // Check database connection
  const { data: dbStatus, isLoading: loadingDb } = useQuery({
    queryKey: ['admin-db-status'],
    queryFn: async () => {
      const start = Date.now();
      try {
        const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const latency = Date.now() - start;
        return { connected: !error, latency, error: error?.message };
      } catch (e) {
        return { connected: false, latency: 0, error: String(e) };
      }
    },
    refetchInterval: 30000,
  });

  // Get today's activity stats - filtered by user
  const { data: activityStats, isLoading: loadingActivity } = useQuery({
    queryKey: ['admin-activity-stats', selectedUserId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Sensor readings today
      let sensorQuery = supabase
        .from('sensor_readings')
        .select('*', { count: 'exact', head: true })
        .gte('recorded_at', todayStr);
      
      if (selectedUserId !== 'all') {
        sensorQuery = sensorQuery.eq('user_id', selectedUserId);
      }
      const { count: sensorLogsCount } = await sensorQuery;

      // Power outages (ongoing)
      let outageQuery = supabase
        .from('power_outages')
        .select('*', { count: 'exact', head: true })
        .eq('is_ongoing', true);
      
      if (selectedUserId !== 'all') {
        outageQuery = outageQuery.eq('user_id', selectedUserId);
      }
      const { count: ongoingOutages } = await outageQuery;

      // Device health
      let deviceQuery = supabase
        .from('device_health')
        .select('is_online, last_seen_at, failsafe_mode')
        .order('last_seen_at', { ascending: false })
        .limit(20);
      
      if (selectedUserId !== 'all') {
        deviceQuery = deviceQuery.eq('user_id', selectedUserId);
      }
      const { data: devices } = await deviceQuery;

      const onlineDevices = devices?.filter(d => d.is_online).length || 0;
      const totalDevices = devices?.length || 0;
      const failsafeDevices = devices?.filter(d => d.failsafe_mode).length || 0;

      // Alerts today
      let alertQuery = supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr);
      
      if (selectedUserId !== 'all') {
        alertQuery = alertQuery.eq('user_id', selectedUserId);
      }
      const { count: alertsCount } = await alertQuery;

      return {
        sensorLogsToday: sensorLogsCount || 0,
        ongoingOutages: ongoingOutages || 0,
        onlineDevices,
        totalDevices,
        failsafeDevices,
        alertsToday: alertsCount || 0,
      };
    },
    refetchInterval: 60000,
  });

  // Get detailed device info for selected user
  const { data: userDeviceHealth, isLoading: loadingUserDevice } = useQuery({
    queryKey: ['admin-user-device-health', selectedUserId],
    queryFn: async () => {
      if (selectedUserId === 'all') return null;

      const { data, error } = await supabase
        .from('device_health')
        .select(`
          id,
          is_online,
          last_seen_at,
          failsafe_mode,
          mode,
          wifi_signal_strength,
          battery_percentage,
          uptime_seconds,
          firmware_version,
          last_cloud_sync_at,
          cpu_temperature,
          free_memory_bytes,
          power_source,
          device_token_id,
          device_tokens!inner(device_name)
        `)
        .eq('user_id', selectedUserId)
        .order('last_seen_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching user device health:', error);
        return [];
      }
      return data || [];
    },
    enabled: selectedUserId !== 'all',
    refetchInterval: 30000,
  });

  // Get recent devices (for "all users" view)
  const { data: recentDevices, isLoading: loadingDevices } = useQuery({
    queryKey: ['admin-recent-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_health')
        .select(`
          id,
          is_online,
          last_seen_at,
          failsafe_mode,
          mode,
          wifi_signal_strength,
          battery_percentage,
          device_token_id,
          user_id,
          device_tokens!inner(device_name)
        `)
        .order('last_seen_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching devices:', error);
        return [];
      }
      return data || [];
    },
    enabled: selectedUserId === 'all',
    refetchInterval: 30000,
  });

  // Get recent errors/alerts - filtered by user
  const { data: recentErrors, isLoading: loadingErrors } = useQuery({
    queryKey: ['admin-recent-errors', selectedUserId],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('id, message, message_bn, severity, alert_type, created_at, user_id')
        .eq('severity', 'danger')
        .order('created_at', { ascending: false })
        .limit(5);

      if (selectedUserId !== 'all') {
        query = query.eq('user_id', selectedUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Get sensor health data - latest readings per sensor type
  const { data: sensorHealth, isLoading: loadingSensorHealth } = useQuery({
    queryKey: ['admin-sensor-health', selectedUserId],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('sensor_readings')
        .select('temperature, humidity, ammonia, water_usage, recorded_at')
        .gte('recorded_at', oneHourAgo)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (selectedUserId !== 'all') {
        query = query.eq('user_id', selectedUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sensor health:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          temperature: { status: 'no_data', value: null, lastReading: null },
          humidity: { status: 'no_data', value: null, lastReading: null },
          ammonia: { status: 'no_data', value: null, lastReading: null },
          waterFlow: { status: 'no_data', value: null, lastReading: null },
        };
      }

      const latest = data[0];
      const lastReading = latest.timestamp;

      // Define normal ranges
      const tempRange = { min: 15, max: 40 };
      const humidityRange = { min: 30, max: 90 };
      const ammoniaRange = { min: 0, max: 30 };
      const waterFlowRange = { min: 0, max: 500 };

      const getStatus = (value: number | null, range: { min: number; max: number }) => {
        if (value === null || value === undefined) return 'no_data';
        if (value < range.min || value > range.max) return 'out_of_range';
        return 'normal';
      };

      return {
        temperature: {
          status: getStatus(latest.temperature, tempRange),
          value: latest.temperature,
          lastReading,
        },
        humidity: {
          status: getStatus(latest.humidity, humidityRange),
          value: latest.humidity,
          lastReading,
        },
        ammonia: {
          status: getStatus(latest.ammonia, ammoniaRange),
          value: latest.ammonia,
          lastReading,
        },
        waterFlow: {
          status: getStatus(latest.water_flow, waterFlowRange),
          value: latest.water_flow,
          lastReading,
        },
      };
    },
    refetchInterval: 30000,
  });

  const formatUptime = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getSensorStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {labels.working}
          </Badge>
        );
      case 'out_of_range':
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {labels.outOfRange}
          </Badge>
        );
      case 'no_data':
      default:
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            {labels.noData}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* User Selector */}
      <div className="flex items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full sm:w-[350px] justify-between bg-gradient-to-r from-slate-900 to-slate-800 border-cyan-500/30 text-white hover:bg-slate-800 hover:border-cyan-400/50 shadow-lg shadow-cyan-500/10 transition-all"
            >
              <div className="flex items-center gap-2 truncate">
                {selectedUserId === 'all' ? (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-medium">{labels.allUsers}</span>
                  </>
                ) : selectedUser ? (
                  <>
                    <Avatar className="h-6 w-6 border border-cyan-500/30">
                      <AvatarImage src={selectedUser.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-[10px] text-white">
                        {selectedUser.farm_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate font-medium">{selectedUser.farm_name}</span>
                  </>
                ) : (
                  <span>{labels.selectUser}</span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] p-0 bg-gradient-to-b from-slate-900 to-slate-800 border-cyan-500/30 shadow-xl shadow-cyan-500/10" align="start">
            <Command className="bg-transparent">
              <CommandInput 
                placeholder={labels.searchPlaceholder} 
                className="text-white placeholder:text-cyan-300/50 border-cyan-500/20"
              />
              <CommandList>
                <CommandEmpty className="text-cyan-300/60 py-4 text-center">
                  {labels.noUserFound}
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-users"
                    onSelect={() => {
                      setSelectedUserId('all');
                      setOpen(false);
                    }}
                    className="text-white hover:bg-cyan-500/20 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-2">
                      <Activity className="h-3.5 w-3.5 text-white" />
                    </div>
                    {labels.allUsers}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedUserId === 'all' ? "opacity-100 text-cyan-400" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                  {profiles?.map((profile) => (
                    <CommandItem
                      key={profile.id}
                      value={`${profile.farm_name} ${profile.phone || ''}`}
                      onSelect={() => {
                        setSelectedUserId(profile.id);
                        setOpen(false);
                      }}
                      className="text-white hover:bg-cyan-500/20 cursor-pointer"
                    >
                      <Avatar className="h-6 w-6 mr-2 border border-cyan-500/30">
                        <AvatarImage src={profile.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-[10px] text-white">
                          {profile.farm_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="truncate">{profile.farm_name}</span>
                        {profile.phone && (
                          <span className="text-xs text-cyan-300/60">{profile.phone}</span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedUserId === profile.id ? "opacity-100 text-cyan-400" : "opacity-0"
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

      {/* Problem Users Alert Section - Only show when "All Users" is selected */}
      {selectedUserId === 'all' && (
        <Card className={`border-2 shadow-xl ${problemUsers && problemUsers.length > 0 
          ? 'bg-gradient-to-br from-rose-950/40 to-red-950/30 border-rose-500/40 shadow-rose-500/10' 
          : 'bg-gradient-to-br from-emerald-950/40 to-green-950/30 border-emerald-500/40 shadow-emerald-500/10'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {problemUsers && problemUsers.length > 0 ? (
                <>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-rose-200 font-semibold">{labels.attentionRequired}</span>
                  <Badge className="bg-rose-500/30 text-rose-200 border-rose-400/30 ml-2 font-bold">
                    {problemUsers.length} {labels.problemUsers}
                  </Badge>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-emerald-200 font-semibold">{labels.noProblem}</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          {problemUsers && problemUsers.length > 0 && (
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {loadingProblems ? (
                    [1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 bg-slate-700/50" />
                    ))
                  ) : (
                    problemUsers.map((problem) => (
                      <div
                        key={problem.userId}
                        className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-slate-900/90 to-slate-800/80 border border-rose-500/30 cursor-pointer hover:border-rose-400/50 hover:shadow-lg hover:shadow-rose-500/10 transition-all"
                        onClick={() => setSelectedUserId(problem.userId)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-rose-500/30">
                            <AvatarImage src={problem.profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-rose-500 to-red-600 text-white text-sm">
                              {problem.profile?.farm_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm text-white font-semibold">
                              {problem.profile?.farm_name || 'Unknown'}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {problem.issues.map((issue, idx) => (
                                <Badge 
                                  key={idx} 
                                  className={`text-[10px] px-2 py-0.5 font-medium ${
                                    issue.type === 'device_offline' ? 'bg-slate-500/30 text-slate-200 border-slate-400/30' :
                                    issue.type === 'power_outage' ? 'bg-amber-500/30 text-amber-200 border-amber-400/30' :
                                    issue.type === 'critical_alert' ? 'bg-rose-500/30 text-rose-200 border-rose-400/30' :
                                    'bg-orange-500/30 text-orange-200 border-orange-400/30'
                                  }`}
                                >
                                  {issue.type === 'device_offline' && (
                                    <><WifiOff className="w-2.5 h-2.5 mr-0.5" />{labels.deviceOffline}</>
                                  )}
                                  {issue.type === 'power_outage' && (
                                    <><Zap className="w-2.5 h-2.5 mr-0.5" />{labels.powerOutage}</>
                                  )}
                                  {issue.type === 'critical_alert' && (
                                    <><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{labels.criticalAlert}</>
                                  )}
                                  {issue.type === 'no_sensor_data' && (
                                    <><XCircle className="w-2.5 h-2.5 mr-0.5" />{labels.noSensorData}</>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20 text-xs"
                        >
                          {labels.viewDetails}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Status Card */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/70 border-cyan-500/20 shadow-xl shadow-cyan-500/5">
          <CardHeader className="pb-3 border-b border-cyan-500/10">
            <CardTitle className="text-white flex items-center gap-3 text-base">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent font-semibold">
                {selectedUserId === 'all' ? labels.systemHealth : labels.userHealth}
              </span>
              {selectedUser && (
                <Badge variant="outline" className="ml-2 text-cyan-300 border-cyan-400/30 bg-cyan-500/10">
                  {selectedUser.farm_name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Database Status - Only show for "all users" */}
            {selectedUserId === 'all' && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-700/50 border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium">{labels.database}</span>
                </div>
                {loadingDb ? (
                  <Skeleton className="h-7 w-24 bg-slate-600" />
                ) : (
                  <div className="flex items-center gap-3">
                    {dbStatus?.connected ? (
                      <>
                        <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/30 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          {labels.connected}
                        </Badge>
                        <span className="text-sm text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-lg">{dbStatus.latency}ms</span>
                      </>
                    ) : (
                      <Badge className="bg-rose-500/30 text-rose-200 border-rose-400/30 font-medium">
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        {labels.disconnected}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Activity Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-600/10 border border-amber-500/20 text-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/30">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {loadingActivity ? '-' : activityStats?.sensorLogsToday || 0}
                </p>
                <p className="text-xs text-amber-200/80 mt-1">{labels.sensorLogs}</p>
              </div>
              <div className={`p-4 rounded-xl border text-center ${activityStats?.ongoingOutages 
                ? 'bg-gradient-to-br from-rose-500/10 to-red-600/10 border-rose-500/20' 
                : 'bg-gradient-to-br from-emerald-500/10 to-green-600/10 border-emerald-500/20'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg ${
                  activityStats?.ongoingOutages 
                    ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30' 
                    : 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30'
                }`}>
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <p className="text-3xl font-bold text-white">{loadingActivity ? '-' : activityStats?.ongoingOutages || 0}</p>
                <p className={`text-xs mt-1 ${activityStats?.ongoingOutages ? 'text-rose-200/80' : 'text-emerald-200/80'}`}>{labels.powerOutages}</p>
              </div>
            </div>

            {/* Alerts Today */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-600/10 border border-orange-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-orange-200/80 font-medium">{labels.alertsToday}</span>
                </div>
                <Badge className={`text-lg font-bold px-3 py-1 ${activityStats?.alertsToday 
                  ? 'bg-rose-500/30 text-rose-200 border-rose-400/30' 
                  : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30'}`}>
                  {loadingActivity ? '-' : activityStats?.alertsToday || 0}
                </Badge>
              </div>
            </div>

            {/* Device Summary */}
            <div className="p-3 rounded-lg bg-slate-700/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{labels.deviceStatus}</span>
                <div className="flex items-center gap-2">
                  {activityStats?.failsafeDevices ? (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                      {activityStats.failsafeDevices} Failsafe
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-white font-medium">
                    {loadingActivity ? '-' : activityStats?.onlineDevices || 0}
                  </span>
                  <span className="text-gray-400 text-sm">{labels.online}</span>
                </div>
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-white font-medium">
                    {loadingActivity ? '-' : (activityStats?.totalDevices || 0) - (activityStats?.onlineDevices || 0)}
                  </span>
                  <span className="text-gray-400 text-sm">{labels.offline}</span>
                </div>
              </div>
            </div>

            {/* Sensor Health Section */}
            <div className="p-3 rounded-lg bg-slate-700/30">
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-400">{labels.sensorHealth}</span>
              </div>
              {loadingSensorHealth ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-12 bg-slate-600" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {/* Temperature Sensor */}
                  <div className="flex items-center justify-between p-2 rounded bg-slate-600/30">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-red-400" />
                      <div>
                        <p className="text-xs text-gray-400">{labels.temperature}</p>
                        <p className="text-sm text-white font-medium">
                          {sensorHealth?.temperature?.value !== null 
                            ? `${sensorHealth?.temperature?.value}°C` 
                            : '-'}
                        </p>
                      </div>
                    </div>
                    {getSensorStatusBadge(sensorHealth?.temperature?.status || 'no_data')}
                  </div>

                  {/* Humidity Sensor */}
                  <div className="flex items-center justify-between p-2 rounded bg-slate-600/30">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs text-gray-400">{labels.humidity}</p>
                        <p className="text-sm text-white font-medium">
                          {sensorHealth?.humidity?.value !== null 
                            ? `${sensorHealth?.humidity?.value}%` 
                            : '-'}
                        </p>
                      </div>
                    </div>
                    {getSensorStatusBadge(sensorHealth?.humidity?.status || 'no_data')}
                  </div>

                  {/* Ammonia Sensor */}
                  <div className="flex items-center justify-between p-2 rounded bg-slate-600/30">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-yellow-400" />
                      <div>
                        <p className="text-xs text-gray-400">{labels.ammonia}</p>
                        <p className="text-sm text-white font-medium">
                          {sensorHealth?.ammonia?.value !== null 
                            ? `${sensorHealth?.ammonia?.value} ppm` 
                            : '-'}
                        </p>
                      </div>
                    </div>
                    {getSensorStatusBadge(sensorHealth?.ammonia?.status || 'no_data')}
                  </div>

                  {/* Water Flow Sensor */}
                  <div className="flex items-center justify-between p-2 rounded bg-slate-600/30">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-xs text-gray-400">{labels.waterFlow}</p>
                        <p className="text-sm text-white font-medium">
                          {sensorHealth?.waterFlow?.value !== null 
                            ? `${sensorHealth?.waterFlow?.value} L` 
                            : '-'}
                        </p>
                      </div>
                    </div>
                    {getSensorStatusBadge(sensorHealth?.waterFlow?.status || 'no_data')}
                  </div>
                </div>
              )}
              {sensorHealth?.temperature?.lastReading && (
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {labels.lastReading}: {formatDistanceToNow(new Date(sensorHealth.temperature.lastReading), { addSuffix: true, locale: bn })}
                </p>
              )}
            </div>
            <div className={`p-3 rounded-lg text-center ${
              (selectedUserId === 'all' ? dbStatus?.connected : true) && !activityStats?.ongoingOutages 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-orange-500/10 border border-orange-500/30'
            }`}>
              {(selectedUserId === 'all' ? dbStatus?.connected : true) && !activityStats?.ongoingOutages ? (
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">{labels.systemOk}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-orange-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Attention Required</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Devices & Errors / User Device Details */}
        <Card className="bg-slate-800/50 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Server className="w-5 h-5 text-purple-400" />
              {selectedUserId === 'all' ? labels.recentActivity : labels.deviceStatus}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              {selectedUserId !== 'all' ? (
                // User-specific device details
                <div className="space-y-3">
                  {loadingUserDevice ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24 w-full bg-slate-700/50" />
                      ))}
                    </div>
                  ) : userDeviceHealth && userDeviceHealth.length > 0 ? (
                    userDeviceHealth.map((device: any) => (
                      <div key={device.id} className="p-3 rounded-lg bg-slate-700/30 space-y-3">
                        {/* Device Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {device.is_online ? (
                              <Wifi className="w-4 h-4 text-green-400" />
                            ) : (
                              <WifiOff className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-white font-medium">
                              {device.device_tokens?.device_name || 'Unknown Device'}
                            </span>
                          </div>
                          <Badge className={device.is_online ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                            {device.is_online ? labels.online : labels.offline}
                          </Badge>
                        </div>

                        {/* Device Details Grid */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-400">{labels.mode}:</span>
                            <span className="text-white">{device.mode || 'AUTO'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Battery className={`w-3 h-3 ${device.battery_percentage > 20 ? 'text-green-400' : 'text-red-400'}`} />
                            <span className="text-gray-400">{labels.battery}:</span>
                            <span className="text-white">{device.battery_percentage || '-'}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Wifi className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-400">{labels.signal}:</span>
                            <span className="text-white">{device.wifi_signal_strength || '-'} dBm</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-400">{labels.uptime}:</span>
                            <span className="text-white">{formatUptime(device.uptime_seconds)}</span>
                          </div>
                        </div>

                        {/* Failsafe & Last Seen */}
                        <div className="flex items-center justify-between text-xs">
                          {device.failsafe_mode && (
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                              ⚠️ Failsafe Mode
                            </Badge>
                          )}
                          <span className="text-gray-500 ml-auto">
                            {device.last_seen_at && formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true, locale: bn })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{labels.noDeviceData}</p>
                    </div>
                  )}

                  {/* User Errors */}
                  {recentErrors && recentErrors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{labels.errorLogs}</p>
                      <div className="space-y-2">
                        {recentErrors.map((error: any) => (
                          <div key={error.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-red-300 truncate">
                                {language === 'bn' ? error.message_bn : error.message}
                              </p>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(error.created_at), { addSuffix: true, locale: bn })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // All users view - Recent devices and errors
                <>
                  {/* Recent Devices */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{labels.deviceStatus}</p>
                    {loadingDevices ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-12 w-full bg-slate-700/50" />
                        ))}
                      </div>
                    ) : recentDevices && recentDevices.length > 0 ? (
                      <div className="space-y-2">
                        {recentDevices.map((device: any) => (
                          <div key={device.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
                            <div className="flex items-center gap-2">
                              {device.is_online ? (
                                <Wifi className="w-4 h-4 text-green-400" />
                              ) : (
                                <WifiOff className="w-4 h-4 text-red-400" />
                              )}
                              <div>
                                <p className="text-sm text-white">{device.device_tokens?.device_name || 'Unknown'}</p>
                                <p className="text-xs text-gray-400">
                                  {device.mode} {device.failsafe_mode && '⚠️ Failsafe'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {device.wifi_signal_strength && (
                                <p className="text-xs text-gray-400">{device.wifi_signal_strength}dBm</p>
                              )}
                              {device.last_seen_at && (
                                <p className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true, locale: bn })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">{labels.noActivity}</p>
                    )}
                  </div>

                  {/* Recent Errors */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{labels.errorLogs}</p>
                    {loadingErrors ? (
                      <div className="space-y-2">
                        {[1, 2].map(i => (
                          <Skeleton key={i} className="h-10 w-full bg-slate-700/50" />
                        ))}
                      </div>
                    ) : recentErrors && recentErrors.length > 0 ? (
                      <div className="space-y-2">
                        {recentErrors.map((error: any) => (
                          <div key={error.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-red-300 truncate">
                                {language === 'bn' ? error.message_bn : error.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
                                  {error.alert_type}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(error.created_at), { addSuffix: true, locale: bn })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-1" />
                        <p className="text-green-400 text-sm">{labels.noErrors}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
