import { useEffect, useState } from 'react';
import { Phone, Plus, Trash2, Signal } from 'lucide-react';
import { useFarmContext } from '@/context/FarmContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function GsmFallbackCard() {
  const { selectedFarmId } = useFarmContext();
  const { language } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [phones, setPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [dailyLimit, setDailyLimit] = useState(20);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedFarmId) return;
    (async () => {
      const { data } = await supabase
        .from('farm_settings')
        .select('gsm_enabled, authorized_phones, gsm_daily_sms_limit')
        .eq('farm_id', selectedFarmId)
        .maybeSingle();
      if (data) {
        setEnabled(!!data.gsm_enabled);
        setPhones(Array.isArray(data.authorized_phones) ? (data.authorized_phones as string[]) : []);
        setDailyLimit(data.gsm_daily_sms_limit ?? 20);
      }
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('gsm_outbound_sms')
        .select('id', { count: 'exact', head: true })
        .eq('farm_id', selectedFarmId)
        .gte('created_at', since.toISOString());
      setTodayCount(count ?? 0);
    })();
  }, [selectedFarmId]);

  const save = async (next: { enabled?: boolean; phones?: string[]; limit?: number }) => {
    if (!selectedFarmId) return;
    setLoading(true);
    const payload: any = {};
    if (next.enabled !== undefined) payload.gsm_enabled = next.enabled;
    if (next.phones !== undefined) payload.authorized_phones = next.phones;
    if (next.limit !== undefined) payload.gsm_daily_sms_limit = next.limit;
    const { error } = await supabase.from('farm_settings').update(payload).eq('farm_id', selectedFarmId);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(language === 'bn' ? 'সংরক্ষিত' : 'Saved');
  };

  const addPhone = () => {
    const p = newPhone.trim();
    if (!/^\+8801\d{9}$/.test(p)) {
      return toast.error(language === 'bn' ? 'বৈধ BD নম্বর দিন (+8801XXXXXXXXX)' : 'Enter valid BD number');
    }
    if (phones.length >= 3) return toast.error(language === 'bn' ? 'সর্বোচ্চ ৩ টি' : 'Max 3 numbers');
    if (phones.includes(p)) return toast.error(language === 'bn' ? 'ইতিমধ্যে আছে' : 'Already added');
    const next = [...phones, p];
    setPhones(next);
    setNewPhone('');
    save({ phones: next });
  };

  const removePhone = (p: string) => {
    const next = phones.filter(x => x !== p);
    setPhones(next);
    save({ phones: next });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Signal className="w-4 h-4 text-primary" />
          {language === 'bn' ? 'GSM ফলব্যাক (ইন্টারনেট গেলে SMS)' : 'GSM Fallback'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {language === 'bn'
            ? 'ইন্টারনেট না থাকলে ESP32 SIM800L/A7670 মডিউল দিয়ে SMS দিয়ে জরুরি বার্তা পাঠাবে এবং authorized নম্বর থেকে কমান্ড নেবে।'
            : 'When internet is down, ESP32 will send critical SMS via SIM800L/A7670 and accept commands from authorized numbers.'}
        </p>

        <div className="flex items-center justify-between">
          <Label htmlFor="gsm-enabled">{language === 'bn' ? 'GSM চালু' : 'Enable GSM'}</Label>
          <Switch
            id="gsm-enabled"
            checked={enabled}
            disabled={loading}
            onCheckedChange={(v) => { setEnabled(v); save({ enabled: v }); }}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">
                {language === 'bn' ? 'অনুমোদিত নম্বর (সর্বোচ্চ ৩, BD ফরম্যাট)' : 'Authorized phones (max 3, BD format)'}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="+8801XXXXXXXXX"
                  className="flex-1"
                />
                <Button size="sm" onClick={addPhone}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {phones.map(p => (
                <div key={p} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-mono flex items-center gap-2">
                    <Phone className="w-3 h-3" />{p}
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => removePhone(p)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                {language === 'bn' ? 'দৈনিক SMS সীমা' : 'Daily SMS limit'}
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={dailyLimit}
                onChange={e => setDailyLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
                onBlur={() => save({ limit: dailyLimit })}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {language === 'bn' ? 'আজ ব্যবহৃত:' : 'Used today:'}
                </span>
                <Badge variant={todayCount >= dailyLimit ? 'destructive' : 'secondary'}>
                  {todayCount} / {dailyLimit}
                </Badge>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <div className="font-semibold">
                {language === 'bn' ? 'সমর্থিত SMS কমান্ড:' : 'Supported SMS commands:'}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground space-y-0.5">
                <div>STATUS — {language === 'bn' ? 'বর্তমান অবস্থা' : 'current state'}</div>
                <div>FAN ON 30 — {language === 'bn' ? 'ফ্যান ৩০ মিনিট চালু' : 'fan on 30 min'}</div>
                <div>EMERGENCY — {language === 'bn' ? 'জরুরি মোড' : 'emergency mode'}</div>
                <div>RESTART — {language === 'bn' ? 'রিস্টার্ট' : 'restart'}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
