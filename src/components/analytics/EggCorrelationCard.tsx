import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Egg, TrendingUp, TrendingDown, Brain, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEggCorrelation, CorrelationInsight } from '@/hooks/useEggCorrelation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Line, ComposedChart } from 'recharts';

function getSeverityStyle(severity: CorrelationInsight['severity']) {
  switch (severity) {
    case 'warning':
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      };
    case 'success':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      };
    default:
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        icon: <Info className="h-4 w-4 text-blue-500" />,
      };
  }
}

interface InsightItemProps {
  insight: CorrelationInsight;
  language: 'bn' | 'en';
  index: number;
}

function InsightItem({ insight, language, index }: InsightItemProps) {
  const style = getSeverityStyle(insight.severity);
  
  // Prepare chart data
  const chartData = insight.dataPoints.slice(-14).map(dp => ({
    date: dp.date.slice(5), // MM-DD
    eggs: dp.eggs,
    temp: dp.avgTemp,
    humidity: dp.avgHumidity,
    ammonia: dp.avgAmmonia,
  }));

  const getSecondaryKey = () => {
    switch (insight.type) {
      case 'temperature': return 'temp';
      case 'humidity': return 'humidity';
      case 'ammonia': return 'ammonia';
      default: return null;
    }
  };

  const secondaryKey = getSecondaryKey();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn('rounded-lg border p-3', style.bg, style.border)}
    >
      <div className="flex items-start gap-2 mb-2">
        {style.icon}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">
            {insight.title[language]}
          </p>
          <p className="text-xs text-muted-foreground">
            {insight.description[language]}
          </p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {insight.confidence === 'high' && (language === 'bn' ? 'উচ্চ' : 'High')}
          {insight.confidence === 'medium' && (language === 'bn' ? 'মাঝারি' : 'Medium')}
          {insight.confidence === 'low' && (language === 'bn' ? 'নিম্ন' : 'Low')}
        </Badge>
      </div>

      {/* Mini Chart */}
      {chartData.length > 0 && (
        <div className="h-20 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 8 }} interval="preserveStartEnd" />
              <YAxis yAxisId="left" tick={{ fontSize: 8 }} />
              {secondaryKey && (
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8 }} />
              )}
              <Tooltip 
                contentStyle={{ fontSize: 10, padding: 4 }}
                labelStyle={{ fontSize: 10 }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="eggs"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
                strokeWidth={2}
                name={language === 'bn' ? 'ডিম' : 'Eggs'}
              />
              {secondaryKey && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={secondaryKey}
                  stroke={insight.type === 'temperature' ? '#f97316' : insight.type === 'humidity' ? '#3b82f6' : '#8b5cf6'}
                  strokeWidth={1.5}
                  dot={false}
                  name={insight.type === 'temperature' ? 'Temp' : insight.type === 'humidity' ? 'Humidity' : 'Ammonia'}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Correlation Indicator */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {language === 'bn' ? 'সম্পর্ক:' : 'Correlation:'}
        </span>
        <div className="flex items-center gap-1">
          {insight.correlation > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className={cn(
            'font-medium',
            insight.correlation > 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {insight.correlation > 0 ? '+' : ''}{(insight.correlation * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function EggCorrelationCard() {
  const { language } = useAuth();
  const { insights, summary, isLoading } = useEggCorrelation();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            {language === 'bn' ? 'ডিম উৎপাদন বিশ্লেষণ' : 'Egg Production Analysis'}
          </div>
          <Badge variant="outline" className="text-xs">
            🤖 AI
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary Stats */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-lg font-bold text-primary">{summary.totalDays}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'দিন ডেটা' : 'Days Data'}
            </p>
          </div>
          <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2 text-center">
            <p className="text-lg font-bold text-orange-600">{summary.warnings}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'সতর্কতা' : 'Warnings'}
            </p>
          </div>
          <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2 text-center">
            <p className="text-lg font-bold text-green-600">{summary.positives}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'ইতিবাচক' : 'Positive'}
            </p>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <InsightItem key={insight.id} insight={insight} language={language} index={idx} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Egg className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {language === 'bn' 
                ? 'ডিম উৎপাদন ডেটা যোগ করুন বিশ্লেষণ দেখতে'
                : 'Add egg production data to see analysis'
              }
            </p>
          </div>
        )}

        {/* AI Note */}
        <div className="mt-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3 text-xs text-purple-700 dark:text-purple-300">
          <div className="flex items-start gap-2">
            <Brain className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {language === 'bn' 
                ? 'এই বিশ্লেষণ আপনার সেন্সর ডেটা এবং ডিম উৎপাদন রেকর্ড থেকে স্বয়ংক্রিয়ভাবে তৈরি হয়েছে। আরও ডেটা যোগ করলে নির্ভুলতা বাড়বে।'
                : 'This analysis is automatically generated from your sensor data and egg production records. Adding more data will improve accuracy.'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
