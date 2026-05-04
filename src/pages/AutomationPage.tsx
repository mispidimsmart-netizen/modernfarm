import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Zap, ChevronRight, Activity, Clock, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { 
  useFarmSettings, 
  useUpdateFarmSettings,
  useAutomationRules, 
  useAddAutomationRule, 
  useUpdateAutomationRule, 
  useDeleteAutomationRule 
} from '@/hooks/useFarmData';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { translations } from '@/lib/translations';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database } from '@/integrations/supabase/types';
import { AutomationEngineDashboard } from '@/components/automation/AutomationEngineDashboard';
import { SetupBlocker } from '@/components/setup/SetupBlocker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type SensorType = Database['public']['Enums']['sensor_type'];
type OperatorType = Database['public']['Enums']['operator_type'];
type DeviceType = Database['public']['Enums']['device_type'];

export function AutomationPage() {
  const { language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { data: farmSettings } = useFarmSettings();
  const updateSettings = useUpdateFarmSettings();
  const { data: automationRules } = useAutomationRules();
  const addRule = useAddAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const deleteRule = useDeleteAutomationRule();
  const { hasRealData } = useRealtimeSensorData();
  const queryClient = useQueryClient();
  const wasOfflineRef = useRef(!hasRealData);

  // When ESP32 comes back online, refresh rules + automation status so any
  // "Pending" badge clears and the engine view reflects fresh evaluations.
  useEffect(() => {
    if (wasOfflineRef.current && hasRealData) {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      queryClient.invalidateQueries({ queryKey: ['automation_status'] });
      queryClient.invalidateQueries({ queryKey: ['device_status'] });
      toast.success(
        language === 'bn'
          ? 'ESP32 অনলাইন — নিয়মগুলো এখন কার্যকর হচ্ছে'
          : 'ESP32 online — rules are now active'
      );
    }
    wasOfflineRef.current = !hasRealData;
  }, [hasRealData, queryClient, language]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    condition_sensor: 'temperature' as SensorType,
    condition_operator: '>' as OperatorType,
    condition_value: 30,
    action_device: 'fan' as DeviceType,
    action_state: true,
    enabled: true,
  });

  const handleAddRule = () => {
    if (newRule.name.trim()) {
      addRule.mutate({ ...newRule, farm_id: selectedFarmId });
      setNewRule({
        name: '',
        condition_sensor: 'temperature',
        condition_operator: '>',
        condition_value: 30,
        action_device: 'fan',
        action_state: true,
        enabled: true,
      });
      setIsDialogOpen(false);
    }
  };

  const sensorLabels = {
    temperature: translations.sensors.temperature[language],
    humidity: translations.sensors.humidity[language],
    ammonia: translations.sensors.ammonia[language],
  };

  const deviceLabels = {
    fan: translations.sensors.fan[language],
    light: translations.sensors.light[language],
    alarm: translations.sensors.alarm[language],
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4 pb-24">
        <SetupBlocker>
        <Tabs defaultValue="engine" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="engine" className="gap-1.5">
              <Activity className="h-4 w-4" />
              {language === 'bn' ? 'ইঞ্জিন' : 'Engine'}
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5">
              <Zap className="h-4 w-4" />
              {language === 'bn' ? 'নিয়ম' : 'Rules'}
            </TabsTrigger>
          </TabsList>

          {/* Automation Engine Dashboard */}
          <TabsContent value="engine">
            <AutomationEngineDashboard />
          </TabsContent>

          {/* Custom Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            {/* Threshold Settings */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="section-title">
                {language === 'bn' ? 'থ্রেশহোল্ড সেটিংস' : 'Threshold Settings'}
              </h2>
              <div className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {translations.sensors.temperature[language]} (Max)
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={farmSettings?.temperature_max ?? 32}
                      onChange={(e) => updateSettings.mutate({ temperature_max: Number(e.target.value) })}
                      className="h-10 w-20 text-center"
                    />
                    <span className="text-sm text-muted-foreground">°C</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {translations.sensors.ammonia[language]} (Max)
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={farmSettings?.ammonia_max ?? 25}
                      onChange={(e) => updateSettings.mutate({ ammonia_max: Number(e.target.value) })}
                      className="h-10 w-20 text-center"
                    />
                    <span className="text-sm text-muted-foreground">ppm</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {translations.sensors.humidity[language]} (Max)
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={farmSettings?.humidity_max ?? 80}
                      onChange={(e) => updateSettings.mutate({ humidity_max: Number(e.target.value) })}
                      className="h-10 w-20 text-center"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Automation Rules */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-title mb-0">{translations.automation.title[language]}</h2>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1 rounded-full">
                      <Plus size={16} />
                      {language === 'bn' ? 'নতুন' : 'New'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90%] rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>{translations.automation.addRule[language]}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input
                        placeholder={language === 'bn' ? 'নিয়মের নাম' : 'Rule Name'}
                        value={newRule.name}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm">IF</span>
                        <Select
                          value={newRule.condition_sensor}
                          onValueChange={(v) => setNewRule({
                            ...newRule,
                            condition_sensor: v as SensorType
                          })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="temperature">{sensorLabels.temperature}</SelectItem>
                            <SelectItem value="humidity">{sensorLabels.humidity}</SelectItem>
                            <SelectItem value="ammonia">{sensorLabels.ammonia}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={newRule.condition_operator}
                          onValueChange={(v) => setNewRule({
                            ...newRule,
                            condition_operator: v as OperatorType
                          })}
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=">">&gt;</SelectItem>
                            <SelectItem value="<">&lt;</SelectItem>
                            <SelectItem value=">=">&gt;=</SelectItem>
                            <SelectItem value="<=">&lt;=</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={newRule.condition_value}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            condition_value: Number(e.target.value)
                          })}
                          className="w-20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">THEN</span>
                        <Select
                          value={newRule.action_device}
                          onValueChange={(v) => setNewRule({
                            ...newRule,
                            action_device: v as DeviceType
                          })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fan">{deviceLabels.fan}</SelectItem>
                            <SelectItem value="light">{deviceLabels.light}</SelectItem>
                            <SelectItem value="alarm">{deviceLabels.alarm}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={newRule.action_state ? 'on' : 'off'}
                          onValueChange={(v) => setNewRule({
                            ...newRule,
                            action_state: v === 'on'
                          })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on">ON</SelectItem>
                            <SelectItem value="off">OFF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddRule} className="w-full" disabled={addRule.isPending}>
                        {translations.common.save[language]}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {!hasRealData && (automationRules?.some((r) => r.enabled) ?? false) && (
                <div
                  className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
                  role="status"
                  aria-live="polite"
                >
                  <WifiOff className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    {language === 'bn'
                      ? 'ESP32 অফলাইন — সক্রিয় নিয়মগুলো Pending অবস্থায় আছে, ডিভাইস অনলাইনে এলে স্বয়ংক্রিয়ভাবে চালু হবে।'
                      : 'ESP32 offline — active rules are pending and will resume automatically when the device is back online.'}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <AnimatePresence>
                  {automationRules?.map((rule) => {
                    const isPending = rule.enabled && !hasRealData;
                    return (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card',
                        isPending && 'border border-amber-500/40'
                      )}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : rule.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isPending ? <Clock size={20} /> : <Zap size={20} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{rule.name}</p>
                          {isPending && (
                            <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                              {language === 'bn' ? 'Pending' : 'Pending'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {sensorLabels[rule.condition_sensor as keyof typeof sensorLabels]} {rule.condition_operator} {rule.condition_value}
                          <ChevronRight size={14} className="mx-1 inline" />
                          {deviceLabels[rule.action_device as keyof typeof deviceLabels]} {rule.action_state ? 'ON' : 'OFF'}
                        </p>
                      </div>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(enabled) => updateRule.mutate({ id: rule.id, enabled })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule.mutate(rule.id)}
                        className="text-destructive"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </motion.div>
                    );
                  })}
                </AnimatePresence>

                {(!automationRules || automationRules.length === 0) && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {language === 'bn' ? 'কোনো নিয়ম নেই। নতুন নিয়ম যোগ করুন।' : 'No rules yet. Add a new rule.'}
                  </p>
                )}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
        </SetupBlocker>
      </main>

      <BottomNav />
    </div>
  );
}
