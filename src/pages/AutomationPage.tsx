import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Zap, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { translations } from '@/lib/translations';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AutomationRule } from '@/lib/types';

export function AutomationPage() {
  const { 
    language, 
    automationRules, 
    addAutomationRule, 
    updateAutomationRule, 
    deleteAutomationRule,
    farmSettings,
    setFarmSettings 
  } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState<Omit<AutomationRule, 'id'>>({
    name: '',
    condition: { sensor: 'temperature', operator: '>', value: 30 },
    action: { device: 'fan', state: true },
    enabled: true,
  });

  const handleAddRule = () => {
    if (newRule.name.trim()) {
      addAutomationRule(newRule);
      setNewRule({
        name: '',
        condition: { sensor: 'temperature', operator: '>', value: 30 },
        action: { device: 'fan', state: true },
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

      <main className="page-container px-4">
        {/* Threshold Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
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
                  value={farmSettings.temperatureMax}
                  onChange={(e) => setFarmSettings({ temperatureMax: Number(e.target.value) })}
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
                  value={farmSettings.ammoniaMax}
                  onChange={(e) => setFarmSettings({ ammoniaMax: Number(e.target.value) })}
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
                  value={farmSettings.humidityMax}
                  onChange={(e) => setFarmSettings({ humidityMax: Number(e.target.value) })}
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
                      value={newRule.condition.sensor}
                      onValueChange={(v) => setNewRule({
                        ...newRule,
                        condition: { ...newRule.condition, sensor: v as any }
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
                      value={newRule.condition.operator}
                      onValueChange={(v) => setNewRule({
                        ...newRule,
                        condition: { ...newRule.condition, operator: v as any }
                      })}
                    >
                      <SelectTrigger className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">&gt;</SelectItem>
                        <SelectItem value="<">&lt;</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={newRule.condition.value}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        condition: { ...newRule.condition, value: Number(e.target.value) }
                      })}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">THEN</span>
                    <Select
                      value={newRule.action.device}
                      onValueChange={(v) => setNewRule({
                        ...newRule,
                        action: { ...newRule.action, device: v as any }
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
                      value={newRule.action.state ? 'on' : 'off'}
                      onValueChange={(v) => setNewRule({
                        ...newRule,
                        action: { ...newRule.action, state: v === 'on' }
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
                  <Button onClick={handleAddRule} className="w-full">
                    {translations.common.save[language]}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {automationRules.map((rule) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    rule.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Zap size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {sensorLabels[rule.condition.sensor]} {rule.condition.operator} {rule.condition.value}
                      <ChevronRight size={14} className="mx-1 inline" />
                      {deviceLabels[rule.action.device]} {rule.action.state ? 'ON' : 'OFF'}
                    </p>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => updateAutomationRule(rule.id, { enabled })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAutomationRule(rule.id)}
                    className="text-destructive"
                  >
                    <Trash2 size={18} />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
