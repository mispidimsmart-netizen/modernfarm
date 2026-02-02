import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSuperAdmin, AdminUser } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  Building2, 
  Cpu, 
  AlertTriangle,
  Search,
  ArrowLeft,
  Phone,
  Calendar,
  Thermometer,
  Droplets,
  Wind,
  RefreshCw,
  Eye,
  Activity,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { SystemHealthCard } from '@/components/admin/SystemHealthCard';

const t = {
  bn: {
    title: 'সুপার অ্যাডমিন ড্যাশবোর্ড',
    totalUsers: 'মোট ইউজার',
    totalSheds: 'মোট শেড',
    activeDevices: 'সক্রিয় ডিভাইস',
    alertsToday: 'আজকের অ্যালার্ট',
    searchUsers: 'ইউজার খুঁজুন...',
    allUsers: 'সকল ইউজার',
    farmName: 'ফার্মের নাম',
    phone: 'ফোন',
    sheds: 'শেড',
    joined: 'যোগদান',
    noPhone: 'ফোন নেই',
    refresh: 'রিফ্রেশ',
    back: 'ফিরে যান',
    unauthorized: 'অ্যাক্সেস নেই',
    unauthorizedMsg: 'আপনি সুপার অ্যাডমিন নন',
    loading: 'লোড হচ্ছে...',
    viewDetails: 'বিস্তারিত',
    userDetails: 'ইউজার বিস্তারিত',
    latestSensorData: 'সর্বশেষ সেন্সর ডেটা',
    noSensorData: 'কোনো সেন্সর ডেটা নেই',
    temperature: 'তাপমাত্রা',
    humidity: 'আর্দ্রতা',
    ammonia: 'অ্যামোনিয়া',
    shedsList: 'শেড তালিকা',
    noSheds: 'কোনো শেড নেই',
    tabUsers: 'ইউজার',
    tabSystem: 'সিস্টেম',
  },
  en: {
    title: 'Super Admin Dashboard',
    totalUsers: 'Total Users',
    totalSheds: 'Total Sheds',
    activeDevices: 'Active Devices',
    alertsToday: 'Alerts Today',
    searchUsers: 'Search users...',
    allUsers: 'All Users',
    farmName: 'Farm Name',
    phone: 'Phone',
    sheds: 'Sheds',
    joined: 'Joined',
    noPhone: 'No phone',
    refresh: 'Refresh',
    back: 'Go Back',
    unauthorized: 'Access Denied',
    unauthorizedMsg: 'You are not a super admin',
    loading: 'Loading...',
    viewDetails: 'View Details',
    userDetails: 'User Details',
    latestSensorData: 'Latest Sensor Data',
    noSensorData: 'No sensor data',
    temperature: 'Temperature',
    humidity: 'Humidity',
    ammonia: 'Ammonia',
    shedsList: 'Sheds List',
    noSheds: 'No sheds',
    tabUsers: 'Users',
    tabSystem: 'System',
  },
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    isSuperAdmin, 
    checkingAdmin, 
    allUsers, 
    loadingUsers, 
    refetchUsers,
    stats,
    loadingStats,
    userDetails,
  } = useSuperAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const language = 'bn';
  const labels = t[language];

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Fetch user's sheds when selected
  const { data: selectedUserSheds } = useQuery({
    queryKey: ['admin-user-sheds', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const { data, error } = await supabase
        .from('sheds')
        .select('*')
        .eq('user_id', selectedUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser?.id && showUserDialog,
  });

  // Filter users based on search
  const filteredUsers = allUsers?.filter(u => 
    u.farm_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white flex items-center gap-2">
          <RefreshCw className="animate-spin" />
          {labels.loading}
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-red-900/20 border-red-500/30">
          <CardContent className="pt-6 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400">{labels.unauthorized}</h2>
            <p className="text-red-300 mt-2">{labels.unauthorizedMsg}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {labels.back}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl font-bold text-white">{labels.title}</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchUsers()}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {labels.refresh}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">{labels.totalUsers}</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 bg-blue-400/30" />
                  ) : (
                    <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                  )}
                </div>
                <Users className="w-10 h-10 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 text-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm">{labels.totalSheds}</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 bg-green-400/30" />
                  ) : (
                    <p className="text-3xl font-bold">{stats?.totalSheds || 0}</p>
                  )}
                </div>
                <Building2 className="w-10 h-10 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 text-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">{labels.activeDevices}</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 bg-purple-400/30" />
                  ) : (
                    <p className="text-3xl font-bold">{stats?.activeDevices || 0}</p>
                  )}
                </div>
                <Cpu className="w-10 h-10 text-purple-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0 text-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-200 text-sm">{labels.alertsToday}</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 bg-orange-400/30" />
                  ) : (
                    <p className="text-3xl font-bold">{stats?.alertsToday || 0}</p>
                  )}
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Users and System */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-slate-800/50 border-white/10">
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              {labels.tabUsers}
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              {labels.tabSystem}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            {/* Users List */}
            <Card className="bg-slate-800/50 border-white/10">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                {labels.allUsers}
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={labels.searchUsers}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-white/10 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {loadingUsers ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-20 w-full bg-slate-700/50" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers?.map(u => {
                    const sensorData = userDetails?.[u.id];
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 border-2 border-purple-500/30">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="bg-purple-600 text-white">
                              {u.farm_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-white">{u.farm_name}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {u.phone || labels.noPhone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {u.sheds_count} {labels.sheds}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Calendar className="w-3 h-3" />
                              {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: bn })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {sensorData && (
                            <div className="hidden sm:flex items-center gap-3 text-xs">
                              <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                                <Thermometer className="w-3 h-3 mr-1" />
                                {sensorData.temperature}°C
                              </Badge>
                              <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                                <Droplets className="w-3 h-3 mr-1" />
                                {sensorData.humidity}%
                              </Badge>
                              <Badge variant="outline" className="border-green-500/30 text-green-400">
                                <Wind className="w-3 h-3 mr-1" />
                                {sensorData.ammonia}ppm
                              </Badge>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            onClick={() => {
                              setSelectedUser(u);
                              setShowUserDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {labels.viewDetails}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="system" className="mt-4">
            <SystemHealthCard language={language} />
          </TabsContent>
        </Tabs>
      </div>

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="bg-slate-800 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedUser?.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-600">
                  {selectedUser?.farm_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {selectedUser?.farm_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-gray-400 text-sm">{labels.phone}</p>
                <p className="font-medium">{selectedUser?.phone || labels.noPhone}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-gray-400 text-sm">{labels.joined}</p>
                <p className="font-medium">
                  {selectedUser && format(new Date(selectedUser.created_at), 'dd MMM yyyy', { locale: bn })}
                </p>
              </div>
            </div>

            {/* Sensor Data */}
            {selectedUser && userDetails?.[selectedUser.id] && (
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="font-medium mb-3">{labels.latestSensorData}</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                    <Thermometer className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-orange-400">
                      {userDetails[selectedUser.id].temperature}°C
                    </p>
                    <p className="text-xs text-gray-400">{labels.temperature}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                    <Droplets className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-400">
                      {userDetails[selectedUser.id].humidity}%
                    </p>
                    <p className="text-xs text-gray-400">{labels.humidity}</p>
                  </div>
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <Wind className="w-6 h-6 text-green-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-400">
                      {userDetails[selectedUser.id].ammonia}ppm
                    </p>
                    <p className="text-xs text-gray-400">{labels.ammonia}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sheds List */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h4 className="font-medium mb-3">{labels.shedsList}</h4>
              {selectedUserSheds && selectedUserSheds.length > 0 ? (
                <div className="space-y-2">
                  {selectedUserSheds.map(shed => (
                    <div key={shed.id} className="flex items-center justify-between p-3 bg-slate-600/50 rounded-lg">
                      <div>
                        <p className="font-medium">{shed.name}</p>
                        <p className="text-sm text-gray-400">{shed.name_en}</p>
                      </div>
                      <Badge variant="outline" className={shed.is_active ? 'border-green-500 text-green-400' : 'border-gray-500 text-gray-400'}>
                        {shed.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">{labels.noSheds}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
