import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldCheck, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HardeningSummary {
  firmware_total: number;
  firmware_signed: number;
  firmware_require_signature: number;
  firmware_with_anti_rollback: number;
  gate_blocks_24h: number;
  gate_evaluations_24h: number;
  signature_failures_24h: number;
  rollbacks_24h: number;
  recent_blocks: Array<{
    created_at: string;
    firmware_id: string;
    gate: string;
    reason: string;
    details: unknown;
  }>;
}

function Stat({
  label, value, tone = 'default', icon,
}: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad'; icon?: React.ReactNode }) {
  const cls =
    tone === 'good' ? 'bg-primary/10 text-primary border-primary/20'
    : tone === 'warn' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    : tone === 'bad' ? 'bg-destructive/10 text-destructive border-destructive/20'
    : 'bg-muted text-foreground border-border';
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-xs flex items-center gap-1 opacity-80">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

export function OTAHardeningCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ota-hardening-summary'],
    queryFn: async (): Promise<HardeningSummary> => {
      const { data, error } = await supabase.rpc('ota_hardening_summary');
      if (error) throw error;
      return data as unknown as HardeningSummary;
    },
    refetchInterval: 60_000,
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-muted-foreground">লোড হচ্ছে…</CardContent></Card>;
  if (error || !data) return <Card><CardContent className="p-6 text-sm text-destructive">OTA hardening data পাওয়া যায়নি</CardContent></Card>;

  const signedPct = data.firmware_total
    ? Math.round((data.firmware_signed / data.firmware_total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          OTA Hardening (Phase 5)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="স্বাক্ষরিত ফার্মওয়্যার"
            value={`${signedPct}%`}
            tone={signedPct >= 100 ? 'good' : signedPct >= 80 ? 'warn' : 'bad'}
            icon={<ShieldCheck className="h-3 w-3" />}
          />
          <Stat
            label="Anti-rollback সুরক্ষিত"
            value={data.firmware_with_anti_rollback}
            tone="good"
            icon={<Shield className="h-3 w-3" />}
          />
          <Stat
            label="গেট ব্লক (২৪ঘ)"
            value={data.gate_blocks_24h}
            tone={data.gate_blocks_24h > 0 ? 'warn' : 'good'}
            icon={<ShieldAlert className="h-3 w-3" />}
          />
          <Stat
            label="অটো-রোলব্যাক (২৪ঘ)"
            value={data.rollbacks_24h}
            tone={data.rollbacks_24h > 0 ? 'bad' : 'good'}
            icon={<RotateCcw className="h-3 w-3" />}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          মোট firmware: <strong>{data.firmware_total}</strong> · signature বাধ্যতামূলক: <strong>{data.firmware_require_signature}</strong> ·
          ২৪ঘ gate evaluations: <strong>{data.gate_evaluations_24h}</strong> ·
          signature ফেইল (২৪ঘ): <strong>{data.signature_failures_24h}</strong>
        </div>

        {data.recent_blocks?.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">সাম্প্রতিক ব্লক</div>
            <div className="space-y-1.5">
              {data.recent_blocks.slice(0, 5).map((b, i) => (
                <div key={i} className="flex items-center justify-between text-xs border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="shrink-0">{b.gate}</Badge>
                    <span className="truncate">{b.reason}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {new Date(b.created_at).toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
