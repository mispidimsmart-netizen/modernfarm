import { useAuth } from '@/context/AuthContext';
import { useMortalityRecords } from '@/hooks/useFarmManagement';
import { Card, CardContent } from '@/components/ui/card';
import { Skull, TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';

interface MortalityTrendChartProps {
  days?: number;
}

export function MortalityTrendChart({ days = 14 }: MortalityTrendChartProps = {}) {
  const { language } = useAuth();
  // Fetch enough data to cover the window plus the previous-period trend comparison
  const fetchDays = Math.max(days * 2, 30);
  const { data: mortality } = useMortalityRecords(fetchDays);

  // Aggregate by date for selected window
  const seriesData = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayMortality = mortality?.filter(m => m.record_date === dateStr) ?? [];
    const total = dayMortality.reduce((sum, m) => sum + m.count, 0);
    return {
      date: format(date, 'dd/MM'),
      count: total,
    };
  });

  const half = Math.floor(days / 2);
  const totalRecent = seriesData.slice(half).reduce((s, d) => s + d.count, 0);
  const totalPrev = seriesData.slice(0, half).reduce((s, d) => s + d.count, 0);
  const trend = totalPrev > 0 ? ((totalRecent - totalPrev) / totalPrev * 100).toFixed(0) : '0';
  const isUp = Number(trend) > 0;
  const xInterval = days > 30 ? Math.ceil(days / 10) : days > 14 ? 3 : 2;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-destructive/10">
              <Skull className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {language === 'bn' ? 'মৃত্যুহার ট্রেন্ড' : 'Mortality Trend'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? `গত ${days} দিন` : `Last ${days} days`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{totalRecent}</p>
            <span className={`flex items-center gap-1 text-xs ${isUp ? 'text-destructive' : 'text-emerald-600'}`}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend}%
            </span>
          </div>
        </div>

        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last14Days}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 9 }} width={20} allowDecimals={false} />
              <Tooltip
                formatter={(value: number) => [value, language === 'bn' ? 'মৃত্যু' : 'Deaths']}
                labelStyle={{ fontSize: 11 }}
                contentStyle={{ borderRadius: 12, fontSize: 11 }}
              />
              <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
