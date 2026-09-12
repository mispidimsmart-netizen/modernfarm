import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertTriangle, Drumstick, Droplets, Thermometer, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { supabase } from '@/integrations/supabase/client';

type Day = {
  day_offset: number;
  avg_temp: number;
  avg_humidity?: number;
  avg_ammonia?: number;
  hsi_avg: number;
  mortality_risk_pct: number;
  expected_feed_kg?: number;
  expected_water_l?: number;
  risk_label_bn: string;
};

type Forecast = {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  summary_bn: string;
  recommendation_bn: string;
  days: Day[];
};

const RISK_COLOR: Record<Forecast['risk_level'], string> = {
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
};

const dayLabel = (offset: number, lang: 'bn' | 'en') => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};

export function SevenDayForecastCard() {
  const { language } = useAuth();
  const { selectedFarmId } = useFarmContext();

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['ai-forecast-7day', selectedFarmId],
    enabled: !!selectedFarmId,
    staleTime: 1000 * 60 * 60 * 6, // 6h
    queryFn: async (): Promise<{ forecast: Forecast; generated_at: string }> => {
      const { data: invoke, error } = await supabase.functions.invoke('ai-forecast-7day', {
        body: {},
        method: 'GET' as any,
      });
      // Fallback: use raw fetch with farm_id query
      if (error || !invoke) {
        const session = (await supabase.auth.getSession()).data.session;
        const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-forecast-7day?farm_id=${selectedFarmId}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        if (!res.ok) throw new Error(`forecast failed: ${res.status}`);
        return res.json();
      }
      return invoke as any;
    },
  });

  const forecast = data?.forecast;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground">
              <Calendar className="h-4 w-4" />
            </div>
            <span>{language === 'bn' ? '৭ দিনের AI পূর্বাভাস' : '7-Day AI Forecast'}</span>
            <Badge variant="outline" className="text-[10px]">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              Gemini
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && !isLoading && (
          <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 text-center">
            {language === 'bn' ? 'পূর্বাভাস তৈরি করা যায়নি — পরে আবার চেষ্টা করুন' : 'Forecast unavailable — try again later'}
          </div>
        )}

        {forecast && (
          <>
            {/* Summary banner */}
            <div className={`rounded-lg p-3 border ${RISK_COLOR[forecast.risk_level]}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {forecast.risk_level === 'low' && (language === 'bn' ? 'স্বাভাবিক ঝুঁকি' : 'Low Risk')}
                  {forecast.risk_level === 'medium' && (language === 'bn' ? 'মাঝারি ঝুঁকি' : 'Medium Risk')}
                  {forecast.risk_level === 'high' && (language === 'bn' ? 'উচ্চ ঝুঁকি' : 'High Risk')}
                  {forecast.risk_level === 'critical' && (language === 'bn' ? 'জরুরি ঝুঁকি' : 'Critical Risk')}
                </span>
              </div>
              <p className="text-xs leading-relaxed">{forecast.summary_bn}</p>
            </div>

            {/* 7-day grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {forecast.days.map((d) => (
                <div
                  key={d.day_offset}
                  className="border rounded-md p-1.5 bg-card/60 text-center"
                  title={d.risk_label_bn}
                >
                  <p className="text-[9px] text-muted-foreground truncate">
                    {dayLabel(d.day_offset, language)}
                  </p>
                  <p className="text-sm font-bold mt-0.5">{Math.round(d.avg_temp)}°</p>
                  <div className="mt-1 flex flex-col gap-0.5 text-[9px]">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 justify-center ${
                        d.hsi_avg > 70
                          ? 'border-red-500 text-red-600'
                          : d.hsi_avg > 50
                            ? 'border-amber-500 text-amber-600'
                            : 'border-emerald-500 text-emerald-600'
                      }`}
                    >
                      HSI {Math.round(d.hsi_avg)}
                    </Badge>
                    <span className="text-muted-foreground">
                      {d.mortality_risk_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Aggregate totals */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Stat
                icon={<Thermometer className="h-3 w-3" />}
                label={language === 'bn' ? 'গড় তাপ' : 'Avg Temp'}
                value={`${(forecast.days.reduce((s, d) => s + d.avg_temp, 0) / forecast.days.length).toFixed(1)}°`}
              />
              <Stat
                icon={<Drumstick className="h-3 w-3" />}
                label={language === 'bn' ? 'মোট ফিড' : 'Total Feed'}
                value={`${forecast.days.reduce((s, d) => s + (d.expected_feed_kg ?? 0), 0).toFixed(0)} kg`}
              />
              <Stat
                icon={<Droplets className="h-3 w-3" />}
                label={language === 'bn' ? 'মোট পানি' : 'Total Water'}
                value={`${forecast.days.reduce((s, d) => s + (d.expected_water_l ?? 0), 0).toFixed(0)} L`}
              />
            </div>

            {/* Recommendation */}
            <div className="text-xs p-2.5 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-semibold mb-1 text-primary">
                💡 {language === 'bn' ? 'সুপারিশ' : 'Recommendation'}
              </p>
              <p className="leading-relaxed">{forecast.recommendation_bn}</p>
            </div>

            {data?.generated_at && (
              <p className="text-[10px] text-muted-foreground text-center">
                {language === 'bn' ? 'তৈরি' : 'Generated'}:{' '}
                {new Date(data.generated_at).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border rounded-md p-2 bg-card/50 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}
