import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TYPES = [
  { v: 'all', bn: 'সব ডেটা (সম্পূর্ণ এক্সপোর্ট)', en: 'All data (complete)' },
  { v: 'sensor_readings', bn: 'সেন্সর রিডিং', en: 'Sensor readings' },
  { v: 'egg_production', bn: 'ডিম উৎপাদন', en: 'Egg production' },
  { v: 'feed_consumption', bn: 'খাদ্য খরচ', en: 'Feed consumption' },
  { v: 'alerts', bn: 'সতর্কতা ইতিহাস', en: 'Alert history' },
  { v: 'daily_summary', bn: 'দৈনিক সারাংশ', en: 'Daily summary' },
  { v: 'broiler_batches', bn: 'ব্রয়লার ব্যাচ', en: 'Broiler batches' },
];

const QUICK_RANGES = [
  { id: '7', bn: 'গত ৭ দিন', en: 'Last 7 days' },
  { id: '30', bn: 'গত ৩০ দিন', en: 'Last 30 days' },
  { id: '90', bn: 'গত ৯০ দিন', en: 'Last 90 days' },
  { id: 'custom', bn: 'কাস্টম', en: 'Custom' },
];

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function DataExportCard() {
  const { language } = useAuth();
  const t = (bn: string, en: string) => (language === 'bn' ? bn : en);

  const [type, setType] = useState('all');
  const [range, setRange] = useState('30');
  const [start, setStart] = useState(isoDaysAgo(30));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  function applyRange(r: string) {
    setRange(r);
    if (r === 'custom') return;
    const days = Number(r);
    setStart(isoDaysAgo(days));
    setEnd(new Date().toISOString().slice(0, 10));
  }

  async function exportNow() {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const url = new URL(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/export-data`
      );
      url.searchParams.set('type', type);
      url.searchParams.set('start_date', start);
      url.searchParams.set('end_date', end);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const filename = `farmeye_${type}_${start}_${end}.csv`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success(t('এক্সপোর্ট সম্পন্ন', 'Export complete'));
    } catch (e: any) {
      toast.error(t('এক্সপোর্ট ব্যর্থ', 'Export failed') + ': ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          {t('ডেটা এক্সপোর্ট (CSV)', 'Data Export (CSV)')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">{t('ধরণ', 'Type')}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((x) => (
                <SelectItem key={x.v} value={x.v}>{t(x.bn, x.en)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t('তারিখের পরিসীমা', 'Date range')}</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_RANGES.map((r) => (
              <Button
                key={r.id}
                variant={range === r.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyRange(r.id)}
                className="text-xs h-9 px-1"
              >
                {t(r.bn, r.en)}
              </Button>
            ))}
          </div>
        </div>

        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t('শুরু', 'Start')}</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t('শেষ', 'End')}</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        )}

        <Button className="w-full h-11" onClick={exportNow} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {t('ডাউনলোড করুন', 'Download CSV')}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {t('Excel/Google Sheets-এ খোলা যাবে। বাংলা টেক্সট সঠিকভাবে দেখানোর জন্য UTF-8 BOM সহ।',
            'Opens in Excel/Google Sheets. Includes UTF-8 BOM for Bengali text.')}
        </p>
      </CardContent>
    </Card>
  );
}
