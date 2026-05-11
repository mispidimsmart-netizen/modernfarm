import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, BellOff, Settings, User, Shield, Pencil, Check, X, Crown, Users, Home, BarChart3, Cpu, ChevronDown, Download, Lightbulb, Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useFarmData';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ProfileAvatarUpload } from '@/components/settings/ProfileAvatarUpload';
import { SettingsInstallCard } from '@/components/pwa/SettingsInstallCard';
import { NotificationSoundCard } from '@/components/settings/NotificationSoundCard';
import { PushNotificationHelpDialog } from '@/components/settings/PushNotificationHelpDialog';
import { WorkerManagementSheet } from '@/components/team/WorkerManagementSheet';
import { SmsAlertSettingsCard } from '@/components/settings/SmsAlertSettingsCard';
import { AlertRulesCard } from '@/components/settings/AlertRulesCard';
import { MeshNetworkCard } from '@/components/settings/MeshNetworkCard';
import { GsmFallbackCard } from '@/components/settings/GsmFallbackCard';
import { NotificationPriorityCard } from '@/components/settings/NotificationPriorityCard';
import { QuietHoursAndSnoozeCard } from '@/components/settings/QuietHoursAndSnoozeCard';
import { TestNotificationCard } from '@/components/settings/TestNotificationCard';
import { 
  FarmSetupTab, 
  OperationPreferencesTab, 
  ReportsDataTab, 
  DeviceSystemTab,
  LightingTab,
} from '@/components/settings/tabs';
import { ESP32CodeGenerator } from '@/components/device/ESP32CodeGenerator';

export function SettingsPage() {
  const { language, user } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: userRole } = useUserRole();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions();
  const isOwner = userRole?.role === 'owner';
  const isAdmin = permissions?.role === 'admin';
  const canEditSettings = permissions?.canEditFarmSettings ?? false;
  const { isSupported, permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { data: myOrgs = [] } = useQuery({
    queryKey: ['my_organizations_settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_organizations' as any);
      if (error) return [];
      return (data || []) as Array<{ id: string; name: string; my_role: string }>;
    },
  });
  const isOrgAdmin = myOrgs.length > 0;
  const { toast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFarmName, setEditedFarmName] = useState('');
  const [activeTab, setActiveTab] = useState('farm-setup');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
    owner: { bn: 'মালিক', en: 'Owner' },
    worker: { bn: 'কর্মী', en: 'Worker' },
    viewOnly: { bn: 'শুধুমাত্র দেখার অনুমতি', en: 'View only access' },
    farmSetup: { bn: 'খামার সেটআপ', en: 'Farm Setup' },
    operation: { bn: 'পরিচালনা', en: 'Operation' },
    reports: { bn: 'রিপোর্ট', en: 'Reports' },
    firmware: { bn: 'ফার্মওয়্যার', en: 'Firmware' },
    device: { bn: 'ডিভাইস', en: 'Device' },
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
            <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-primary-foreground/10" />
            <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-6 translate-y-6 rounded-full bg-primary-foreground/10" />
            
            <div className="relative flex items-center gap-4">
              <ProfileAvatarUpload />
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedFarmName}
                      onChange={(e) => setEditedFarmName(e.target.value)}
                      className="h-8 bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50 text-lg font-bold"
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
                      className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                    >
                      <Check size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-primary-foreground truncate">{profile?.farm_name || 'Smart Farm'}</p>
                    {isOwner && (
                      <button
                        onClick={handleEditName}
                        className="p-1 rounded-md hover:bg-primary-foreground/20 transition-colors"
                      >
                        <Pencil size={14} className="text-primary-foreground/80" />
                      </button>
                    )}
                    <Badge 
                      className={`text-xs shrink-0 ${
                        isAdmin 
                          ? 'bg-purple-500/20 text-purple-100 border-purple-400/30'
                          : isOwner 
                            ? 'bg-green-500/20 text-green-100 border-green-400/30' 
                            : 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30'
                      }`}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {isAdmin 
                        ? (language === 'bn' ? 'অ্যাডমিন' : 'Admin')
                        : isOwner 
                          ? t.owner[language] 
                          : t.worker[language]}
                    </Badge>
                  </div>
                )}
                <p className="text-sm text-primary-foreground/80">{user?.email}</p>
                {!isOwner && (
                  <p className="mt-1 text-xs text-yellow-200">
                    ⚠️ {t.viewOnly[language]}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* App Install & Team Management Row */}
          <div className="grid grid-cols-2 gap-3">
            <SettingsInstallCard />
            
            {isOwner ? (
              <WorkerManagementSheet />
            ) : (
              <div className="flex items-center gap-2.5 rounded-2xl bg-muted/50 p-3 border border-dashed">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-muted-foreground text-sm">
                    {language === 'bn' ? 'দল ব্যবস্থাপনা' : 'Team'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'মালিকের জন্য' : 'Owner only'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Org Admin Dashboard — visible to org owners/admins */}
          {isOrgAdmin && (
            <motion.a
              href="/org-admin"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-4 shadow-sm transition-colors hover:from-emerald-700 hover:to-emerald-800 text-primary-foreground"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20">
                <Building2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{language === 'bn' ? 'আমার কোম্পানি' : 'My Organization'}</p>
                <p className="text-xs text-emerald-100 truncate">
                  {myOrgs.length === 1
                    ? myOrgs[0].name
                    : (language === 'bn' ? `${myOrgs.length} টি কোম্পানি` : `${myOrgs.length} organizations`)}
                </p>
              </div>
            </motion.a>
          )}

          {/* Quick Actions */}
          {isAdmin && (
            <motion.a
              href="/admin"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 p-4 shadow-sm transition-colors hover:from-purple-700 hover:to-purple-800 text-primary-foreground"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20">
                <Crown size={20} />
              </div>
              <div>
                <p className="font-medium text-sm">{language === 'bn' ? 'অ্যাডমিন ড্যাশবোর্ড' : 'Admin Dashboard'}</p>
                <p className="text-xs text-purple-200">{language === 'bn' ? 'সিস্টেম ম্যানেজমেন্ট' : 'System management'}</p>
              </div>
            </motion.a>
          )}

          {/* Viewer Notice */}
          {!canEditSettings && (
            <Card className="border-dashed bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  🔒 {language === 'bn' 
                    ? 'আপনি শুধুমাত্র দেখতে পারবেন — পরিবর্তন করতে অ্যাডমিন বা মালিকের অনুমতি প্রয়োজন' 
                    : 'View only — admin or owner permission required to make changes'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Main Settings Tabs — visible to all; non-editors get a read-only overlay */}
          <div className={!canEditSettings ? 'pointer-events-none opacity-60 select-none' : ''} aria-disabled={!canEditSettings}>
          {(canEditSettings || !permissionsLoading) && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4 h-auto p-1 gap-1 bg-muted/60 rounded-xl">
                <TabsTrigger 
                  value="farm-setup" 
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  <Home className="h-4 w-4 shrink-0" />
                  <span>{language === 'bn' ? 'খামার' : 'Farm'}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="operation" 
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>{language === 'bn' ? 'পরিচালনা' : 'Ops'}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="lighting" 
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  <Lightbulb className="h-4 w-4 shrink-0" />
                  <span>{language === 'bn' ? 'লাইটিং' : 'Light'}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="reports" 
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  <BarChart3 className="h-4 w-4 shrink-0" />
                  <span>{language === 'bn' ? 'রিপোর্ট' : 'Reports'}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="device" 
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  <Cpu className="h-4 w-4 shrink-0" />
                  <span>{language === 'bn' ? 'ডিভাইস' : 'Device'}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="farm-setup">
                <FarmSetupTab />
              </TabsContent>

              <TabsContent value="operation">
                <OperationPreferencesTab />
              </TabsContent>

              <TabsContent value="lighting">
                <LightingTab />
              </TabsContent>

              <TabsContent value="reports">
                <ReportsDataTab />
              </TabsContent>

              <TabsContent value="device">
                <DeviceSystemTab />
              </TabsContent>
            </Tabs>
          )}
          </div>

          {/* Notifications Section - Collapsible */}
          <Collapsible open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardContent className="pt-6 pb-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Bell size={20} />
                      </div>
                      <div>
                        <p className="font-semibold">{language === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}</p>
                        <p className="text-xs text-muted-foreground">
                          {isSubscribed 
                            ? (language === 'bn' ? '✓ সক্রিয়' : '✓ Active')
                            : (language === 'bn' ? 'অ্যালার্ট ও আপডেট' : 'Alerts & updates')}
                        </p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isNotificationsOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </motion.div>
                  </div>
                </CardContent>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 pb-6 space-y-4">
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
                      <div className="flex items-center gap-2">
                        {permission === 'denied' && <PushNotificationHelpDialog language={language} />}
                        {isSupported && (
                          <Switch
                            checked={isSubscribed}
                            onCheckedChange={handlePushToggle}
                            disabled={pushLoading || permission === 'denied'}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Priority & Escalation */}
                  <NotificationPriorityCard />

                  {/* Phase 7: Quiet hours + Snooze */}
                  <QuietHoursAndSnoozeCard />

                  {/* Phase 7: Test notification button */}
                  <TestNotificationCard />

                  {/* Notification Sounds */}
                  <NotificationSoundCard />

                  {/* SMS Alerts - Owner only */}
                  {isOwner && <SmsAlertSettingsCard />}

                  {/* Phase 4: Advanced alert rules */}
                  <AlertRulesCard />

                  {/* Phase 5: Multi-Device Mesh */}
                  <MeshNetworkCard />

                  {/* Phase 5: GSM Fallback */}
                  {isOwner && <GsmFallbackCard />}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
