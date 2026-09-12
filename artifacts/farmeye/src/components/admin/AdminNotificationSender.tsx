import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bell, 
  Send, 
  Users, 
  AlertTriangle,
  Info,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const t = {
  bn: {
    title: 'নোটিফিকেশন পাঠান',
    selectUsers: 'ইউজার নির্বাচন করুন',
    selectAll: 'সবাই নির্বাচন করুন',
    notificationTitle: 'শিরোনাম',
    notificationBody: 'বার্তা',
    severity: 'ধরন',
    warning: 'সতর্কতা',
    danger: 'বিপদ',
    info: 'তথ্য',
    send: 'নোটিফিকেশন পাঠান',
    sending: 'পাঠানো হচ্ছে...',
    noUsers: 'কোনো ইউজার নেই',
    selectedCount: 'জন নির্বাচিত',
    success: 'নোটিফিকেশন সফলভাবে পাঠানো হয়েছে',
    error: 'নোটিফিকেশন পাঠাতে ত্রুটি হয়েছে',
    titlePlaceholder: 'গুরুত্বপূর্ণ বিজ্ঞপ্তি',
    bodyPlaceholder: 'আপনার বার্তা এখানে লিখুন...',
    recentNotifications: 'সাম্প্রতিক নোটিফিকেশন',
    noRecentNotifications: 'কোনো সাম্প্রতিক নোটিফিকেশন নেই',
    farmTypeFilter: 'ফার্ম ফিল্টার',
    all: 'সব',
    layer: 'লেয়ার',
    broiler: 'ব্রয়লার',
    selectLayerFarms: 'সব লেয়ার ফার্ম',
    selectBroilerFarms: 'সব ব্রয়লার ফার্ম',
  },
  en: {
    title: 'Send Notification',
    selectUsers: 'Select Users',
    selectAll: 'Select All',
    notificationTitle: 'Title',
    notificationBody: 'Message',
    severity: 'Type',
    warning: 'Warning',
    danger: 'Danger',
    info: 'Info',
    send: 'Send Notification',
    sending: 'Sending...',
    noUsers: 'No users found',
    selectedCount: 'selected',
    success: 'Notification sent successfully',
    error: 'Failed to send notification',
    titlePlaceholder: 'Important Notice',
    bodyPlaceholder: 'Write your message here...',
    recentNotifications: 'Recent Notifications',
    noRecentNotifications: 'No recent notifications',
    farmTypeFilter: 'Farm Filter',
    all: 'All',
    layer: 'Layer',
    broiler: 'Broiler',
    selectLayerFarms: 'All Layer Farms',
    selectBroilerFarms: 'All Broiler Farms',
  },
};

interface AdminNotificationSenderProps {
  language?: 'bn' | 'en';
}

export function AdminNotificationSender({ language = 'bn' }: AdminNotificationSenderProps) {
  const labels = t[language];
  const queryClient = useQueryClient();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<'warning' | 'danger'>('warning');
  const [farmTypeFilter, setFarmTypeFilter] = useState<'all' | 'layer' | 'broiler'>('all');

  // Fetch all users with push subscriptions
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users-with-subscriptions'],
    queryFn: async () => {
      // Get all profiles with farm_type
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, farm_name, phone, avatar_url, farm_type')
        .order('farm_name');

      if (profilesError) throw profilesError;

      // Get users who have push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('user_id');

      if (subError) throw subError;

      const usersWithPush = new Set(subscriptions?.map(s => s.user_id) || []);

      return profiles.map(p => ({
        ...p,
        farm_type: (p as any).farm_type || 'layer',
        hasPushEnabled: usersWithPush.has(p.id),
      }));
    },
  });

  // Filter users by farm type
  const filteredUsers = users?.filter(u => {
    if (farmTypeFilter === 'all') return true;
    return u.farm_type === farmTypeFilter;
  });

  // Send notification mutation
  const sendNotification = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(
        selectedUsers.map(async (userId) => {
          const { data, error } = await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: userId,
              title,
              body,
              severity,
              url: '/alerts',
            },
          });

          if (error) {
            console.error(`Failed to send to ${userId}:`, error);
            return { userId, success: false, error };
          }

          // Also create an alert record
          await supabase.from('alerts').insert({
            user_id: userId,
            message: `${title}: ${body}`,
            message_bn: `${title}: ${body}`,
            alert_type: 'temperature', // Using temperature as generic admin notification
            severity,
          });

          return { userId, success: true, data };
        })
      );

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      toast.success(`${labels.success} (${successCount}/${selectedUsers.length})`);
      setSelectedUsers([]);
      setTitle('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['admin-recent-alerts'] });
    },
    onError: () => {
      toast.error(labels.error);
    },
  });

  // Recent admin alerts
  const { data: recentAlerts } = useQuery({
    queryKey: ['admin-recent-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, message, severity, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAll = () => {
    const usersToSelect = filteredUsers || [];
    if (selectedUsers.length === usersToSelect.length && usersToSelect.every(u => selectedUsers.includes(u.id))) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(usersToSelect.map(u => u.id));
    }
  };

  const selectByFarmType = (type: 'layer' | 'broiler') => {
    const usersOfType = users?.filter(u => u.farm_type === type) || [];
    setSelectedUsers(usersOfType.map(u => u.id));
    setFarmTypeFilter(type);
  };

  const canSend = selectedUsers.length > 0 && title.trim() && body.trim();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Notification Form */}
      <Card className="bg-gradient-to-br from-orange-950/40 via-slate-900/90 to-amber-950/30 border-orange-500/20 shadow-xl shadow-orange-500/10 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-orange-500/10">
          <CardTitle className="text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/40">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-orange-200 to-amber-200 bg-clip-text text-transparent font-semibold">
              {labels.title}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-sm text-orange-200/70 font-medium">{labels.notificationTitle}</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={labels.titlePlaceholder}
              className="bg-orange-950/30 border-orange-500/20 text-white placeholder:text-orange-300/40 focus:border-orange-400/50"
            />
          </div>

          {/* Body Input */}
          <div className="space-y-2">
            <label className="text-sm text-orange-200/70 font-medium">{labels.notificationBody}</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={labels.bodyPlaceholder}
              className="bg-orange-950/30 border-orange-500/20 text-white min-h-[100px] placeholder:text-orange-300/40 focus:border-orange-400/50"
            />
          </div>

          {/* Severity Select */}
          <div className="space-y-2">
            <label className="text-sm text-orange-200/70 font-medium">{labels.severity}</label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as 'warning' | 'danger')}>
              <SelectTrigger className="bg-orange-950/30 border-orange-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-orange-500/20">
                <SelectItem value="warning">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    {labels.warning}
                  </div>
                </SelectItem>
                <SelectItem value="danger">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    {labels.danger}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Send Button */}
          <Button
            onClick={() => sendNotification.mutate()}
            disabled={!canSend || sendNotification.isPending}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-0 shadow-lg shadow-orange-500/30 transition-all"
          >
            {sendNotification.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {labels.sending}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {labels.send} ({selectedUsers.length} {labels.selectedCount})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* User Selection */}
      <Card className="bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-indigo-950/30 border-blue-500/20 shadow-xl shadow-blue-500/10 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-blue-500/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text text-transparent font-semibold">
                {labels.selectUsers}
              </span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/20"
            >
              {labels.selectAll}
            </Button>
          </div>
          
          {/* Farm Type Filter Buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant={farmTypeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFarmTypeFilter('all')}
              className={farmTypeFilter === 'all' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0' 
                : 'border-blue-500/30 text-blue-300 hover:bg-blue-500/20'}
            >
              {labels.all} ({users?.length || 0})
            </Button>
            <Button
              variant={farmTypeFilter === 'layer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectByFarmType('layer')}
              className={farmTypeFilter === 'layer' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0' 
                : 'border-amber-500/30 text-amber-300 hover:bg-amber-500/20'}
            >
              🥚 {labels.layer} ({users?.filter(u => u.farm_type !== 'broiler').length || 0})
            </Button>
            <Button
              variant={farmTypeFilter === 'broiler' ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectByFarmType('broiler')}
              className={farmTypeFilter === 'broiler' 
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white border-0' 
                : 'border-orange-500/30 text-orange-300 hover:bg-orange-500/20'}
            >
              🐔 {labels.broiler} ({users?.filter(u => u.farm_type === 'broiler').length || 0})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ScrollArea className="h-[300px]">
            {loadingUsers ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-14 w-full bg-blue-900/30" />
                ))}
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedUsers.includes(user.id)
                        ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/40'
                        : 'bg-blue-950/20 border border-blue-500/10 hover:border-blue-400/30'
                    }`}
                    onClick={() => toggleUser(user.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                      className="border-blue-400/50"
                    />
                    <Avatar className="w-8 h-8 border border-blue-500/30">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                        {user.farm_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{user.farm_name}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${
                            user.farm_type === 'broiler' 
                              ? 'border-orange-500/50 text-orange-300' 
                              : 'border-amber-500/50 text-amber-300'
                          }`}
                        >
                          {user.farm_type === 'broiler' ? '🐔' : '🥚'}
                        </Badge>
                      </div>
                      <p className="text-xs text-blue-200/60">{user.phone || 'No phone'}</p>
                    </div>
                    {user.hasPushEnabled && (
                      <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs border-0">
                        <Bell className="w-3 h-3 mr-1" />
                        Push
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-blue-200/50 text-center py-8">{labels.noUsers}</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card className="bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-teal-950/30 border-cyan-500/20 shadow-xl shadow-cyan-500/10 backdrop-blur-sm lg:col-span-2">
        <CardHeader className="pb-3 border-b border-cyan-500/10">
          <CardTitle className="text-white flex items-center gap-3 text-base">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/40">
              <Info className="w-4 h-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-cyan-200 to-teal-200 bg-clip-text text-transparent font-semibold">
              {labels.recentNotifications}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {recentAlerts && recentAlerts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentAlerts.map(alert => (
                <Badge
                  key={alert.id}
                  className={`${
                    alert.severity === 'danger'
                      ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-0'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0'
                  } shadow-lg`}
                >
                  {alert.message.substring(0, 50)}...
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-cyan-200/50 text-sm">{labels.noRecentNotifications}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
