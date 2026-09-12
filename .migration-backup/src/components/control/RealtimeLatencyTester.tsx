import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Gauge, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useSelectedShed } from '@/hooks/useSheds';

type Phase = 'idle' | 'sending' | 'awaiting-ack' | 'done' | 'timeout';

interface Measurement {
  total: number;          // press → ESP32 ack
  insertMs: number;       // press → command row inserted
  ackMs: number;          // insert → device_status update
  at: Date;
}

const TIMEOUT_MS = 10000;

export function RealtimeLatencyTester() {
  const { user, language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { selectedShedId } = useSelectedShed();

  const [phase, setPhase] = useState<Phase>('idle');
  const [current, setCurrent] = useState<Partial<Measurement> | null>(null);
  const [history, setHistory] = useState<Measurement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const tStartRef = useRef<number>(0);
  const tInsertRef = useRef<number>(0);
  const targetValueRef = useRef<boolean>(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = (bn: string, en: string) => (language === 'bn' ? bn : en);

  // Subscribe to device_status updates for the selected shed
  useEffect(() => {
    if (!user || !selectedShedId) return;

    const channel = supabase
      .channel(`latency-test-${selectedShedId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_status',
          filter: `shed_id=eq.${selectedShedId}`,
        },
        (payload) => {
          if (phase !== 'awaiting-ack') return;
          const newRow = payload.new as { alarm_on?: boolean; last_device_ack_at?: string | null };
          if (newRow.alarm_on === targetValueRef.current) {
            const now = performance.now();
            const total = Math.round(now - tStartRef.current);
            const ackMs = Math.round(now - tInsertRef.current);
            const insertMs = Math.round(tInsertRef.current - tStartRef.current);
            const measurement: Measurement = { total, insertMs, ackMs, at: new Date() };
            setCurrent(measurement);
            setHistory((h) => [measurement, ...h].slice(0, 5));
            setPhase('done');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, selectedShedId, phase]);

  const runTest = async () => {
    if (!user || !selectedShedId || !selectedFarmId) {
      setError(t('শেড নির্বাচন করুন', 'Select a shed first'));
      return;
    }
    setError(null);
    setCurrent(null);

    // Read current alarm_on, then toggle to opposite
    const { data: status } = await supabase
      .from('device_status')
      .select('alarm_on')
      .eq('shed_id', selectedShedId)
      .maybeSingle();
    const target = !(status?.alarm_on ?? false);
    targetValueRef.current = target;

    setPhase('sending');
    tStartRef.current = performance.now();

    const { error: insertErr } = await supabase.from('device_commands').insert({
      user_id: user.id,
      farm_id: selectedFarmId,
      device_name: 'Latency Test',
      command_type: 'alarm',
      command_value: target,
      executed: false,
    });

    if (insertErr) {
      setError(insertErr.message);
      setPhase('idle');
      return;
    }

    tInsertRef.current = performance.now();
    setCurrent({ insertMs: Math.round(tInsertRef.current - tStartRef.current) });
    setPhase('awaiting-ack');

    timeoutRef.current = setTimeout(() => {
      setPhase((p) => (p === 'awaiting-ack' ? 'timeout' : p));
    }, TIMEOUT_MS);
  };

  const avg =
    history.length > 0 ? Math.round(history.reduce((s, m) => s + m.total, 0) / history.length) : null;

  const tier = (ms: number) => {
    if (ms < 1500) return { label: t('চমৎকার', 'Excellent'), cls: 'bg-success/15 text-success border-success/30' };
    if (ms < 3000) return { label: t('ভালো', 'Good'), cls: 'bg-primary/15 text-primary border-primary/30' };
    if (ms < 6000) return { label: t('মাঝারি', 'Fair'), cls: 'bg-warning/15 text-warning border-warning/30' };
    return { label: t('ধীর', 'Slow'), cls: 'bg-destructive/15 text-destructive border-destructive/30' };
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">
              {t('রিয়েলটাইম লেটেন্সি টেস্টার', 'Realtime Latency Tester')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(
                'বাটন প্রেস → ডিভাইস স্টেট পরিবর্তন পর্যন্ত মোট সময় পরিমাপ',
                'Measures press → device state change round-trip'
              )}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={runTest}
          disabled={phase === 'sending' || phase === 'awaiting-ack'}
        >
          {phase === 'sending' || phase === 'awaiting-ack' ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              {t('পরীক্ষা চলছে…', 'Testing…')}
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 mr-1" />
              {t('টেস্ট চালান', 'Run Test')}
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {phase === 'awaiting-ack' && (
        <div className="text-xs text-muted-foreground">
          {t('ডিভাইসের প্রতিক্রিয়ার অপেক্ষা…', 'Waiting for device acknowledgement…')}
        </div>
      )}

      {phase === 'timeout' && (
        <div className="text-xs text-destructive">
          {t(
            '⏱ ১০ সেকেন্ডের মধ্যে কোন প্রতিক্রিয়া নেই — ESP32 অফলাইন হতে পারে',
            '⏱ No response within 10s — ESP32 may be offline'
          )}
        </div>
      )}

      {(phase === 'done' || phase === 'awaiting-ack') && current && (
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label={t('ক্লাউড পৌঁছাতে', 'To cloud')}
            value={current.insertMs != null ? `${current.insertMs} ms` : '…'}
          />
          <Stat
            label={t('ESP32 প্রতিক্রিয়া', 'ESP32 ack')}
            value={current.ackMs != null ? `${current.ackMs} ms` : '…'}
          />
          <Stat
            label={t('মোট', 'Total')}
            value={current.total != null ? `${current.total} ms` : '…'}
            highlight={current.total != null}
          />
        </div>
      )}

      {phase === 'done' && current?.total != null && (
        <Badge variant="outline" className={tier(current.total).cls}>
          {tier(current.total).label}
        </Badge>
      )}

      {history.length > 0 && (
        <div className="border-t pt-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('শেষ ৫টি টেস্ট', 'Last 5 tests')}</span>
            {avg != null && (
              <span>
                {t('গড়', 'Avg')}: <span className="font-semibold text-foreground">{avg} ms</span>
              </span>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {history.map((m, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded border ${tier(m.total).cls}`}
              >
                {m.total} ms
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${highlight ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}
