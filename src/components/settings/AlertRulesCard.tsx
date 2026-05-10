import { useEffect, useState } from 'react';
import { Plus, Trash2, Bell, Phone, Clock, MessageSquare, Send } from 'lucide-react';
import { useFarmContext } from '@/context/FarmContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertRulesWizard } from './AlertRulesWizard';

const METRICS = [
  { v: 'temperature', label_bn: 'তাপমাত্রা (°C)', label_en: 'Temperature (°C)' },
  { v: 'humidity', label_bn: 'আর্দ্রতা (%)', label_en: 'Humidity (%)' },
  { v: 'ammonia', label_bn: 'অ্যামোনিয়া (ppm)', label_en: 'Ammonia (ppm)' },
  { v: 'water_usage', label_bn: 'পানি ব্যবহার (L/h)', label_en: 'Water (L/h)' },
  { v: 'hsi', label_bn: 'HSI সূচক', label_en: 'HSI' },
  { v: 'power_off', label_bn: 'বিদ্যুৎ বন্ধ', label_en: 'Power Off' },
  { v: 'device_offline', label_bn: 'ডিভাইস অফলাইন', label_en: 'Device Offline' },
];

const SEVERITIES = [
  { v: 'info', bn: 'তথ্য', en: 'Info' },
  { v: 'warning', bn: 'সতর্কতা', en: 'Warning' },
  { v: 'critical', bn: 'জরুরি', en: 'Critical' },
];

interface Rule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold_value: number | null;
  duration_seconds: number;
  severity: string;
  enabled: boolean;
  channels: { push?: boolean; sms?: boolean; whatsapp?: boolean; in_app?: boolean };
  cooldown_minutes: number;
}

export function AlertRulesCard() {
  const { language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const t = (bn: string, en: string) => (language === 'bn' ? bn : en);
  const [rules, setRules] = useState<Rule[]>([]);
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!selectedFarmId) return;
    setLoading(true);
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('alert_rules').select('*').eq('farm_id', selectedFarmId).order('created_at'),
      supabase.from('alert_channel_config').select('*').eq('farm_id', selectedFarmId).maybeSingle(),
    ]);
    setRules((r as any) ?? []);
    setCfg(c ?? {
      farm_id: selectedFarmId,
      push_enabled: true, sms_enabled: false, whatsapp_enabled: false,
      phone_e164: '', escalation_phone_e164: '',
      quiet_hours_start: '', quiet_hours_end: '',
      escalation_minutes: 15, critical_bypass_quiet_hours: true,
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, [selectedFarmId]);

  async function saveCfg() {
    if (!selectedFarmId) return;
    const payload = { ...cfg, farm_id: selectedFarmId };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = await supabase.from('alert_channel_config').upsert(payload, { onConflict: 'farm_id' });
    if (error) toast.error(t('সেট করতে ব্যর্থ', 'Save failed') + ': ' + error.message);
    else { toast.success(t('সেটিংস সংরক্ষিত', 'Settings saved')); load(); }
  }

  async function addRule() {
    if (!selectedFarmId) return;
    const { error } = await supabase.from('alert_rules').insert({
      farm_id: selectedFarmId,
      name: t('নতুন নিয়ম', 'New rule'),
      metric: 'temperature',
      operator: '>',
      threshold_value: 35,
      severity: 'warning',
      channels: { push: true, in_app: true, sms: false, whatsapp: false },
    });
    if (error) toast.error(error.message); else load();
  }

  async function updateRule(id: string, patch: Partial<Rule>) {
    const { error } = await supabase.from('alert_rules').update(patch).eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  async function deleteRule(id: string) {
    if (!confirm(t('নিয়মটি মুছে ফেলবেন?', 'Delete this rule?'))) return;
    await supabase.from('alert_rules').delete().eq('id', id);
    load();
  }

  async function sendTestAlert() {
    if (!selectedFarmId) return;
    const { error } = await supabase.from('alerts').insert({
      farm_id: selectedFarmId,
      user_id: (await supabase.auth.getUser()).data.user?.id!,
      alert_type: 'temperature' as any,
      severity: 'warning' as any,
      message: 'Test alert from FarmEye',
      message_bn: '🧪 পরীক্ষামূলক সতর্কতা — সিস্টেম ঠিক কাজ করছে',
    } as any);
    if (error) toast.error(error.message);
    else toast.success(t('পরীক্ষামূলক সতর্কতা পাঠানো হয়েছে', 'Test alert queued'));
  }

  if (!selectedFarmId) return null;

  return (
    <div className="rounded-xl bg-muted/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{t('উন্নত সতর্কতা নিয়ম', 'Advanced Alert Rules')}</p>
            <p className="text-xs text-muted-foreground">
              {t(`${rules.length}টি নিয়ম, ${rules.filter(r => r.enabled).length}টি সক্রিয়`,
                `${rules.length} rules, ${rules.filter(r => r.enabled).length} active`)}
            </p>
          </div>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">{t('পরিচালনা', 'Manage')}</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t('সতর্কতা সেটিংস', 'Alert Settings')}</SheetTitle>
            </SheetHeader>

            {loading ? (
              <p className="mt-6 text-center text-sm text-muted-foreground">{t('লোড হচ্ছে…', 'Loading…')}</p>
            ) : (
              <div className="mt-4 space-y-6 pb-12">
                {/* Channel config */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t('চ্যানেল সেটিংস', 'Channels')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{t('পুশ নোটিফিকেশন', 'Push')}</Label>
                      <Switch checked={!!cfg.push_enabled} onCheckedChange={(v) => setCfg({ ...cfg, push_enabled: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>SMS</Label>
                      <Switch checked={!!cfg.sms_enabled} onCheckedChange={(v) => setCfg({ ...cfg, sms_enabled: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>WhatsApp</Label>
                      <Switch checked={!!cfg.whatsapp_enabled} onCheckedChange={(v) => setCfg({ ...cfg, whatsapp_enabled: v })} />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{t('ফোন (+8801…)', 'Phone (+8801…)')}</Label>
                      <Input value={cfg.phone_e164 ?? ''} onChange={(e) => setCfg({ ...cfg, phone_e164: e.target.value })} placeholder="+8801XXXXXXXXX" />
                    </div>
                    <div>
                      <Label className="text-xs">{t('এসকালেশন ফোন (ম্যানেজার)', 'Escalation phone (manager)')}</Label>
                      <Input value={cfg.escalation_phone_e164 ?? ''} onChange={(e) => setCfg({ ...cfg, escalation_phone_e164: e.target.value })} placeholder="+8801XXXXXXXXX" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />{t('শান্ত সময় শুরু', 'Quiet start')}</Label>
                        <Input type="time" value={cfg.quiet_hours_start ?? ''} onChange={(e) => setCfg({ ...cfg, quiet_hours_start: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">{t('শান্ত সময় শেষ', 'Quiet end')}</Label>
                        <Input type="time" value={cfg.quiet_hours_end ?? ''} onChange={(e) => setCfg({ ...cfg, quiet_hours_end: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{t('জরুরি সতর্কতা শান্ত সময় উপেক্ষা করবে', 'Critical bypasses quiet hours')}</Label>
                      <Switch checked={!!cfg.critical_bypass_quiet_hours} onCheckedChange={(v) => setCfg({ ...cfg, critical_bypass_quiet_hours: v })} />
                    </div>
                    <div>
                      <Label className="text-xs">{t('এসকালেশন সময় (মিনিট)', 'Escalate after (min)')}</Label>
                      <Input type="number" value={cfg.escalation_minutes ?? 15} onChange={(e) => setCfg({ ...cfg, escalation_minutes: parseInt(e.target.value) || 15 })} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveCfg} className="flex-1">{t('সংরক্ষণ', 'Save')}</Button>
                      <Button variant="outline" onClick={sendTestAlert}>
                        <Send className="h-4 w-4 mr-1" />{t('পরীক্ষা', 'Test')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Rules list */}
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">{t('নিয়মাবলী', 'Rules')}</CardTitle>
                    <div className="flex items-center gap-2">
                      <AlertRulesWizard onCreated={load} />
                      <Button size="sm" variant="outline" onClick={addRule}>
                        <Plus className="h-4 w-4 mr-1" />{t('খালি', 'Blank')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {rules.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        {t('কোনো নিয়ম নেই — যোগ করুন', 'No rules yet — add one')}
                      </p>
                    )}
                    {rules.map((r) => (
                      <div key={r.id} className="rounded-lg border p-3 space-y-2 bg-card">
                        <div className="flex items-center gap-2">
                          <Input
                            value={r.name}
                            onChange={(e) => setRules(rules.map(x => x.id === r.id ? { ...x, name: e.target.value } : x))}
                            onBlur={() => updateRule(r.id, { name: r.name })}
                            className="h-8 text-sm font-medium"
                          />
                          <Switch checked={r.enabled} onCheckedChange={(v) => updateRule(r.id, { enabled: v })} />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteRule(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <Select value={r.metric} onValueChange={(v) => updateRule(r.id, { metric: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {METRICS.map(m => <SelectItem key={m.v} value={m.v}>{language === 'bn' ? m.label_bn : m.label_en}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={r.operator} onValueChange={(v) => updateRule(r.id, { operator: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value=">">{'>'}</SelectItem>
                              <SelectItem value=">=">{'>='}</SelectItem>
                              <SelectItem value="<">{'<'}</SelectItem>
                              <SelectItem value="<=">{'<='}</SelectItem>
                              <SelectItem value="=">{'='}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={r.threshold_value ?? ''}
                            onChange={(e) => setRules(rules.map(x => x.id === r.id ? { ...x, threshold_value: parseFloat(e.target.value) } : x))}
                            onBlur={() => updateRule(r.id, { threshold_value: r.threshold_value })}
                            className="h-8"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <Select value={r.severity} onValueChange={(v) => updateRule(r.id, { severity: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SEVERITIES.map(s => <SelectItem key={s.v} value={s.v}>{language === 'bn' ? s.bn : s.en}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs whitespace-nowrap">{t('কুলডাউন', 'Cooldown')}</Label>
                            <Input
                              type="number"
                              value={r.cooldown_minutes}
                              onChange={(e) => setRules(rules.map(x => x.id === r.id ? { ...x, cooldown_minutes: parseInt(e.target.value) || 30 } : x))}
                              onBlur={() => updateRule(r.id, { cooldown_minutes: r.cooldown_minutes })}
                              className="h-8"
                            />
                            <span className="text-xs">m</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(['push', 'sms', 'whatsapp'] as const).map(ch => (
                            <Badge
                              key={ch}
                              variant={r.channels?.[ch] ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => updateRule(r.id, { channels: { ...r.channels, [ch]: !r.channels?.[ch] } })}
                            >
                              {ch}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
