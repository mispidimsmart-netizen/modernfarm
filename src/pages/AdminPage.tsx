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
  Bell,
  TrendingUp,
  Pencil,
  Ban,
  BookOpen,
  Crown,
  FileText,
  Upload,
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
import { AdminNotificationSender } from '@/components/admin/AdminNotificationSender';
import { AdminSensorCharts } from '@/components/admin/AdminSensorCharts';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminManagementTab } from '@/components/admin/AdminManagementTab';
import { TenantIsolationAuditTab } from '@/components/admin/TenantIsolationAuditTab';
import { AppDocumentation } from '@/components/admin/AppDocumentation';
import { CalibrationWizardSheet } from '@/components/calibration/CalibrationWizard';
import ForensicTimelineCard from '@/components/admin/ForensicTimelineCard';
import { ProductionAuditReport } from '@/components/admin/ProductionAuditReport';
import { TechnicalArchitectureReport } from '@/components/admin/TechnicalArchitectureReport';
import { FirmwareManagementTab } from '@/components/admin/FirmwareManagementTab';
import { AdminDeviceHealthPanel } from '@/components/admin/AdminDeviceHealthPanel';
import { SecurityAuditLogPanel } from '@/components/admin/SecurityAuditLogPanel';
import { AdminCommandDeliveryPanel } from '@/components/admin/AdminCommandDeliveryPanel';
import { PCBManufacturingSpec } from '@/components/admin/PCBManufacturingSpec';

const t = {
  bn: {
    title: 'অ্যাডমিন ড্যাশবোর্ড',
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
    tabAdmins: 'অ্যাডমিন',
    tabUsers: 'ইউজার',
    tabSystem: 'সিস্টেম',
    tabNotify: 'নোটিফিকেশন',
    tabAnalytics: 'অ্যানালিটিক্স',
    tabGuide: 'ইনস্টলেশন গাইড',
     tabDocs: 'অ্যাপ ডকুমেন্টেশন',
    tabAudit: 'অডিট রিপোর্ট',
    tabArchitecture: 'টেকনিক্যাল আর্কিটেকচার',
    tabFirmware: 'ফার্মওয়্যার',
    tabSecurity: 'সিকিউরিটি লগ',
    tabCommands: 'কমান্ড ডেলিভারি',
    userName: 'নাম',
    email: 'ইমেইল',
    farmType: 'ফার্মের ধরণ',
    layer: 'লেয়ার',
    broiler: 'ব্রয়লার',
    noName: 'নাম নেই',
    noEmail: 'ইমেইল নেই',
    userInfo: 'ইউজার তথ্য',
    farmInfo: 'ফার্ম তথ্য',
  },
  en: {
    title: 'Admin Dashboard',
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
    tabAdmins: 'Admins',
    tabUsers: 'Users',
    tabSystem: 'System',
    tabNotify: 'Notifications',
    tabAnalytics: 'Analytics',
    tabGuide: 'Installation Guide',
     tabDocs: 'App Documentation',
    tabAudit: 'Audit Report',
    tabArchitecture: 'Technical Architecture',
    tabFirmware: 'Firmware',
    tabSecurity: 'Security Logs',
    tabCommands: 'Command Delivery',
    userName: 'Name',
    email: 'Email',
    farmType: 'Farm Type',
    layer: 'Layer',
    broiler: 'Broiler',
    noName: 'No name',
    noEmail: 'No email',
    userInfo: 'User Info',
    farmInfo: 'Farm Info',
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
    refetchStats,
    refetchUserDetails,
  } = useSuperAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
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
    u.phone?.includes(searchQuery) ||
    u.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1e3a] flex items-center justify-center">
        <div className="text-white flex items-center gap-3 bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
          <RefreshCw className="animate-spin text-indigo-400 w-6 h-6" />
          <span className="text-lg font-medium">{labels.loading}</span>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1e3a] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gradient-to-br from-rose-950/40 to-red-950/30 border-rose-500/30 shadow-2xl shadow-rose-500/10">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-5">
              <Shield className="w-10 h-10 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-rose-300">{labels.unauthorized}</h2>
            <p className="text-rose-400/80 mt-3">{labels.unauthorizedMsg}</p>
            <Button 
              variant="outline" 
              className="mt-6 border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1e3a]">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-950/90 via-[#0b1e3a]/80 to-slate-950/90 backdrop-blur-xl border-b border-slate-700/40 sticky top-0 z-10 shadow-lg shadow-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-indigo-200 hover:bg-indigo-500/20 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
                  {labels.title}
                </h1>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => { refetchUsers(); refetchStats(); refetchUserDetails(); }}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all"
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
          {/* Total Users — Teal primary brand */}
          <Card className="bg-gradient-to-br from-[#1F7A3E] via-emerald-700 to-teal-800 border border-emerald-400/30 text-white shadow-xl shadow-emerald-900/40 hover:shadow-emerald-500/30 transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100/80 text-sm font-medium">{labels.totalUsers}</p>
                  {loadingStats ? (
                    <Skeleton className="h-9 w-16 bg-emerald-400/30 mt-1" />
                  ) : (
                    <p className="text-4xl font-bold mt-1">{stats?.totalUsers || 0}</p>
                  )}
                  {!loadingStats && stats && (
                    <div className="flex gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] border-emerald-300/50 text-emerald-100 px-1.5 py-0">
                        🥚 {stats.layerFarms}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-emerald-300/50 text-emerald-100 px-1.5 py-0">
                        🐔 {stats.broilerFarms}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Sheds — Cyan/Sky */}
          <Card className="bg-gradient-to-br from-sky-600 via-cyan-700 to-teal-800 border border-cyan-400/30 text-white shadow-xl shadow-cyan-900/40 hover:shadow-cyan-500/30 transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100/80 text-sm font-medium">{labels.totalSheds}</p>
                  {loadingStats ? (
                    <Skeleton className="h-9 w-16 bg-cyan-400/30 mt-1" />
                  ) : (
                    <p className="text-4xl font-bold mt-1">{stats?.totalSheds || 0}</p>
                  )}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Devices — Indigo/Blue */}
          <Card className="bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-800 border border-blue-400/30 text-white shadow-xl shadow-blue-900/40 hover:shadow-blue-500/30 transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100/80 text-sm font-medium">{labels.activeDevices}</p>
                  {loadingStats ? (
                    <Skeleton className="h-9 w-16 bg-blue-400/30 mt-1" />
                  ) : (
                    <p className="text-4xl font-bold mt-1">{stats?.activeDevices || 0}</p>
                  )}
                  {!loadingStats && stats && stats.activeBroilerBatches > 0 && (
                    <Badge variant="outline" className="text-[10px] border-blue-300/50 text-blue-100 px-1.5 py-0 mt-1.5">
                      🐔 {stats.activeBroilerBatches} ব্যাচ সক্রিয়
                    </Badge>
                  )}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                  <Cpu className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Today — Amber/Rose */}
          <Card className="bg-gradient-to-br from-amber-600 via-orange-700 to-rose-800 border border-amber-400/30 text-white shadow-xl shadow-amber-900/40 hover:shadow-amber-500/30 transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100/80 text-sm font-medium">{labels.alertsToday}</p>
                  {loadingStats ? (
                    <Skeleton className="h-9 w-16 bg-amber-400/30 mt-1" />
                  ) : (
                    <p className="text-4xl font-bold mt-1">{stats?.alertsToday || 0}</p>
                  )}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Admins, Users, System, Notifications, Analytics */}
        <Tabs defaultValue="admins" className="w-full">
          <TabsList className="bg-slate-900/80 border border-white/10 flex-wrap h-auto gap-1 p-1.5 rounded-xl shadow-lg">
            <TabsTrigger value="admins" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Crown className="w-4 h-4 mr-2" />
              {labels.tabAdmins}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              {labels.tabUsers}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <TrendingUp className="w-4 h-4 mr-2" />
              {labels.tabAnalytics}
            </TabsTrigger>
            <TabsTrigger value="notify" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Bell className="w-4 h-4 mr-2" />
              {labels.tabNotify}
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Activity className="w-4 h-4 mr-2" />
              {labels.tabSystem}
            </TabsTrigger>
            <TabsTrigger value="docs" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <BookOpen className="w-4 h-4 mr-2" />
              {labels.tabDocs}
            </TabsTrigger>
            <TabsTrigger value="guide" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Cpu className="w-4 h-4 mr-2" />
              {labels.tabGuide}
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <FileText className="w-4 h-4 mr-2" />
              {labels.tabAudit}
            </TabsTrigger>
            <TabsTrigger value="architecture" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Cpu className="w-4 h-4 mr-2" />
              {labels.tabArchitecture}
            </TabsTrigger>
            <TabsTrigger value="firmware" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Upload className="w-4 h-4 mr-2" />
              {labels.tabFirmware}
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Shield className="w-4 h-4 mr-2" />
              {labels.tabSecurity}
            </TabsTrigger>
            <TabsTrigger value="commands" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Activity className="w-4 h-4 mr-2" />
              {labels.tabCommands}
            </TabsTrigger>
            <TabsTrigger value="isolation" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Shield className="w-4 h-4 mr-2" />
              আইসোলেশন
            </TabsTrigger>
            <TabsTrigger value="pcb" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 text-slate-400 hover:text-white transition-all rounded-lg">
              <Cpu className="w-4 h-4 mr-2" />
              PCB ম্যানুফ্যাকচারিং
            </TabsTrigger>
          </TabsList>

          <TabsContent value="isolation" className="mt-4">
            <TenantIsolationAuditTab />
          </TabsContent>

          <TabsContent value="admins" className="mt-4">
            <AdminManagementTab language={language} />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            {/* Users List */}
            <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-violet-500/20 shadow-xl shadow-violet-500/5">
              <CardHeader className="pb-4 border-b border-violet-500/10">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <CardTitle className="text-white flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent">
                      {labels.allUsers}
                    </span>
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
                    <Input
                      placeholder={labels.searchUsers}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-800/80 border-violet-500/20 text-white placeholder:text-violet-300/50 focus:border-violet-500/40 focus:ring-violet-500/20"
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
                            className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                              u.is_blocked 
                                ? 'bg-red-900/20 border border-red-500/30' 
                                : 'bg-slate-700/30 hover:bg-slate-700/50'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Avatar className={`w-12 h-12 border-2 ${u.is_blocked ? 'border-red-500/50' : 'border-purple-500/30'}`}>
                                  <AvatarImage src={u.avatar_url || undefined} />
                                  <AvatarFallback className={u.is_blocked ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'}>
                                    {(u.user_name || u.farm_name).charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {u.is_blocked && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                                    <Ban className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className={`font-semibold ${u.is_blocked ? 'text-red-300' : 'text-white'}`}>
                                    {u.user_name || labels.noName}
                                  </h3>
                                  {u.is_blocked && (
                                    <Badge variant="outline" className="border-red-500 text-red-400 text-xs">
                                      🚫 ব্লকড
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant="outline" 
                                    className={u.farm_type === 'broiler' 
                                      ? 'border-amber-500/30 text-amber-400 text-xs' 
                                      : u.farm_type === 'mixed'
                                        ? 'border-purple-500/30 text-purple-400 text-xs'
                                        : 'border-green-500/30 text-green-400 text-xs'
                                    }
                                  >
                                    {u.farm_type === 'broiler' ? '🐔' : u.farm_type === 'mixed' ? '🥚🐔' : '🥚'} {u.farm_type === 'broiler' ? labels.broiler : u.farm_type === 'mixed' ? 'মিক্সড' : labels.layer}
                                  </Badge>
                                </div>
                                <p className="text-sm text-purple-300">{u.farm_name}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {u.phone || labels.noPhone}
                                  </span>
                                  {u.email && (
                                    <span className="flex items-center gap-1">
                                      📧 {u.email}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {u.sheds_count} {labels.sheds}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: bn })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {sensorData && (
                                <div className="hidden lg:flex items-center gap-2 text-xs">
                                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                                    <Thermometer className="w-3 h-3 mr-1" />
                                    {sensorData.temperature}°C
                                  </Badge>
                                  <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                                    <Droplets className="w-3 h-3 mr-1" />
                                    {sensorData.humidity}%
                                  </Badge>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                                onClick={() => {
                                  setEditingUser(u);
                                  setShowEditDialog(true);
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowUserDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
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

          <TabsContent value="analytics" className="mt-4">
            <AdminSensorCharts language={language} />
          </TabsContent>

          <TabsContent value="notify" className="mt-4">
            <AdminNotificationSender language={language} />
          </TabsContent>

          <TabsContent value="system" className="mt-4 space-y-4">
            <SystemHealthCard language={language} />
            <AdminDeviceHealthPanel language={language} />
            <ForensicTimelineCard />
            {/* Calibration Wizard Card */}
            <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-cyan-500/20 shadow-xl shadow-cyan-500/5">
              <CardHeader className="border-b border-cyan-500/10">
                <CardTitle className="text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                    <Cpu className="w-5 h-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-cyan-200 to-teal-200 bg-clip-text text-transparent font-semibold">
                    {language === 'bn' ? 'ইনস্টলেশন ক্যালিব্রেশন উইজার্ড' : 'Installation Calibration Wizard'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-slate-400 text-sm mb-4">
                  {language === 'bn' 
                    ? 'নতুন ডিভাইস সেটআপের সময় সঠিক সেন্সর প্লেসমেন্ট ও ক্যালিব্রেশন নিশ্চিত করতে এই উইজার্ড ব্যবহার করুন।'
                    : 'Use this wizard to ensure correct sensor placement and calibration during new device setup.'}
                </p>
                <CalibrationWizardSheet>
                  <Button className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white border-0 hover:from-cyan-600 hover:to-teal-700 shadow-lg shadow-cyan-500/30">
                    <Cpu className="w-4 h-4 mr-2" />
                    {language === 'bn' ? 'ক্যালিব্রেশন উইজার্ড চালু করুন' : 'Launch Calibration Wizard'}
                  </Button>
                </CalibrationWizardSheet>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="docs" className="mt-4">
            <AppDocumentation />
          </TabsContent>
          
          <TabsContent value="guide" className="mt-4">
            <Card className="bg-gradient-to-br from-teal-950/40 via-slate-900/90 to-emerald-950/30 border-teal-500/20 shadow-xl shadow-teal-500/10 backdrop-blur-sm">
              <CardHeader className="border-b border-teal-500/10">
                <CardTitle className="text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/40">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-teal-200 to-emerald-200 bg-clip-text text-transparent font-semibold">
                    {language === 'bn' ? 'ESP32 ইনস্টলেশন গাইড' : 'ESP32 Installation Guide'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <p className="text-teal-200/70">
                  {language === 'bn' 
                    ? 'ESP32 হার্ডওয়্যার সেটআপ, পার্টস লিস্ট, ওয়্যারিং ডায়াগ্রাম এবং ফার্মওয়্যার আপলোড গাইড।'
                    : 'ESP32 hardware setup, parts list, wiring diagram and firmware upload guide.'}
                </p>
                <Button 
                  onClick={() => navigate('/installation-guide')}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white border-0 shadow-lg shadow-teal-500/30 transition-all"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'ইনস্টলেশন গাইড দেখুন' : 'View Installation Guide'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <ProductionAuditReport />
          </TabsContent>

          <TabsContent value="architecture" className="mt-4">
            <TechnicalArchitectureReport />
          </TabsContent>

          <TabsContent value="firmware" className="mt-4">
            <FirmwareManagementTab language={language} />
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <SecurityAuditLogPanel />
          </TabsContent>

          <TabsContent value="commands" className="mt-4">
            <AdminCommandDeliveryPanel />
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
            {/* User Info Section */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                👤 {labels.userInfo}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-600/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">{labels.userName}</p>
                  <p className="font-medium">{selectedUser?.user_name || labels.noName}</p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">{labels.phone}</p>
                  <p className="font-medium">{selectedUser?.phone || labels.noPhone}</p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">{labels.email}</p>
                  <p className="font-medium text-sm">{selectedUser?.email || labels.noEmail}</p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">{labels.joined}</p>
                  <p className="font-medium">
                    {selectedUser && format(new Date(selectedUser.created_at), 'dd MMM yyyy', { locale: bn })}
                  </p>
                </div>
              </div>
            </div>

            {/* Farm Info Section */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                🏠 {labels.farmInfo}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-600/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">{labels.farmName}</p>
                  <p className="font-medium">{selectedUser?.farm_name}</p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">{labels.farmType}</p>
                  <p className="font-medium flex items-center gap-2">
                    {selectedUser?.farm_type === 'broiler' ? '🐔' : '🥚'}
                    {selectedUser?.farm_type === 'broiler' ? labels.broiler : labels.layer}
                  </p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">{labels.sheds}</p>
                  <p className="font-medium">{selectedUser?.sheds_count || 0}</p>
                </div>
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

      {/* Edit User Dialog */}
      {editingUser && (
        <AdminUserManagement
          user={editingUser}
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingUser(null);
          }}
          language={language}
        />
      )}
    </div>
  );
}
