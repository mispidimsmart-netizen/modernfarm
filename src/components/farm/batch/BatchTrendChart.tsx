import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useLayerBatchTrend, type LayerBatch } from '@/hooks/useLayerBatch';

export function BatchTrendChart({
  batch,
  language,
}: {
  batch: LayerBatch;
  language: 'bn' | 'en';
}) {
  const { data: trend = [], isLoading } = useLayerBatchTrend(batch);

  const t = {
    title: { bn: 'দৈনিক ট্রেন্ড', en: 'Daily Trend' },
    eggs: { bn: 'ডিম', en: 'Eggs' },
    mortality: { bn: 'মৃত্যু', en: 'Mortality' },
    noData: { bn: 'এই ব্যাচে কোনো দৈনিক রেকর্ড নেই', en: 'No daily records for this batch' },
  };

  if (isLoading) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-lg border bg-card">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (trend.length === 0) {
    return (
      <div className="flex h-[80px] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-3 text-center text-xs text-muted-foreground">
        {t.noData[language]}
      </div>
    );
  }

  const chartData = trend.map((p) => ({
    ...p,
    label: new Date(p.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          {t.title[language]}
        </span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {t.eggs[language]}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            {t.mortality[language]}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 9, fill: 'hsl(var(--destructive))' }}
            tickLine={false}
            axisLine={false}
            width={20}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="eggs"
            name={t.eggs[language]}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
          <Bar
            yAxisId="right"
            dataKey="mortality"
            name={t.mortality[language]}
            fill="hsl(var(--destructive))"
            radius={[2, 2, 0, 0]}
            barSize={6}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
