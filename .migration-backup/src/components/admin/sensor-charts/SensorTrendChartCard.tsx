import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { HourlyData } from '@/data/adminSensorChartLabels';

interface Props {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  data: HourlyData[];
  dataKey: 'avgTemp' | 'avgHumidity' | 'avgAmmonia';
  color: string;
  gradientId: string;
  unit: string;
  domain: [any, any];
  chartConfig: Record<string, { label: string; color: string }>;
  cardClass: string;
  iconWrapClass: string;
  titleClass: string;
  subtitleClass: string;
}

/** Reusable 24h area-trend chart card used by the admin sensor analytics view. */
export function SensorTrendChartCard({
  title, subtitle, icon, data, dataKey, color, gradientId, unit, domain,
  chartConfig, cardClass, iconWrapClass, titleClass, subtitleClass,
}: Props) {
  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-3">
          <div className={iconWrapClass}>{icon}</div>
          <span className={titleClass}>{title}</span>
        </CardTitle>
        <p className={subtitleClass}>{subtitle}</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="hour" stroke="#a1a1aa" fontSize={10} tickLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} domain={domain} unit={unit} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${gradientId})`} strokeWidth={2.5} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
