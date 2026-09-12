import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
} from 'recharts';
import { Label } from '@/components/ui/label';
import { LineChart as LineChartIcon, BarChart3, Power } from 'lucide-react';
import { SENSOR_META, type SensorKey } from '@/lib/sensorDeviceImpact';
import type { CorrelatedRow, RuntimeRow } from '@/hooks/useSensorDeviceImpact';

interface Props {
  bn: boolean;
  chartData: CorrelatedRow[];
  visibleSensors: SensorKey[];
  runtime: RuntimeRow[];
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};

export function ImpactCharts({ bn, chartData, visibleSensors, runtime }: Props) {
  return (
    <>
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 mb-2">
          <LineChartIcon className="h-4 w-4 text-primary" />
          <Label className="text-xs font-semibold">
            {bn ? 'সেন্সর ট্রেন্ড (সময়ের সাথে)' : 'Sensor trend over time'}
          </Label>
        </div>
        <div className="h-56">
          {visibleSensors.length === 0 || chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              {chartData.length === 0
                ? (bn ? 'এই সময়সীমায় কোনো সেন্সর ডেটা নেই' : 'No sensor data for this range')
                : (bn ? 'কমপক্ষে একটি সেন্সর নির্বাচন করুন' : 'Select at least one sensor')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="timeShort" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {visibleSensors.map((k) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={`${bn ? SENSOR_META[k].bn : SENSOR_META[k].en} (${SENSOR_META[k].unit})`}
                    stroke={SENSOR_META[k].color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <Label className="text-xs font-semibold">
            {bn ? 'ডিভাইস রানটাইম (মিনিট)' : 'Device runtime (minutes)'}
          </Label>
        </div>
        <div className="h-56">
          {runtime.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              {bn ? 'কমপক্ষে একটি ডিভাইস নির্বাচন করুন' : 'Select at least one device'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={runtime} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} ${bn ? 'মিনিট' : 'min'}`, '']} />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                  {runtime.map((r, i) => (
                    <Cell key={i} fill={r.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {runtime.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {runtime.map((r) => (
            <div key={r.device} className="rounded-lg bg-muted/50 p-3 flex items-center gap-2">
              <Power className="h-4 w-4" style={{ color: r.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground capitalize truncate">{r.label}</p>
                <p className="text-sm font-semibold">
                  {r.minutes < 60
                    ? `${r.minutes} ${bn ? 'মিনিট' : 'min'}`
                    : `${(r.minutes / 60).toFixed(1)} ${bn ? 'ঘণ্টা' : 'hr'}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
