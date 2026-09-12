import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SunDim, Sun, CloudSun, Activity, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLightingSchedule, useUpdateLightingSchedule } from '@/hooks/useFarmData';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

type LDRMode = 'sensor_only' | 'schedule_only' | 'hybrid';

export function LDRSettingsCard() {
  const { language, user } = useAuth();
  const { data: schedule } = useLightingSchedule();
  const updateSchedule = useUpdateLightingSchedule();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(50);
  const [hysteresis, setHysteresis] = useState(20);
  const [mode, setMode] = useState<LDRMode>('hybrid');
  const [daylightOffLux, setDaylightOffLux] = useState(300);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentLux, setCurrentLux] = useState<number | null>(null);
  const [ldrDetected, setLdrDetected] = useState<boolean | null>(null);

  // Sync local state from DB
  useEffect(() => {
    if (!schedule) return;
    setEnabled(Boolean((schedule as any).ldr_enabled));
    setThreshold(Number((schedule as any).ldr_threshold_lux ?? 50));
    setHysteresis(Number((schedule as any).ldr_hysteresis_lux ?? 20));
    setMode(((schedule as any).ldr_mode ?? 'hybrid') as LDRMode);
    setDaylightOffLux(Number((schedule as any).ldr_daylight_off_lux ?? 300));
    setHasChanges(false);
  }, [schedule]);

  // Live lux from latest sensor reading
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchLatest = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('light_lux, recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      const lux = (data as any)?.light_lux;
      if (lux === null || lux === undefined) {
        setCurrentLux(null);
        setLdrDetected(false);
      } else {
        setCurrentLux(Number(lux));
        setLdrDetected(true);
      }
    };

    fetchLatest();
    const channel = supabase
      .channel('ldr-lux-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const lux = (payload.new as any)?.light_lux;
          if (lux !== null && lux !== undefined) {
            setCurrentLux(Number(lux));
            setLdrDetected(true);
          }
        })
      .subscribe();
    const interval = setInterval(fetchLatest, 30000);

    return () => { mounted = false; supabase.removeChannel(channel); clearInterval(interval); };
  }, [user]);

  const handleSave = () => {
    updateSchedule.mutate({
      ldr_enabled: enabled,
      ldr_threshold_lux: threshold,
      ldr_hysteresis_lux: hysteresis,
      ldr_mode: mode,
      ldr_daylight_off_lux: daylightOffLux,
    } as any, {
      onSuccess: () => {
        setHasChanges(false);
        toast({
          title: language === 'bn' ? 'সফল!' : 'Saved',
          description: language === 'bn' ? 'LDR সেটিংস সংরক্ষিত' : 'LDR settings saved',
        });
      },
    });
  };

  const luxLabel = useMemo(() => {
    if (currentLux === null) return language === 'bn' ? 'কোন তথ্য নেই' : 'No data';
    if (currentLux < 10) return language === 'bn' ? 'অন্ধকার 🌑' : 'Dark 🌑';
    if (currentLux < 50) return language === 'bn' ? 'গোধূলি 🌆' : 'Dim 🌆';
    if (currentLux < 200) return language === 'bn' ? 'ভেতরে আলো 💡' : 'Indoor 💡';
    if (currentLux < 1000) return language === 'bn' ? 'দিনের আলো 🌤️' : 'Daylight 🌤️';
    return language === 'bn' ? 'উজ্জ্বল রোদ ☀️' : 'Bright sun ☀️';
  }, [currentLux, language]);

  const lightShouldBeOn = currentLux !== null && currentLux < threshold;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-6 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <SunDim size={20} />
          </div>
          <div>
            <h3 className="font-semibold">
              {language === 'bn' ? '🔆 LDR আলো সেন্সর' : '🔆 LDR Light Sensor'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === 'bn'
                ? 'বাইরের আলো অনুযায়ী স্বয়ংক্রিয় লাইট নিয়ন্ত্রণ'
                : 'Auto light control based on ambient light'}
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => { setEnabled(v); setHasChanges(true); }}
        />
      </div>

      {/* Hardware status */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border bg-muted/40 p-3 text-sm">
        <Activity size={16} className={ldrDetected ? 'text-status-normal' : 'text-muted-foreground'} />
        <span className="flex-1">
          {ldrDetected === null
            ? (language === 'bn' ? 'হার্ডওয়্যার চেক করা হচ্ছে...' : 'Checking hardware...')
            : ldrDetected
              ? (language === 'bn' ? `LDR সংযুক্ত (GPIO 36)` : `LDR connected (GPIO 36)`)
              : (language === 'bn' ? 'LDR সংযুক্ত নয় — ইনস্টলেশন গাইড দেখুন' : 'LDR not connected — see installation guide')}
        </span>
        {ldrDetected && <Badge variant="outline" className="text-xs">GPIO 36</Badge>}
      </div>

      {/* Live lux reading */}
      {ldrDetected && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {language === 'bn' ? 'বর্তমান আলো' : 'Current Light'}
              </p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {currentLux !== null ? Math.round(currentLux) : '—'} <span className="text-sm font-normal text-muted-foreground">lux</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{luxLabel}</p>
            </div>
            <Sun size={48} className="text-amber-400 opacity-60" />
          </div>
          {enabled && currentLux !== null && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {language === 'bn' ? 'লাইট স্ট্যাটাস:' : 'Light should be:'}
              </span>
              <Badge variant={lightShouldBeOn ? 'default' : 'secondary'}>
                {lightShouldBeOn ? '💡 ON' : '🌙 OFF'}
              </Badge>
            </div>
          )}
        </div>
      )}

      {enabled && (
        <>
          {/* Mode selector */}
          <div className="mb-5">
            <p className="mb-2 text-sm font-medium">
              {language === 'bn' ? 'নিয়ন্ত্রণ মোড' : 'Control Mode'}
            </p>
            <Tabs value={mode} onValueChange={(v) => { setMode(v as LDRMode); setHasChanges(true); }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="schedule_only" className="text-xs">
                  {language === 'bn' ? '⏰ শুধু সময়' : '⏰ Time'}
                </TabsTrigger>
                <TabsTrigger value="hybrid" className="text-xs">
                  {language === 'bn' ? '🔄 হাইব্রিড' : '🔄 Hybrid'}
                </TabsTrigger>
                <TabsTrigger value="sensor_only" className="text-xs">
                  {language === 'bn' ? '🔆 শুধু সেন্সর' : '🔆 Sensor'}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="mt-2 text-xs text-muted-foreground">
              {mode === 'schedule_only' && (language === 'bn'
                ? 'শুধু সময়সূচী অনুযায়ী লাইট চলবে। সেন্সর উপেক্ষিত।'
                : 'Lights follow schedule only. Sensor ignored.')}
              {mode === 'hybrid' && (language === 'bn'
                ? 'সময়সূচীর মধ্যে এবং অন্ধকার হলেই লাইট চালু হবে। (সবচেয়ে স্মার্ট)'
                : 'Lights ON only when within schedule AND dark. (Smartest)')}
              {mode === 'sensor_only' && (language === 'bn'
                ? 'অন্ধকার হলেই লাইট জ্বলবে, সময় উপেক্ষিত। সতর্কতা: লেয়ার মুরগির জন্য বিপজ্জনক।'
                : 'Lights ON whenever dark, time ignored. Warning: risky for layers.')}
            </p>
          </div>

          {/* Threshold slider */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CloudSun size={16} className="text-amber-500" />
                {language === 'bn' ? 'অন্ধকারের সীমা' : 'Darkness Threshold'}
              </label>
              <Badge variant="outline">{threshold} lux</Badge>
            </div>
            <Slider
              value={[threshold]}
              onValueChange={(v) => { setThreshold(v[0]); setHasChanges(true); }}
              min={5} max={500} step={5}
              className="py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {language === 'bn'
                ? `এর কম আলো হলে লাইট চালু হবে (বর্তমান: ${currentLux !== null ? Math.round(currentLux) : '?'} lux)`
                : `Light ON when ambient < ${threshold} lux (now: ${currentLux !== null ? Math.round(currentLux) : '?'} lux)`}
            </p>
          </div>

          {/* Hysteresis slider */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">
                {language === 'bn' ? 'সংবেদনশীলতা বাফার' : 'Hysteresis Buffer'}
              </label>
              <Badge variant="outline">±{hysteresis} lux</Badge>
            </div>
            <Slider
              value={[hysteresis]}
              onValueChange={(v) => { setHysteresis(v[0]); setHasChanges(true); }}
              min={5} max={100} step={5}
              className="py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {language === 'bn'
                ? `${threshold + hysteresis} lux-এর বেশি হলেই লাইট বন্ধ হবে (flapping রোধ)`
                : `Lights OFF only above ${threshold + hysteresis} lux (prevents flapping)`}
            </p>
          </div>

          {/* Daylight OFF threshold (power saving) */}
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Sun size={16} className="text-emerald-600" />
                {language === 'bn' ? '☀️ দিনের আলোয় বাতি বন্ধ' : '☀️ Daylight Auto-OFF'}
              </label>
              <Badge variant="outline">{daylightOffLux} lux</Badge>
            </div>
            <Slider
              value={[daylightOffLux]}
              onValueChange={(v) => { setDaylightOffLux(v[0]); setHasChanges(true); }}
              min={150}
              max={1000}
              step={50}
              className="py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {language === 'bn'
                ? `প্রাকৃতিক আলো ${daylightOffLux} lux-এর বেশি হলে কৃত্রিম বাতি বন্ধ থাকবে (বিদ্যুৎ সাশ্রয়)`
                : `When ambient ≥ ${daylightOffLux} lux, artificial lights stay OFF (saves power)`}
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSchedule.isPending}
            className="w-full"
          >
            {updateSchedule.isPending
              ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
              : (language === 'bn' ? 'সেটিংস সংরক্ষণ' : 'Save Settings')}
          </Button>
        </>
      )}

      {!enabled && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 p-4 text-center text-sm text-muted-foreground">
          <Info size={20} className="mx-auto mb-2 opacity-50" />
          {language === 'bn'
            ? 'LDR সেন্সর চালু করতে উপরের সুইচ অন করুন'
            : 'Enable the switch above to activate LDR sensor control'}
        </div>
      )}
    </motion.div>
  );
}
