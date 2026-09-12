import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Building2 } from 'lucide-react';
import type { AdminSensorChartLabels, FarmComparison } from '@/data/adminSensorChartLabels';

interface Props {
  labels: AdminSensorChartLabels;
  data: FarmComparison[];
  chartConfig: Record<string, { label: string; color: string }>;
}

export function FarmComparisonChartCard({ labels, data, chartConfig }: Props) {
  return (
    <Card className="bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-violet-950/30 border-indigo-500/20 shadow-xl shadow-indigo-500/10 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-indigo-200 to-violet-200 bg-clip-text text-transparent font-semibold">
            {labels.farmComparison}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis type="number" stroke="#a1a1aa" fontSize={10} />
            <YAxis type="category" dataKey="farmName" stroke="#a1a1aa" fontSize={10} width={100} tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="avgTemp" name={labels.temperature} fill="hsl(25, 95%, 53%)" radius={[0, 6, 6, 0]} />
            <Bar dataKey="avgHumidity" name={labels.humidity} fill="hsl(195, 100%, 50%)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
