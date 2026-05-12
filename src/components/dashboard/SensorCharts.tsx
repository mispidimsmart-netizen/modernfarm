import { useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, ReferenceLine } from 'recharts';
import { Thermometer, Droplets, TrendingUp, Wind, Activity, ZoomOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

type Lang = 'bn' | 'en';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  unit: string;
  name: string;
  accent: string;
  language: Lang;
}

function RichTooltip({ active, payload, label, unit, name, accent, language }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const value = Number(payload[0].value);
  return (
    <div
      className="rounded-xl border bg-popover/95 backdrop-blur px-3 py-2 shadow-xl"
      style={{ borderColor: accent }}
    >
      <p className="text-[10px] font-medium text-muted-foreground">
        {language === 'bn' ? 'সময়' : 'Time'}: <span className="text-foreground">{label}</span>
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-lg font-bold" style={{ color: accent }}>
          {value.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
        <span className="ml-1 text-[10px] text-muted-foreground">• {name}</span>
      </div>
    </div>
  );
}

export function SensorCharts() {
  const { language } = useAuth();
  const { data: historyData, isLoading } = useSensorHistory(24);
  const [zoom, setZoom] = useState<{ start?: number; end?: number }>({});

  const labels = {
    title: language === 'bn' ? 'সেন্সর ট্রেন্ড' : 'Sensor Trends',
    temperature: language === 'bn' ? 'তাপমাত্রা' : 'Temperature',
    humidity: language === 'bn' ? 'আর্দ্রতা' : 'Humidity',
    ammonia: language === 'bn' ? 'অ্যামোনিয়া' : 'Ammonia',
    noData: language === 'bn' ? 'কোনো ডেটা নেই' : 'No data available',
    last24h: language === 'bn' ? 'গত ২৪ ঘণ্টা' : 'Last 24 hours',
    zoomHint: language === 'bn' ? 'নিচের বার দিয়ে জুম করুন' : 'Drag the bar below to zoom',
    reset: language === 'bn' ? 'রিসেট' : 'Reset',
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-card p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-[260px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!historyData || historyData.length === 0) {
    return (
      <div className="rounded-3xl bg-card p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-base">{labels.title}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">{labels.noData}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {language === 'bn'
              ? 'ডিভাইস কানেক্ট হলে ডেটা এখানে দেখানো হবে'
              : 'Data will appear here once your device is connected'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = historyData;
  const temps = chartData.map(d => d.temperature);
  const humids = chartData.map(d => d.humidity);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const avgHumid = humids.reduce((a, b) => a + b, 0) / humids.length;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);

  const startIdx = zoom.start ?? 0;
  const endIdx = zoom.end ?? Math.max(0, chartData.length - 1);
  const isZoomed = startIdx !== 0 || endIdx !== chartData.length - 1;

  const handleBrushChange = (range: any) => {
    if (range && typeof range.startIndex === 'number' && typeof range.endIndex === 'number') {
      setZoom({ start: range.startIndex, end: range.endIndex });
    }
  };

  const resetZoom = () => setZoom({});

  // Shared chart pieces
  const renderChart = (
    dataKey: 'temperature' | 'humidity' | 'ammonia',
    accent: string,
    gradientId: string,
    gradientStops: [string, string],
    yDomain: any,
    unit: string,
    name: string,
    refLine?: { y: number; label: string }
  ) => (
    <div className="h-[240px] w-full rounded-2xl bg-muted/50 p-3 border border-border">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientStops[0]} stopOpacity={0.4} />
              <stop offset="50%" stopColor={gradientStops[1]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={gradientStops[1]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            domain={yDomain}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: accent, strokeWidth: 1, strokeDasharray: '3 3' }}
            content={(props: any) => (
              <RichTooltip {...props} unit={unit} name={name} accent={accent} language={language} />
            )}
          />
          {refLine && (
            <ReferenceLine
              y={refLine.y}
              stroke={accent}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              label={{ value: refLine.label, fontSize: 9, fill: accent, position: 'insideTopRight' }}
            />
          )}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={accent}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, fill: accent, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Brush
            dataKey="time"
            height={22}
            stroke={accent}
            fill="hsl(var(--muted))"
            travellerWidth={10}
            startIndex={startIdx}
            endIndex={endIdx}
            onChange={handleBrushChange}
            tickFormatter={() => ''}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="rounded-3xl bg-card p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
            <Activity className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground font-medium">{labels.last24h}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl bg-orange-500/10 dark:bg-orange-500/20 p-2.5 border border-orange-500/30">
            <div className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mb-0.5">
              {language === 'bn' ? 'গড় তাপ' : 'Avg Temp'}
            </div>
            <div className="text-lg font-bold text-foreground">{avgTemp.toFixed(1)}°</div>
          </div>
          <div className="rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 p-2.5 border border-cyan-500/30">
            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium mb-0.5">
              {language === 'bn' ? 'গড় আর্দ্রতা' : 'Avg Humid'}
            </div>
            <div className="text-lg font-bold text-foreground">{avgHumid.toFixed(0)}%</div>
          </div>
          <div className="rounded-xl bg-rose-500/10 dark:bg-rose-500/20 p-2.5 border border-rose-500/30">
            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mb-0.5">
              {language === 'bn' ? 'সর্বোচ্চ' : 'Max'}
            </div>
            <div className="text-lg font-bold text-foreground">{maxTemp.toFixed(1)}°</div>
          </div>
          <div className="rounded-xl bg-sky-500/10 dark:bg-sky-500/20 p-2.5 border border-sky-500/30">
            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mb-0.5">
              {language === 'bn' ? 'সর্বনিম্ন' : 'Min'}
            </div>
            <div className="text-lg font-bold text-foreground">{minTemp.toFixed(1)}°</div>
          </div>
        </div>

        <Tabs defaultValue="temperature" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-3 bg-muted border border-border rounded-xl p-1">
            <TabsTrigger
              value="temperature"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg text-muted-foreground"
            >
              <Thermometer className="h-3.5 w-3.5" />
              {labels.temperature}
            </TabsTrigger>
            <TabsTrigger
              value="humidity"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg text-muted-foreground"
            >
              <Droplets className="h-3.5 w-3.5" />
              {labels.humidity}
            </TabsTrigger>
            <TabsTrigger
              value="ammonia"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg text-muted-foreground"
            >
              <Wind className="h-3.5 w-3.5" />
              {labels.ammonia}
            </TabsTrigger>
          </TabsList>

          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[10px] text-muted-foreground">{labels.zoomHint}</p>
            {isZoomed && (
              <Button
                size="sm"
                variant="ghost"
                onClick={resetZoom}
                className="h-6 px-2 text-[10px] gap-1"
              >
                <ZoomOut className="h-3 w-3" />
                {labels.reset}
              </Button>
            )}
          </div>

          <TabsContent value="temperature" className="mt-0">
            {renderChart(
              'temperature',
              '#f97316',
              'tempGradient',
              ['#f97316', '#ef4444'],
              ['dataMin - 2', 'dataMax + 2'],
              '°C',
              labels.temperature,
              { y: 32, label: language === 'bn' ? 'নিরাপদ সীমা' : 'Safe limit' }
            )}
          </TabsContent>

          <TabsContent value="humidity" className="mt-0">
            {renderChart(
              'humidity',
              '#06b6d4',
              'humidGradient',
              ['#06b6d4', '#3b82f6'],
              [0, 100],
              '%',
              labels.humidity
            )}
          </TabsContent>

          <TabsContent value="ammonia" className="mt-0">
            {renderChart(
              'ammonia',
              '#8b5cf6',
              'ammoniaGradient',
              ['#8b5cf6', '#a855f7'],
              [0, 50],
              'ppm',
              labels.ammonia,
              { y: 25, label: language === 'bn' ? 'সতর্ক সীমা' : 'Warn limit' }
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
