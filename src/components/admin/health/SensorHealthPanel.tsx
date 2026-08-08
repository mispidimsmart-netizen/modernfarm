import { AlertTriangle, CheckCircle2, Droplets, Gauge, Thermometer, Wind, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import type { HealthLabels } from './labels';
import type { SensorStatus } from './healthUtils';

interface SensorEntry {
  status: SensorStatus | string;
  value: number | null;
  lastReading: string | null;
}

interface Props {
  labels: HealthLabels;
  loading: boolean;
  sensorHealth?: {
    temperature: SensorEntry;
    humidity: SensorEntry;
    ammonia: SensorEntry;
    waterFlow: SensorEntry;
  } | null;
}

function SensorStatusBadge({ status, labels }: { status: string; labels: HealthLabels }) {
  if (status === 'normal') {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {labels.working}
      </Badge>
    );
  }
  if (status === 'out_of_range') {
    return (
      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" />
        {labels.outOfRange}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
      <XCircle className="w-3 h-3 mr-1" />
      {labels.noData}
    </Badge>
  );
}

/** 2x2 grid grading the latest temperature / humidity / ammonia / water readings. */
export function SensorHealthPanel({ labels, loading, sensorHealth }: Props) {
  const rows = [
    {
      key: 'temperature',
      icon: <Thermometer className="w-4 h-4 text-red-400" />,
      label: labels.temperature,
      entry: sensorHealth?.temperature,
      unit: '°C',
    },
    {
      key: 'humidity',
      icon: <Droplets className="w-4 h-4 text-blue-400" />,
      label: labels.humidity,
      entry: sensorHealth?.humidity,
      unit: '%',
    },
    {
      key: 'ammonia',
      icon: <Wind className="w-4 h-4 text-yellow-400" />,
      label: labels.ammonia,
      entry: sensorHealth?.ammonia,
      unit: ' ppm',
    },
    {
      key: 'waterFlow',
      icon: <Droplets className="w-4 h-4 text-cyan-400" />,
      label: labels.waterFlow,
      entry: sensorHealth?.waterFlow,
      unit: ' L',
    },
  ];

  return (
    <div className="p-3 rounded-lg bg-slate-700/30">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-gray-400">{labels.sensorHealth}</span>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 bg-slate-600" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between p-2 rounded bg-slate-600/30">
              <div className="flex items-center gap-2">
                {row.icon}
                <div>
                  <p className="text-xs text-gray-400">{row.label}</p>
                  <p className="text-sm text-white font-medium">
                    {row.entry?.value !== null && row.entry?.value !== undefined
                      ? `${row.entry.value}${row.unit}`
                      : '-'}
                  </p>
                </div>
              </div>
              <SensorStatusBadge status={row.entry?.status || 'no_data'} labels={labels} />
            </div>
          ))}
        </div>
      )}
      {sensorHealth?.temperature?.lastReading && (
        <p className="text-xs text-gray-500 mt-2 text-right">
          {labels.lastReading}:{' '}
          {formatDistanceToNow(new Date(sensorHealth.temperature.lastReading), { addSuffix: true, locale: bn })}
        </p>
      )}
    </div>
  );
}
