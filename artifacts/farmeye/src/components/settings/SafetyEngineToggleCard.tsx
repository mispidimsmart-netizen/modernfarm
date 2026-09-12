import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings, useUpdateFarmSettings } from '@/hooks/useFarmData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

/**
 * Safety Engine Opt-Out toggle.
 * When OFF: ESP32 disables Arbiter, ESM, HSI auto-trigger, hysteresis emergency bypass.
 * Hard floor (>42°C → fan + alarm forced ON) ALWAYS remains active in firmware.
 */
export function SafetyEngineToggleCard() {
  const { language } = useAuth();
  const { data: settings } = useFarmSettings();
  const updateSettings = useUpdateFarmSettings();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      setEnabled((settings as any).safety_engine_enabled ?? true);
    }
  }, [settings]);

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    try {
      await updateSettings.mutateAsync({ safety_engine_enabled: next } as any);
      toast({
        title: next
          ? (language === 'bn' ? '🛡️ সেফটি ইঞ্জিন চালু' : '🛡️ Safety Engine ON')
          : (language === 'bn' ? '⚠️ সেফটি ইঞ্জিন বন্ধ' : '⚠️ Safety Engine OFF'),
        description: next
          ? (language === 'bn' ? 'সব স্বয়ংক্রিয় সুরক্ষা আবার সক্রিয়' : 'All automatic protections re-enabled')
          : (language === 'bn'
              ? 'শুধু ৪২°C+ এ ফ্যান+অ্যালার্ম কাজ করবে'
              : 'Only 42°C+ hard floor remains active'),
      });
    } catch {
      setEnabled(!next);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'আবার চেষ্টা করুন' : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={enabled ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/40 bg-amber-500/5'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-600" />
          )}
          {language === 'bn' ? 'স্মার্ট সেফটি ইঞ্জিন' : 'Smart Safety Engine'}
          <Badge variant={enabled ? 'default' : 'secondary'} className="ml-auto">
            {enabled
              ? (language === 'bn' ? 'চালু' : 'ON')
              : (language === 'bn' ? 'বন্ধ' : 'OFF')}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {language === 'bn'
            ? 'অটোমেটিক ফ্যান/হিটার/অ্যালার্ম, HSI সুরক্ষা, সেন্সর স্পাইক ফিল্টার'
            : 'Auto fan/heater/alarm, HSI protection, sensor spike filter'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-background p-3">
          <div className="flex-1">
            <p className="text-sm font-medium">
              {language === 'bn' ? 'সেফটি ইঞ্জিন সক্রিয়' : 'Safety Engine Active'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled
                ? (language === 'bn'
                    ? 'ESP32 স্বয়ংক্রিয় সুরক্ষা চালাচ্ছে'
                    : 'ESP32 is running automatic protections')
                : (language === 'bn'
                    ? 'শুধু ম্যানুয়াল কন্ট্রোল ও schedule কাজ করছে'
                    : 'Only manual control and schedule are active')}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={updateSettings.isPending} />
        </div>

        {/* Hard floor guarantee — always shown */}
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-red-700 dark:text-red-400">
              {language === 'bn' ? '🔥 হার্ড ফ্লোর সর্বদা সক্রিয়' : '🔥 Hard Floor Always Active'}
            </p>
            <p className="text-muted-foreground mt-1">
              {language === 'bn'
                ? 'সেফটি ইঞ্জিন বন্ধ থাকলেও, তাপমাত্রা ৪২°C ছাড়ালে ফ্যান+অ্যালার্ম স্বয়ংক্রিয় চালু হবে — পাখি বাঁচানোর জন্য।'
                : 'Even with safety engine OFF, fan + alarm will auto-trigger when temperature exceeds 42°C — to protect livestock.'}
            </p>
          </div>
        </div>

        {!enabled && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
            <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
              {language === 'bn' ? '⚠️ যা বন্ধ থাকবে:' : '⚠️ What is disabled:'}
            </p>
            <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
              <li>{language === 'bn' ? 'HSI ভিত্তিক স্বয়ংক্রিয় ফ্যান' : 'HSI-based automatic fan'}</li>
              <li>{language === 'bn' ? 'সেন্সর স্পাইক ফিল্টার (SVL)' : 'Sensor spike filter (SVL)'}</li>
              <li>{language === 'bn' ? 'Emergency Survival Mode (ESM)' : 'Emergency Survival Mode (ESM)'}</li>
              <li>{language === 'bn' ? 'হিটার-ভেন্ট ইন্টারলক' : 'Heater-vent interlock'}</li>
              <li>{language === 'bn' ? 'হিস্টেরেসিস emergency bypass' : 'Hysteresis emergency bypass'}</li>
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          {language === 'bn'
            ? 'পরিবর্তন ১ মিনিটের মধ্যে ESP32 তে পৌঁছে যাবে।'
            : 'Change reaches ESP32 within 1 minute.'}
        </p>
      </CardContent>
    </Card>
  );
}
