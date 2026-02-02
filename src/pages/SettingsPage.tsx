import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, BellOff, Cpu, Copy, Plus, Trash2, Settings, User, 
  ChevronRight, Shield, Zap, Thermometer, Droplets, Wind, 
  Battery, MessageSquare, Cloud, FileText, Cog, ChevronDown, Pencil, Check, X, Crown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useFarmData';
import { useUserRole } from '@/hooks/useUserRole';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { generateDeviceToken } from '@/lib/esp32Api';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ProfileAvatarUpload } from '@/components/settings/ProfileAvatarUpload';
import { InstallPromptCard } from '@/components/pwa/InstallPromptCard';
import { NotificationSoundCard } from '@/components/settings/NotificationSoundCard';

// Collapsible Section Component
function SettingsSection({ 
  title, 
  titleBn, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  language 
}: { 
  title: string; 
  titleBn: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  language: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="mb-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon size={20} />
          </div>
          <span className="font-semibold">{language === 'bn' ? titleBn : title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function SettingsPage() {
  const { language, user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: userRole } = useUserRole();
  const isOwner = userRole?.role === 'owner';
  const { isSuperAdmin } = useSuperAdmin();
  const { isSupported, permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDeviceName, setNewDeviceName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFarmName, setEditedFarmName] = useState('');

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
    onSuccess: () => {
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

  const handleEditName = () => {
    setEditedFarmName(profile?.farm_name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editedFarmName.trim()) return;
    
    try {
      await updateProfile.mutateAsync({ farm_name: editedFarmName.trim() });
      toast({
        title: language === 'bn' ? 'সেভ হয়েছে!' : 'Saved!',
        description: language === 'bn' ? 'ফার্মের নাম আপডেট হয়েছে' : 'Farm name updated',
      });
      setIsEditingName(false);
    } catch (error) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'আবার চেষ্টা করুন' : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedFarmName('');
  };

  const t = {
    settings: { bn: 'সেটিংস', en: 'Settings' },
    profile: { bn: 'প্রোফাইল', en: 'Profile' },
    owner: { bn: 'মালিক', en: 'Owner' },
    worker: { bn: 'কর্মী', en: 'Worker' },
    viewOnly: { bn: 'শুধুমাত্র দেখার অনুমতি', en: 'View only access' },
    quickActions: { bn: 'দ্রুত কাজ', en: 'Quick Actions' },
    automationControl: { bn: 'অটোমেশন কন্ট্রোল', en: 'Automation Control' },
    sensorThresholds: { bn: 'সেন্সর থ্রেশহোল্ড', en: 'Sensor Thresholds' },
    notifications: { bn: 'নোটিফিকেশন', en: 'Notifications' },
    deviceManagement: { bn: 'ডিভাইস ম্যানেজমেন্ট', en: 'Device Management' },
    ownerRequired: { bn: 'সেটিংস পরিবর্তন করতে মালিকের অনুমতি প্রয়োজন', en: 'Owner permission required to change settings' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />

      <main className="page-container px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Page Title */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t.settings[language]}</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'আপনার পছন্দ অনুযায়ী কাস্টমাইজ করুন' : 'Customize your preferences'}
              </p>
            </div>
          </div>

          {/* Profile Card - Hero Style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-5 text-primary-foreground shadow-lg"
          >
            <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-6 translate-y-6 rounded-full bg-white/10" />
            
            <div className="relative flex items-center gap-4">
              <ProfileAvatarUpload />
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedFarmName}
                      onChange={(e) => setEditedFarmName(e.target.value)}
                      className="h-8 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-lg font-bold"
                      placeholder={language === 'bn' ? 'ফার্মের নাম' : 'Farm name'}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSaveName}
                      disabled={updateProfile.isPending}
                      className="h-8 w-8 text-white hover:bg-white/20"
                    >
                      <Check size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8 w-8 text-white hover:bg-white/20"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-white truncate">{profile?.farm_name || 'Smart Farm'}</p>
                    {isOwner && (
                      <button
                        onClick={handleEditName}
                        className="p-1 rounded-md hover:bg-white/20 transition-colors"
                      >
                        <Pencil size={14} className="text-white/80" />
                      </button>
                    )}
                    <Badge 
                      className={`text-xs shrink-0 ${isOwner 
                        ? 'bg-green-500/20 text-green-100 border-green-400/30' 
                        : 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30'
                      }`}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {isOwner ? t.owner[language] : t.worker[language]}
                    </Badge>
                  </div>
                )}
                <p className="text-sm text-white/80">{user?.email}</p>
                {!isOwner && (
                  <p className="mt-1 text-xs text-yellow-200">
                    ⚠️ {t.viewOnly[language]}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* PWA Install Prompt */}
          <InstallPromptCard />

          {/* Quick Actions Grid */}
          <div className={`grid gap-3 ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {/* Super Admin Link */}
            {isSuperAdmin && (
              <motion.a
                href="/admin"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 p-4 shadow-sm transition-colors hover:from-purple-700 hover:to-purple-800 text-white"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                  <Crown size={20} />
                </div>
                <div>
                  <p className="font-medium text-sm">{language === 'bn' ? 'অ্যাডমিন' : 'Admin'}</p>
                  <p className="text-xs text-purple-200">{language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}</p>
                </div>
              </motion.a>
            )}
            
            <motion.a
              href="/reports"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <FileText size={20} />
              </div>
              <div>
                <p className="font-medium text-sm">{language === 'bn' ? 'রিপোর্ট' : 'Reports'}</p>
                <p className="text-xs text-muted-foreground">{language === 'bn' ? 'দেখুন' : 'View'}</p>
              </div>
            </motion.a>
            
            <motion.a
              href="/automation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                <Cog size={20} />
              </div>
              <div>
                <p className="font-medium text-sm">{language === 'bn' ? 'অটোমেশন' : 'Automation'}</p>
                <p className="text-xs text-muted-foreground">{language === 'bn' ? 'সেটআপ' : 'Setup'}</p>
              </div>
            </motion.a>
          </div>

          {/* Worker Notice */}
          {!isOwner && (
            <Card className="border-dashed bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  🔒 {t.ownerRequired[language]}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Owner-only Settings */}
          {isOwner && (
            <>
              {/* Quick Mode Section */}
              <SettingsSection 
                title="Quick Mode Profiles" 
                titleBn="কুইক মোড প্রোফাইল"
                icon={Zap}
                defaultOpen={true}
                language={language}
              >
                <SmartModeCard compact />
              </SettingsSection>

              {/* Automation Section */}
              <SettingsSection 
                title="Weather & Automation" 
                titleBn="আবহাওয়া ও অটোমেশন"
                icon={Cloud}
                language={language}
              >
                <div className="space-y-4">
                  <WeatherAutoModeCard />
                </div>
              </SettingsSection>

              {/* Sensor Thresholds Section */}
              <SettingsSection 
                title="Sensor Thresholds" 
                titleBn="সেন্সর থ্রেশহোল্ড"
                icon={Thermometer}
                language={language}
              >
                <div className="space-y-4">
                  <ThresholdSettingsCard />
                </div>
              </SettingsSection>

              {/* Fan Control Section */}
              <SettingsSection 
                title="Fan Speed Control" 
                titleBn="ফ্যান স্পিড কন্ট্রোল"
                icon={Wind}
                language={language}
              >
                <FanSpeedSettingsCard />
              </SettingsSection>

              {/* Heat Stress Section */}
              <SettingsSection 
                title="Heat Stress Index (HSI)" 
                titleBn="হিট স্ট্রেস ইনডেক্স (HSI)"
                icon={Thermometer}
                language={language}
              >
                <HSISettingsCard />
              </SettingsSection>

              {/* Water Monitoring Section */}
              <SettingsSection 
                title="Water Monitoring" 
                titleBn="পানি মনিটরিং"
                icon={Droplets}
                language={language}
              >
                <WaterAnomalySettingsCard />
              </SettingsSection>

              {/* Battery & Power Section */}
              <SettingsSection 
                title="Battery & Power" 
                titleBn="ব্যাটারি ও পাওয়ার"
                icon={Battery}
                language={language}
              >
                <BatterySettingsCard />
              </SettingsSection>
            </>
          )}

          {/* Notifications Section - Available for all */}
          <SettingsSection 
            title="Notifications" 
            titleBn="নোটিফিকেশন"
            icon={Bell}
            defaultOpen={!isOwner}
            language={language}
          >
            <div className="space-y-4">
              {/* Push Notifications */}
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isSubscribed ? (
                      <Bell className="h-5 w-5 text-green-500" />
                    ) : (
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">
                        {language === 'bn' ? 'পুশ নোটিফিকেশন' : 'Push Notifications'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {!isSupported 
                          ? (language === 'bn' ? 'সমর্থিত নয়' : 'Not supported')
                          : permission === 'granted'
                            ? (language === 'bn' ? 'অনুমতি দেওয়া হয়েছে' : 'Permission granted')
                            : permission === 'denied'
                              ? (language === 'bn' ? 'অনুমতি প্রত্যাখ্যাত' : 'Permission denied')
                              : (language === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission required')
                        }
                      </p>
                    </div>
                  </div>
                  {isSupported && (
                    <Switch
                      checked={isSubscribed}
                      onCheckedChange={handlePushToggle}
                      disabled={pushLoading || permission === 'denied'}
                    />
                  )}
                </div>
              </div>

              {/* Notification Sounds */}
              <NotificationSoundCard />

              {/* SMS Alerts - Owner only */}
              {isOwner && <SmsAlertSettingsCard />}
            </div>
          </SettingsSection>

          {/* Device Management - Owner only */}
          {isOwner && (
            <SettingsSection 
              title="ESP32 Devices" 
              titleBn="ESP32 ডিভাইস"
              icon={Cpu}
              language={language}
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {language === 'bn' 
                    ? 'আপনার ESP32 ডিভাইসগুলোকে এই অ্যাপের সাথে সংযুক্ত করতে টোকেন ব্যবহার করুন।'
                    : 'Use tokens to connect your ESP32 devices to this app.'}
                </p>

                {/* Add new device */}
                <div className="flex gap-2">
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
                    <Plus size={16} className="mr-1" />
                    {language === 'bn' ? 'যোগ' : 'Add'}
                  </Button>
                </div>

                {/* Device list */}
                <div className="space-y-2">
                  {deviceTokens?.map((device) => (
                    <motion.div 
                      key={device.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 rounded-xl bg-muted/50 p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Cpu size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{device.device_name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {device.token.substring(0, 20)}...
                        </p>
                        {device.last_seen_at && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            🟢 {language === 'bn' ? 'সংযুক্ত' : 'Connected'}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(device.token)}
                        className="h-8 w-8"
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDeviceToken.mutate(device.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </motion.div>
                  ))}

                  {(!deviceTokens || deviceTokens.length === 0) && (
                    <div className="py-8 text-center">
                      <Cpu className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {language === 'bn' ? 'কোনো ডিভাইস নেই' : 'No devices yet'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </SettingsSection>
          )}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
