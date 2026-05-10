import { Wind, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBestSensorReading } from '@/hooks/useAirQuality';
import { cn } from '@/lib/utils';

interface Props {
  shedId?: string | null;
}

/**
 * Phase 9 — Air Quality Card. Shows CO₂, PM2.5, PM10 if Tier 3 sensors
 * (SCD41 / PMS5003) are present. Hides gracefully if only legacy sensors.
 */
export function AirQualityCard({ shedId }: Props) {
  const { data, isLoading } = useBestSensorReading(shedId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasAirQuality = data?.co2 != null || data?.pm25 != null || data?.pm10 != null;
  if (!hasAirQuality) return null;

  const co2Status = (data?.co2 ?? 0) > 5000 ? 'danger' : (data?.co2 ?? 0) > 3000 ? 'warning' : 'ok';
  const pm25Status = (data?.pm25 ?? 0) > 150 ? 'danger' : (data?.pm25 ?? 0) > 75 ? 'warning' : 'ok';
  const pm10Status = (data?.pm10 ?? 0) > 250 ? 'danger' : (data?.pm10 ?? 0) > 150 ? 'warning' : 'ok';

  const statusClass = (s: 'ok' | 'warning' | 'danger') =>
    s === 'danger' ? 'text-destructive' : s === 'warning' ? 'text-amber-500' : 'text-primary';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wind className="text-primary" size={18} />
          বায়ুর গুণমান
          <Badge variant="secondary" className="ml-auto text-[10px]">Phase 9</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.co2 != null && (
          <Metric
            label="CO₂"
            value={data.co2.toLocaleString('bn-BD')}
            unit="ppm"
            status={co2Status}
            statusClass={statusClass}
            hint={co2Status === 'danger' ? 'ভেন্টিলেশন বাড়ান' : co2Status === 'warning' ? 'নজর রাখুন' : 'স্বাভাবিক'}
          />
        )}
        {data?.pm25 != null && (
          <Metric
            label="PM2.5 (ধুলা)"
            value={data.pm25.toFixed(1)}
            unit="µg/m³"
            status={pm25Status}
            statusClass={statusClass}
            hint={pm25Status === 'danger' ? 'বিপজ্জনক' : pm25Status === 'warning' ? 'মাঝারি' : 'ভালো'}
          />
        )}
        {data?.pm10 != null && (
          <Metric
            label="PM10"
            value={data.pm10.toFixed(1)}
            unit="µg/m³"
            status={pm10Status}
            statusClass={statusClass}
            hint={pm10Status === 'ok' ? 'স্বাভাবিক' : 'বেড়েছে'}
          />
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label, value, unit, status, statusClass, hint,
}: {
  label: string; value: string; unit: string;
  status: 'ok' | 'warning' | 'danger';
  statusClass: (s: 'ok' | 'warning' | 'danger') => string;
  hint: string;
}) {
  const Icon = status === 'ok' ? CheckCircle2 : AlertTriangle;
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className={cn('text-xs', statusClass(status))}>{hint}</p>
      </div>
      <div className="text-right flex items-center gap-2">
        <Icon size={16} className={statusClass(status)} />
        <div>
          <p className={cn('text-lg font-bold', statusClass(status))}>{value}</p>
          <p className="text-[10px] text-muted-foreground">{unit}</p>
        </div>
      </div>
    </div>
  );
}
