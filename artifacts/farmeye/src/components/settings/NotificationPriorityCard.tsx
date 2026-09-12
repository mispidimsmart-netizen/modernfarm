import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  useEscalationConfig,
  useUpdateEscalationConfig,
  useDeliveryLog,
  useEscalationTracker,
  PRIORITY_LABELS,
  type NotificationPriority,
} from '@/hooks/useNotificationPriority';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Bell, Shield, Phone, ChevronDown, ChevronUp,
  AlertTriangle, MessageSquare, Webhook, Volume2,
  Repeat, UserPlus, History, CheckCircle2, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const priorityOrder: NotificationPriority[] = ['normal', 'important', 'urgent', 'critical'];

const channelIcons = {
  push: Bell,
  sms: MessageSquare,
  webhook: Webhook,
  sound: Volume2,
};

export function NotificationPriorityCard() {
  const { language } = useAuth();
  const { data: config, isLoading } = useEscalationConfig();
  const { data: tracker } = useEscalationTracker();
  const { data: deliveryLogs } = useDeliveryLog(15);
  const updateConfig = useUpdateEscalationConfig();

  const [showChannels, setShowChannels] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [secondaryPhone, setSecondaryPhone] = useState(config?.secondary_phone || '');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const handleSaveSecondary = () => {
    if (secondaryPhone.trim()) {
      updateConfig.mutate({
        secondary_phone: secondaryPhone.trim(),
        escalation_enabled: true,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-primary" />
          {language === 'bn' ? 'নোটিফিকেশন অগ্রাধিকার ও এস্কেলেশন' : 'Notification Priority & Escalation'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Priority Level Overview */}
        <div className="grid grid-cols-2 gap-2">
          {priorityOrder.map((p) => {
            const label = PRIORITY_LABELS[p];
            const channels: string[] = [];
            if (config?.[`${p}_push` as keyof typeof config]) channels.push('Push');
            else if (p === 'normal' || p === 'important') channels.push('Push');
            if (config?.[`${p}_sms` as keyof typeof config]) channels.push('SMS');
            else if (p === 'urgent' || p === 'critical') channels.push('SMS');
            if (p === 'critical') channels.push('Webhook');

            return (
              <div
                key={p}
                className={cn(
                  'rounded-lg border p-3 text-center',
                  p === 'critical' && 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
                  p === 'urgent' && 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30',
                  p === 'important' && 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
                  p === 'normal' && 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
                )}
              >
                <span className="text-lg">{label.icon}</span>
                <p className={cn('text-sm font-semibold', label.color)}>
                  {label[language]}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {channels.join(' + ')}
                </p>
                {(p === 'urgent' || p === 'critical') && (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    <Repeat className="mr-1 h-2.5 w-2.5" />
                    {p === 'critical' ? '2' : '5'}{language === 'bn' ? ' মিনিট' : ' min'}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Escalation Warning */}
        {tracker?.is_escalated && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500 bg-red-50 p-3 dark:bg-red-950/30">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {language === 'bn' ? '⚠️ এস্কেলেশন সক্রিয়!' : '⚠️ Escalation Active!'}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {language === 'bn'
                  ? `${tracker.ignored_critical_count}টি ক্রিটিকাল অ্যালার্ট উপেক্ষিত — সেকেন্ডারি নম্বরে পাঠানো হচ্ছে`
                  : `${tracker.ignored_critical_count} critical alerts ignored — notifying secondary contact`}
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Channel Configuration */}
        <Collapsible open={showChannels} onOpenChange={setShowChannels}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between p-0">
              <span className="text-sm font-medium">
                {language === 'bn' ? 'চ্যানেল কনফিগারেশন' : 'Channel Configuration'}
              </span>
              {showChannels ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="space-y-3">
              {priorityOrder.map((p) => {
                const label = PRIORITY_LABELS[p];
                return (
                  <div key={p} className="rounded-lg border p-3">
                    <p className={cn('mb-2 text-sm font-semibold', label.color)}>
                      {label.icon} {label[language]}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['push', 'sms', 'sound'] as const).map((ch) => {
                        const key = `${p}_${ch}` as keyof typeof config;
                        const Icon = channelIcons[ch];
                        const isEnabled = config ? (config[key] as boolean) ?? (ch === 'push') : (ch === 'push');
                        return (
                          <div key={ch} className="flex items-center justify-between rounded bg-muted/30 p-2">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5" />
                              <span className="text-xs capitalize">{ch}</span>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(val) => updateConfig.mutate({ [key]: val } as any)}
                            />
                          </div>
                        );
                      })}
                      {p === 'critical' && (
                        <div className="flex items-center justify-between rounded bg-muted/30 p-2">
                          <div className="flex items-center gap-1.5">
                            <Webhook className="h-3.5 w-3.5" />
                            <span className="text-xs">Webhook</span>
                          </div>
                          <Switch
                            checked={config?.critical_webhook ?? true}
                            onCheckedChange={(val) => updateConfig.mutate({ critical_webhook: val })}
                          />
                        </div>
                      )}
                    </div>
                    {(p === 'urgent' || p === 'critical') && (
                      <div className="mt-2 flex items-center gap-2">
                        <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {language === 'bn' ? 'পুনরাবৃত্তি:' : 'Repeat:'}
                        </span>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={p === 'critical' ? (config?.critical_repeat_minutes ?? 2) : (config?.urgent_repeat_minutes ?? 5)}
                          onChange={(e) => {
                            const key = p === 'critical' ? 'critical_repeat_minutes' : 'urgent_repeat_minutes';
                            updateConfig.mutate({ [key]: parseInt(e.target.value) || 2 } as any);
                          }}
                          className="h-7 w-16 text-center text-xs"
                        />
                        <span className="text-xs text-muted-foreground">
                          {language === 'bn' ? 'মিনিট' : 'min'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Escalation Settings */}
        <Collapsible open={showEscalation} onOpenChange={setShowEscalation}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between p-0">
              <span className="flex items-center gap-2 text-sm font-medium">
                <UserPlus className="h-4 w-4" />
                {language === 'bn' ? 'এস্কেলেশন সেটিংস' : 'Escalation Settings'}
              </span>
              {showEscalation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {language === 'bn' ? 'এস্কেলেশন চালু' : 'Enable Escalation'}
              </Label>
              <Switch
                checked={config?.escalation_enabled ?? true}
                onCheckedChange={(val) => updateConfig.mutate({ escalation_enabled: val })}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                {language === 'bn' ? 'সেকেন্ডারি ফোন নম্বর' : 'Secondary Phone Number'}
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="01XXXXXXXXX"
                  value={secondaryPhone || config?.secondary_phone || ''}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSaveSecondary} disabled={updateConfig.isPending}>
                  {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'bn'
                  ? `${config?.ignored_critical_threshold || 3}টি ক্রিটিকাল অ্যালার্ট উপেক্ষা করলে এই নম্বরে SMS যাবে`
                  : `SMS sent to this number after ${config?.ignored_critical_threshold || 3} ignored critical alerts`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs">
                {language === 'bn' ? 'উপেক্ষা সীমা:' : 'Ignore threshold:'}
              </Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={config?.ignored_critical_threshold ?? 3}
                onChange={(e) => updateConfig.mutate({ ignored_critical_threshold: parseInt(e.target.value) || 3 })}
                className="h-7 w-16 text-center text-xs"
              />
              <span className="text-xs text-muted-foreground">
                {language === 'bn' ? 'টি ক্রিটিকাল' : 'critical alerts'}
              </span>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Delivery Log */}
        <Collapsible open={showLogs} onOpenChange={setShowLogs}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between p-0">
              <span className="flex items-center gap-2 text-sm font-medium">
                <History className="h-4 w-4" />
                {language === 'bn' ? 'ডেলিভারি লগ' : 'Delivery Log'}
              </span>
              {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {deliveryLogs && deliveryLogs.length > 0 ? (
                deliveryLogs.map((log) => {
                  const pLabel = PRIORITY_LABELS[log.priority as NotificationPriority];
                  return (
                    <div
                      key={log.id}
                      className="flex items-start justify-between rounded-lg bg-muted/30 p-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {log.status === 'sent' || log.status === 'delivered' ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {pLabel?.icon} {log.channel}
                          </Badge>
                          {log.is_escalated && (
                            <Badge variant="destructive" className="text-[10px]">
                              {language === 'bn' ? 'এস্কেলেটেড' : 'Escalated'}
                            </Badge>
                          )}
                          {log.repeat_count > 0 && (
                            <span className="text-muted-foreground">×{log.repeat_count + 1}</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-muted-foreground">{log.title}</p>
                      </div>
                      <span className="ml-2 whitespace-nowrap text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM HH:mm', {
                          locale: language === 'bn' ? bn : undefined,
                        })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  {language === 'bn' ? 'কোনো লগ নেই' : 'No delivery logs yet'}
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Info Box */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <h4 className="mb-1 text-xs font-medium">
            {language === 'bn' ? '📋 কিভাবে কাজ করে' : '📋 How it works'}
          </h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              {language === 'bn'
                ? '🔴 Critical: পুশ + SMS + ওয়েবহুক, প্রতি ২ মিনিটে পুনরাবৃত্তি'
                : '🔴 Critical: Push + SMS + Webhook, repeats every 2 min'}
            </li>
            <li>
              {language === 'bn'
                ? '🟠 Urgent: পুশ + SMS, প্রতি ৫ মিনিটে পুনরাবৃত্তি'
                : '🟠 Urgent: Push + SMS, repeats every 5 min'}
            </li>
            <li>
              {language === 'bn'
                ? '⚠️ ৩টি ক্রিটিকাল উপেক্ষা → সেকেন্ডারি নম্বরে SMS'
                : '⚠️ 3 ignored critical → SMS to secondary number'}
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
