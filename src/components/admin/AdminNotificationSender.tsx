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

  // Fetch all users with push subscriptions
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users-with-subscriptions'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, farm_name, phone, avatar_url')
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
        hasPushEnabled: usersWithPush.has(p.id),
      }));
    },
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
    if (selectedUsers.length === users?.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users?.map(u => u.id) || []);
    }
  };

  const canSend = selectedUsers.length > 0 && title.trim() && body.trim();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Notification Form */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" />
            {labels.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">{labels.notificationTitle}</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={labels.titlePlaceholder}
              className="bg-slate-700/50 border-white/10 text-white"
            />
          </div>

          {/* Body Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">{labels.notificationBody}</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={labels.bodyPlaceholder}
              className="bg-slate-700/50 border-white/10 text-white min-h-[100px]"
            />
          </div>

          {/* Severity Select */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">{labels.severity}</label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as 'warning' | 'danger')}>
              <SelectTrigger className="bg-slate-700/50 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
            className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
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
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              {labels.selectUsers}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="text-blue-400 hover:text-blue-300"
            >
              {labels.selectAll}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {loadingUsers ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-14 w-full bg-slate-700/50" />
                ))}
              </div>
            ) : users && users.length > 0 ? (
              <div className="space-y-2">
                {users.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUsers.includes(user.id)
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'bg-slate-700/30 hover:bg-slate-700/50'
                    }`}
                    onClick={() => toggleUser(user.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-purple-600 text-white text-xs">
                        {user.farm_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{user.farm_name}</p>
                      <p className="text-xs text-gray-400">{user.phone || 'No phone'}</p>
                    </div>
                    {user.hasPushEnabled && (
                      <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                        <Bell className="w-3 h-3 mr-1" />
                        Push
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">{labels.noUsers}</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card className="bg-slate-800/50 border-white/10 lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Info className="w-4 h-4 text-cyan-400" />
            {labels.recentNotifications}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAlerts && recentAlerts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentAlerts.map(alert => (
                <Badge
                  key={alert.id}
                  variant="outline"
                  className={`${
                    alert.severity === 'danger'
                      ? 'border-red-500/30 text-red-400'
                      : 'border-yellow-500/30 text-yellow-400'
                  }`}
                >
                  {alert.message.substring(0, 50)}...
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">{labels.noRecentNotifications}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
