import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Cpu, Copy, Plus, Trash2, Settings, User, ChevronRight, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useFarmData';
import { useUserRole } from '@/hooks/useUserRole';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { generateDeviceToken } from '@/lib/esp32Api';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThresholdSettingsCard } from '@/components/settings/ThresholdSettingsCard';
import { HSISettingsCard } from '@/components/settings/HSISettingsCard';
import { FanSpeedSettingsCard } from '@/components/settings/FanSpeedSettingsCard';
import { WaterAnomalySettingsCard } from '@/components/settings/WaterAnomalySettingsCard';
import { SmartModeCard } from '@/components/settings/SmartModeCard';
import { WeatherAutoModeCard } from '@/components/settings/WeatherAutoModeCard';
import { BatterySettingsCard } from '@/components/settings/BatterySettingsCard';
import { SmsAlertSettingsCard } from '@/components/settings/SmsAlertSettingsCard';

export function SettingsPage() {
  const { language, user } = useAuth();
  const { data: profile } = useProfile();
  const { data: userRole } = useUserRole();
  const isOwner = userRole?.role === 'owner';
  const { isSupported, permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDeviceName, setNewDeviceName] = useState('');

  // Fetch device tokens
  const { data: deviceTokens } = useQuery({
    queryKey: ['device_tokens', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Add device token
  const addDeviceToken = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');
      const token = generateDeviceToken();
      const { error } = await supabase
        .from('device_tokens')
        .insert({ user_id: user.id, device_name: name, token });
      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      queryClient.invalidateQueries({ queryKey: ['device_tokens'] });
      setNewDeviceName('');
      toast({
        title: language === 'bn' ? 'ডিভাইস যোগ হয়েছে' : 'Device Added',
        description: language === 'bn' ? 'টোকেন কপি করতে ক্লিক করুন' : 'Click to copy token',
      });
    },
  });

  // Delete device token
  const deleteDeviceToken = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('device_tokens')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_tokens'] });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: language === 'bn' ? 'কপি হয়েছে!' : 'Copied!',
        description: language === 'bn' ? 'ক্লিপবোর্ডে কপি করা হয়েছে' : 'Copied to clipboard',
      });
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="section-title flex items-center gap-2">
            <Settings size={20} />
            {language === 'bn' ? 'সেটিংস' : 'Settings'}
          </h2>

          {/* Profile Section */}
          <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{profile?.farm_name}</p>
                  <Badge variant={isOwner ? 'default' : 'secondary'} className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    {isOwner 
                      ? (language === 'bn' ? 'মালিক' : 'Owner')
                      : (language === 'bn' ? 'কর্মী' : 'Worker')
                    }
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {!isOwner && (
                  <p className="text-xs text-status-warning mt-1">
                    {language === 'bn' ? 'শুধুমাত্র দেখার অনুমতি' : 'View only access'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Bell size={18} />
              {language === 'bn' ? 'পুশ নোটিফিকেশন' : 'Push Notifications'}
            </h3>
            
            {isSupported ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {language === 'bn' ? 'সতর্কতা নোটিফিকেশন' : 'Alert Notifications'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {permission === 'granted' 
                      ? (language === 'bn' ? 'অনুমতি দেওয়া হয়েছে' : 'Permission granted')
                      : permission === 'denied'
                        ? (language === 'bn' ? 'অনুমতি প্রত্যাখ্যাত' : 'Permission denied')
                        : (language === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission required')
                    }
                  </p>
                </div>
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={pushLoading || permission === 'denied'}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <BellOff size={20} />
                <p className="text-sm">
                  {language === 'bn' 
                    ? 'এই ব্রাউজারে পুশ নোটিফিকেশন সমর্থিত নয়' 
                    : 'Push notifications not supported in this browser'}
                </p>
              </div>
            )}
          </div>

          {/* Owner-only settings */}
          {isOwner && (
            <>
              {/* Smart Mode Profiles */}
              <div className="mb-6">
                <SmartModeCard />
              </div>

              {/* Weather Auto Mode */}
              <div className="mb-6">
                <WeatherAutoModeCard />
              </div>

              {/* Threshold Settings */}
              <div className="mb-6">
                <ThresholdSettingsCard />
              </div>

              {/* Fan Speed Settings */}
              <div className="mb-6">
                <FanSpeedSettingsCard />
              </div>

              {/* HSI Settings */}
              <div className="mb-6">
                <HSISettingsCard />
              </div>

              {/* Water Anomaly Settings */}
              <div className="mb-6">
                <WaterAnomalySettingsCard />
              </div>

              {/* Battery Backup Settings */}
              <div className="mb-6">
                <BatterySettingsCard />
              </div>

              {/* SMS Alert Settings */}
              <div className="mb-6">
                <SmsAlertSettingsCard />
              </div>
            </>
          )}

          {/* Worker view-only notice */}
          {!isOwner && (
            <div className="mb-6 rounded-2xl bg-muted/50 p-4 border border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                {language === 'bn' 
                  ? 'সেটিংস পরিবর্তন করতে মালিকের অনুমতি প্রয়োজন'
                  : 'Owner permission required to change settings'}
              </p>
            </div>
          )}

          {/* ESP32 Device Tokens - Owner only */}
          {isOwner && (
            <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Cpu size={18} />
                {language === 'bn' ? 'ESP32 ডিভাইস টোকেন' : 'ESP32 Device Tokens'}
              </h3>
              
              <p className="mb-4 text-sm text-muted-foreground">
                {language === 'bn' 
                  ? 'আপনার ESP32 ডিভাইসগুলোকে এই অ্যাপের সাথে সংযুক্ত করতে টোকেন ব্যবহার করুন।'
                  : 'Use tokens to connect your ESP32 devices to this app.'}
              {language === 'bn' 
                ? 'আপনার ESP32 ডিভাইসগুলোকে এই অ্যাপের সাথে সংযুক্ত করতে টোকেন ব্যবহার করুন।'
                : 'Use tokens to connect your ESP32 devices to this app.'}
            </p>

            {/* Add new device */}
            <div className="mb-4 flex gap-2">
              <Input
                placeholder={language === 'bn' ? 'ডিভাইসের নাম' : 'Device name'}
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => newDeviceName && addDeviceToken.mutate(newDeviceName)}
                disabled={!newDeviceName || addDeviceToken.isPending}
                size="sm"
              >
                <Plus size={16} />
              </Button>
            </div>

            {/* Device list */}
            <div className="space-y-2">
              {deviceTokens?.map((device) => (
                <div key={device.id} className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{device.device_name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {device.token}
                    </p>
                    {device.last_seen_at && (
                      <p className="text-xs text-muted-foreground">
                        {language === 'bn' ? 'শেষ দেখা: ' : 'Last seen: '}
                        {new Date(device.last_seen_at).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(device.token)}
                  >
                    <Copy size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDeviceToken.mutate(device.id)}
                    className="text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}

              {(!deviceTokens || deviceTokens.length === 0) && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {language === 'bn' ? 'কোনো ডিভাইস নেই' : 'No devices yet'}
                </p>
              )}
            </div>
          </div>
          )}
          {/* Quick Links */}
          <div className="rounded-2xl bg-card shadow-card">
            <a href="/reports" className="flex items-center justify-between border-b p-4">
              <span className="font-medium">{language === 'bn' ? 'রিপোর্ট দেখুন' : 'View Reports'}</span>
              <ChevronRight size={18} className="text-muted-foreground" />
            </a>
            <a href="/automation" className="flex items-center justify-between p-4">
              <span className="font-medium">{language === 'bn' ? 'অটোমেশন সেটআপ' : 'Setup Automation'}</span>
              <ChevronRight size={18} className="text-muted-foreground" />
            </a>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
