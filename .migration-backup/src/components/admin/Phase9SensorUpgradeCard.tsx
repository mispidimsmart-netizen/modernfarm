import { Cpu, Sparkles, CheckCircle2, Circle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSensorUpgradeSummary, useDeviceSensorInventory } from '@/hooks/useAirQuality';

const TIERS = [
  { key: 'tier1', label: 'Tier 1 (SHT31 + BH1750)', desc: 'Accuracy upgrade' },
  { key: 'tier2', label: 'Tier 2 (+ ZE03-NH3)', desc: 'True ammonia ppm' },
  { key: 'tier3', label: 'Tier 3 (+ SCD41 + PMS5003)', desc: 'Commercial farm' },
] as const;

export function Phase9SensorUpgradeCard() {
  const { data: summary, isLoading } = useSensorUpgradeSummary();
  const { data: inventory } = useDeviceSensorInventory();

  if (isLoading || !summary) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Phase 9 — Sensor Upgrade
          </span>
          <Badge variant="secondary">{summary.total_devices} ডিভাইস</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <SensorBadge name="SHT31" count={summary.sht31_count} />
          <SensorBadge name="BH1750" count={summary.bh1750_count} />
          <SensorBadge name="ZE03-NH3" count={summary.ze03_count} />
          <SensorBadge name="SCD41" count={summary.scd41_count} />
          <SensorBadge name="PMS5003" count={summary.pms5003_count} />
        </div>

        <div className="border-t pt-3 space-y-1.5">
          {TIERS.map((t) => {
            const count = summary[`${t.key}_devices` as const];
            const done = count > 0;
            return (
              <div key={t.key} className="flex items-center gap-2 text-sm">
                {done ? (
                  <CheckCircle2 size={14} className="text-primary shrink-0" />
                ) : (
                  <Circle size={14} className="text-muted-foreground shrink-0" />
                )}
                <span className={done ? '' : 'text-muted-foreground'}>{t.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>

        {inventory && inventory.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Cpu size={12} /> Active inventory
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {inventory.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground truncate max-w-[60%]">
                    {s.device_id.slice(0, 16)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{s.sensor_model}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.total_devices === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            কোনো নতুন সেন্সর এখনো রিপোর্ট করেনি। ESP32 firmware boot হলে অটো-ডিটেক্ট হবে।
          </p>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/phase9-report">
            <FileText className="h-4 w-4 mr-1" /> টেস্ট রিপোর্ট দেখুন
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SensorBadge({ name, count }: { name: string; count: number }) {
  return (
    <div className={`rounded-md border px-2 py-1.5 ${count > 0 ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <p className="font-medium">{name}</p>
      <p className={`text-[10px] ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
        {count > 0 ? `${count} active` : 'inactive'}
      </p>
    </div>
  );
}
