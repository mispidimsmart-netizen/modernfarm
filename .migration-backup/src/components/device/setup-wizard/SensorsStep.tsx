import { Radar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { HwVersion, SensorOption } from './wizardConstants';

interface Props {
  version: HwVersion;
  sensorList: SensorOption[];
  selectedSensors: string[];
  toggleSensor: (id: string) => void;
  canNext: boolean;
}

export function SensorsStep({ version, sensorList, selectedSensors, toggleSensor, canNext }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Radar className="h-4 w-4 text-primary" />
          সেন্সর কনফিগারেশন
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          আপনি যে সেন্সরগুলো ইনস্টল করেছেন সেগুলো টিক দিন। ফার্মওয়্যার boot-এ এগুলো auto-detect করবে।
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sensorList.map((s) => {
          const checked = selectedSensors.includes(s.id);
          return (
            <label
              key={s.id}
              className={`flex items-start gap-2 cursor-pointer rounded-lg border p-2 transition ${
                checked ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleSensor(s.id)}
                disabled={s.required}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium">{s.name}</span>
                  <Badge
                    variant={s.required ? 'default' : s.recommended ? 'secondary' : 'outline'}
                    className="text-[9px] px-1.5 py-0"
                  >
                    {s.tier}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.pin}</p>
                {s.note && <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">{s.note}</p>}
              </div>
            </label>
          );
        })}

        {!canNext && (
          <div className="border border-destructive/40 bg-destructive/5 rounded-lg p-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[11px]">
              কমপক্ষে একটি temperature+humidity সেন্সর ({version === 'v10' ? 'SHT31 বা DHT22' : 'DHT22'}) নির্বাচন করুন।
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
