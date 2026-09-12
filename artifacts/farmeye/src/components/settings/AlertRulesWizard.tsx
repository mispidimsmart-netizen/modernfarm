import { useState } from 'react';
import { Sparkles, Check, ArrowRight, ArrowLeft, Bell, MessageSquare, Phone, Smartphone } from 'lucide-react';
import { useFarmContext } from '@/context/FarmContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Template {
  key: string;
  emoji: string;
  name_bn: string;
  name_en: string;
  desc_bn: string;
  desc_en: string;
  metric: string;
  operator: string;
  threshold_value: number | null;
  severity: 'info' | 'warning' | 'critical';
  channels: { push: boolean; sms: boolean; whatsapp: boolean; in_app: boolean };
  cooldown_minutes: number;
}

const TEMPLATES: Template[] = [
  {
    key: 'heat_warning',
    emoji: '🌡️',
    name_bn: 'গরমের সতর্কতা',
    name_en: 'Heat Warning',
    desc_bn: 'তাপমাত্রা ৩৫°C এর বেশি হলে',
    desc_en: 'When temperature exceeds 35°C',
    metric: 'temperature', operator: '>', threshold_value: 35,
    severity: 'warning',
    channels: { push: true, in_app: true, sms: false, whatsapp: false },
    cooldown_minutes: 30,
  },
  {
    key: 'extreme_heat',
    emoji: '🔥',
    name_bn: 'অত্যধিক গরম (জরুরি)',
    name_en: 'Extreme Heat (Critical)',
    desc_bn: '৩৮°C এর বেশি — পাখির জীবন ঝুঁকিতে',
    desc_en: 'Above 38°C — bird life at risk',
    metric: 'temperature', operator: '>', threshold_value: 38,
    severity: 'critical',
    channels: { push: true, in_app: true, sms: true, whatsapp: true },
    cooldown_minutes: 5,
  },
  {
    key: 'cold_warning',
    emoji: '❄️',
    name_bn: 'ঠান্ডার সতর্কতা',
    name_en: 'Cold Warning',
    desc_bn: 'তাপমাত্রা ১৮°C এর কম হলে',
    desc_en: 'When temperature drops below 18°C',
    metric: 'temperature', operator: '<', threshold_value: 18,
    severity: 'warning',
    channels: { push: true, in_app: true, sms: false, whatsapp: false },
    cooldown_minutes: 30,
  },
  {
    key: 'ammonia_high',
    emoji: '💨',
    name_bn: 'অ্যামোনিয়া বেশি',
    name_en: 'High Ammonia',
    desc_bn: '২৫ ppm এর বেশি — বাতাস দরকার',
    desc_en: 'Above 25 ppm — needs ventilation',
    metric: 'ammonia', operator: '>', threshold_value: 25,
    severity: 'warning',
    channels: { push: true, in_app: true, sms: false, whatsapp: false },
    cooldown_minutes: 20,
  },
  {
    key: 'ammonia_danger',
    emoji: '☠️',
    name_bn: 'অ্যামোনিয়া বিপজ্জনক',
    name_en: 'Dangerous Ammonia',
    desc_bn: '৪০ ppm এর বেশি — দ্রুত পদক্ষেপ',
    desc_en: 'Above 40 ppm — act immediately',
    metric: 'ammonia', operator: '>', threshold_value: 40,
    severity: 'critical',
    channels: { push: true, in_app: true, sms: true, whatsapp: true },
    cooldown_minutes: 5,
  },
  {
    key: 'humidity_high',
    emoji: '💧',
    name_bn: 'আর্দ্রতা বেশি',
    name_en: 'High Humidity',
    desc_bn: '৮০% এর বেশি — ফাঙ্গাস ঝুঁকি',
    desc_en: 'Above 80% — fungal risk',
    metric: 'humidity', operator: '>', threshold_value: 80,
    severity: 'warning',
    channels: { push: true, in_app: true, sms: false, whatsapp: false },
    cooldown_minutes: 60,
  },
  {
    key: 'power_off',
    emoji: '⚡',
    name_bn: 'বিদ্যুৎ বন্ধ',
    name_en: 'Power Outage',
    desc_bn: 'মূল বিদ্যুৎ চলে গেলে',
    desc_en: 'When main power fails',
    metric: 'power_off', operator: '=', threshold_value: null,
    severity: 'critical',
    channels: { push: true, in_app: true, sms: true, whatsapp: true },
    cooldown_minutes: 10,
  },
  {
    key: 'device_offline',
    emoji: '📡',
    name_bn: 'ডিভাইস অফলাইন',
    name_en: 'Device Offline',
    desc_bn: 'কন্ট্রোলার ১০ মিনিট সাড়া দেয় না',
    desc_en: 'Controller silent for 10 minutes',
    metric: 'device_offline', operator: '=', threshold_value: null,
    severity: 'critical',
    channels: { push: true, in_app: true, sms: true, whatsapp: false },
    cooldown_minutes: 15,
  },
  {
    key: 'water_low',
    emoji: '🚰',
    name_bn: 'পানি ব্যবহার কম',
    name_en: 'Low Water Usage',
    desc_bn: '১ L/h এর কম — পাইপ ব্লক?',
    desc_en: 'Below 1 L/h — pipe blocked?',
    metric: 'water_usage', operator: '<', threshold_value: 1,
    severity: 'warning',
    channels: { push: true, in_app: true, sms: false, whatsapp: false },
    cooldown_minutes: 60,
  },
  {
    key: 'hsi_stress',
    emoji: '🐔',
    name_bn: 'HSI চাপ সূচক উচ্চ',
    name_en: 'HSI Stress High',
    desc_bn: '৭৫ এর বেশি — পাখি চাপে',
    desc_en: 'Above 75 — birds stressed',
    metric: 'hsi', operator: '>', threshold_value: 75,
    severity: 'warning',
    channels: { push: true, in_app: true, sms: false, whatsapp: false },
    cooldown_minutes: 30,
  },
];

const METRIC_LABELS: Record<string, { bn: string; en: string; unit: string }> = {
  temperature: { bn: 'তাপমাত্রা', en: 'Temperature', unit: '°C' },
  humidity: { bn: 'আর্দ্রতা', en: 'Humidity', unit: '%' },
  ammonia: { bn: 'অ্যামোনিয়া', en: 'Ammonia', unit: 'ppm' },
  water_usage: { bn: 'পানি ব্যবহার', en: 'Water Usage', unit: 'L/h' },
  hsi: { bn: 'HSI সূচক', en: 'HSI', unit: '' },
  power_off: { bn: 'বিদ্যুৎ বন্ধ', en: 'Power Off', unit: '' },
  device_offline: { bn: 'ডিভাইস অফলাইন', en: 'Device Offline', unit: '' },
};

interface Props {
  onCreated?: () => void;
}

export function AlertRulesWizard({ onCreated }: Props) {
  const { language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const t = (bn: string, en: string) => (language === 'bn' ? bn : en);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [tab, setTab] = useState<'templates' | 'custom'>('templates');

  // Custom wizard state
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Template>({
    key: 'custom',
    emoji: '⚙️',
    name_bn: 'কাস্টম নিয়ম',
    name_en: 'Custom Rule',
    desc_bn: '', desc_en: '',
    metric: 'temperature', operator: '>', threshold_value: 30,
    severity: 'warning',
    channels: { push: true, in_app: true, sms: false, whatsapp: false },
    cooldown_minutes: 30,
  });

  async function addRuleFromTemplate(tpl: Template) {
    if (!selectedFarmId) return;
    setAdding(tpl.key);
    const { error } = await supabase.from('alert_rules').insert({
      farm_id: selectedFarmId,
      name: language === 'bn' ? tpl.name_bn : tpl.name_en,
      metric: tpl.metric,
      operator: tpl.operator,
      threshold_value: tpl.threshold_value,
      severity: tpl.severity,
      channels: tpl.channels as any,
      cooldown_minutes: tpl.cooldown_minutes,
      enabled: true,
    });
    setAdding(null);
    if (error) {
      toast.error(t('যোগ করতে ব্যর্থ', 'Failed to add') + ': ' + error.message);
    } else {
      toast.success(t(`✓ "${tpl.name_bn}" যোগ হয়েছে`, `✓ "${tpl.name_en}" added`));
      onCreated?.();
    }
  }

  function resetCustom() {
    setStep(0);
    setDraft({
      key: 'custom', emoji: '⚙️',
      name_bn: 'কাস্টম নিয়ম', name_en: 'Custom Rule',
      desc_bn: '', desc_en: '',
      metric: 'temperature', operator: '>', threshold_value: 30,
      severity: 'warning',
      channels: { push: true, in_app: true, sms: false, whatsapp: false },
      cooldown_minutes: 30,
    });
  }

  async function saveCustom() {
    await addRuleFromTemplate(draft);
    setOpen(false);
    resetCustom();
  }

  const isBoolMetric = draft.metric === 'power_off' || draft.metric === 'device_offline';

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTab('templates'); resetCustom(); } }}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-1">
          <Sparkles className="h-4 w-4" />
          {t('উইজার্ড', 'Wizard')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('সতর্কতা নিয়ম তৈরি', 'Create Alert Rule')}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setTab('templates')}
            className={cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition',
              tab === 'templates' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
          >
            {t('টেমপ্লেট', 'Templates')}
          </button>
          <button
            onClick={() => setTab('custom')}
            className={cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition',
              tab === 'custom' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
          >
            {t('কাস্টম (ধাপে ধাপে)', 'Custom (Step-by-Step)')}
          </button>
        </div>

        {tab === 'templates' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {TEMPLATES.map((tpl) => (
              <Card key={tpl.key} className="p-3 hover:border-primary transition cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{tpl.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {language === 'bn' ? tpl.name_bn : tpl.name_en}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {language === 'bn' ? tpl.desc_bn : tpl.desc_en}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className={cn('text-[10px] px-1.5 rounded',
                        tpl.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                        tpl.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      )}>
                        {tpl.severity}
                      </span>
                      <span className="text-[10px] text-muted-foreground">• {tpl.cooldown_minutes}m cd</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={adding === tpl.key}
                    onClick={() => addRuleFromTemplate(tpl)}
                    className="shrink-0 h-8"
                  >
                    {adding === tpl.key ? '...' : <><Check className="h-3 w-3 mr-1" /> {t('যোগ', 'Add')}</>}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'custom' && (
          <div className="space-y-4 mt-2">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2, 3].map((s) => (
                <div key={s} className={cn('h-1.5 w-12 rounded-full transition',
                  s <= step ? 'bg-primary' : 'bg-muted')} />
              ))}
            </div>

            {/* Step 0: Pick metric */}
            {step === 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('১. কী পর্যবেক্ষণ করবেন?', '1. What to monitor?')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(METRIC_LABELS).map(([k, m]) => (
                    <button
                      key={k}
                      onClick={() => setDraft({ ...draft, metric: k })}
                      className={cn('rounded-lg border p-3 text-left transition',
                        draft.metric === k ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50')}
                    >
                      <p className="text-sm font-medium">{language === 'bn' ? m.bn : m.en}</p>
                      <p className="text-xs text-muted-foreground">{m.unit || '—'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Threshold */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('২. কখন সতর্কতা?', '2. When to trigger?')}</p>
                {isBoolMetric ? (
                  <p className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
                    {t('এই অবস্থা ঘটলেই সতর্কতা যাবে — কোন থ্রেশহোল্ড দরকার নেই।',
                       'Trigger fires whenever this state occurs — no threshold needed.')}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <Label className="text-xs">{t('তুলনা', 'Operator')}</Label>
                      <Select value={draft.operator} onValueChange={(v) => setDraft({ ...draft, operator: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">{t('এর বেশি (>)', 'Greater than (>)')}</SelectItem>
                          <SelectItem value=">=">≥</SelectItem>
                          <SelectItem value="<">{t('এর কম (<)', 'Less than (<)')}</SelectItem>
                          <SelectItem value="<=">≤</SelectItem>
                          <SelectItem value="=">{t('সমান', 'Equals')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">{t('থ্রেশহোল্ড', 'Threshold')} ({METRIC_LABELS[draft.metric]?.unit})</Label>
                      <Input
                        type="number"
                        value={draft.threshold_value ?? ''}
                        onChange={(e) => setDraft({ ...draft, threshold_value: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Severity + cooldown */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('৩. কতটা জরুরি?', '3. How serious?')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['info', 'warning', 'critical'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setDraft({ ...draft, severity: s })}
                      className={cn('rounded-lg border p-3 text-center transition',
                        draft.severity === s ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50')}
                    >
                      <p className="text-sm font-medium capitalize">{s}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {s === 'info' ? t('তথ্য', 'Info') : s === 'warning' ? t('সতর্কতা', 'Warning') : t('জরুরি', 'Urgent')}
                      </p>
                    </button>
                  ))}
                </div>
                <div>
                  <Label className="text-xs">{t('কুলডাউন (মিনিট)', 'Cooldown (minutes)')}</Label>
                  <Input
                    type="number"
                    value={draft.cooldown_minutes}
                    onChange={(e) => setDraft({ ...draft, cooldown_minutes: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t('একই সতর্কতা পুনরায় পাঠানোর আগে কতক্ষণ অপেক্ষা', 'How long before the same alert repeats')}
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Channels + name */}
            {step === 3 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('৪. কোথায় পাঠাব?', '4. Where to notify?')}</p>
                <div>
                  <Label className="text-xs">{t('নিয়মের নাম', 'Rule name')}</Label>
                  <Input
                    value={language === 'bn' ? draft.name_bn : draft.name_en}
                    onChange={(e) => setDraft({
                      ...draft,
                      [language === 'bn' ? 'name_bn' : 'name_en']: e.target.value,
                    } as any)}
                  />
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  {([
                    ['push', Bell, t('পুশ নোটিফিকেশন', 'Push notification')],
                    ['in_app', Smartphone, t('অ্যাপের ভিতরে', 'In-app')],
                    ['sms', MessageSquare, 'SMS'],
                    ['whatsapp', Phone, 'WhatsApp'],
                  ] as const).map(([ch, Icon, label]) => (
                    <div key={ch} className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-normal">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {label as string}
                      </Label>
                      <Switch
                        checked={draft.channels[ch]}
                        onCheckedChange={(v) => setDraft({ ...draft, channels: { ...draft.channels, [ch]: v } })}
                      />
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                  <p className="font-medium">{t('প্রিভিউ:', 'Preview:')}</p>
                  <p className="text-muted-foreground">
                    {METRIC_LABELS[draft.metric] ? (language === 'bn' ? METRIC_LABELS[draft.metric].bn : METRIC_LABELS[draft.metric].en) : draft.metric}
                    {!isBoolMetric && ` ${draft.operator} ${draft.threshold_value} ${METRIC_LABELS[draft.metric]?.unit ?? ''}`}
                    {' → '}<span className="font-medium uppercase">{draft.severity}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Nav */}
            <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4 mr-1" />{t('পেছনে', 'Back')}
              </Button>
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1)}>
                  {t('পরবর্তী', 'Next')}<ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={saveCustom} disabled={!!adding}>
                  <Check className="h-4 w-4 mr-1" />{t('তৈরি করুন', 'Create')}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
