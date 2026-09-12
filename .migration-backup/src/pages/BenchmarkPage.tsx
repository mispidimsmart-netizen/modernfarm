import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus, Globe, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';

type Row = {
  anon_id: string;
  is_self: boolean;
  total_birds: number;
  avg_temp: number | null;
  avg_humidity: number | null;
  avg_ammonia: number | null;
  avg_hsi: number | null;
  total_alerts: number;
  critical_alerts: number;
  total_anomalies: number;
  total_eggs: number;
  total_mortality: number;
  reading_count: number;
};

function median(nums: number[]): number | null {
  const a = nums.filter((n) => n != null && !isNaN(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function percentileRank(value: number | null, all: number[], higherIsBetter = true): number | null {
  if (value == null) return null;
  const arr = all.filter((n) => n != null && !isNaN(n));
  if (arr.length < 2) return null;
  const below = arr.filter((n) => (higherIsBetter ? n < value : n > value)).length;
  return Math.round((below / (arr.length - 1)) * 100);
}

function KPI({
  label,
  yours,
  peerMedian,
  unit,
  higherIsBetter,
  pct,
}: {
  label: string;
  yours: number | null;
  peerMedian: number | null;
  unit?: string;
  higherIsBetter: boolean;
  pct: number | null;
}) {
  const diff = yours != null && peerMedian != null ? yours - peerMedian : null;
  const better =
    diff == null ? null : higherIsBetter ? diff > 0 : diff < 0;
  const Icon = better == null ? Minus : better ? TrendingUp : TrendingDown;
  const color =
    better == null ? 'text-muted-foreground' : better ? 'text-green-600' : 'text-destructive';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl font-semibold tabular-nums">
            {yours ?? '—'}
            {unit && <span className="text-sm ml-1 text-muted-foreground">{unit}</span>}
          </div>
          <div className={`flex items-center gap-1 text-xs ${color}`}>
            <Icon className="h-3 w-3" />
            {diff != null ? (diff > 0 ? '+' : '') + diff.toFixed(1) : '—'}
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          নেটওয়ার্ক মিডিয়ান: <span className="tabular-nums">{peerMedian ?? '—'}{unit}</span>
        </div>
        {pct != null && (
          <div className="mt-1 text-xs">
            <Badge variant={pct >= 75 ? 'default' : pct >= 50 ? 'secondary' : 'outline'}>
              টপ {100 - pct}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BenchmarkPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);

  const q = useQuery({
    queryKey: ['anon-benchmark', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_anonymized_benchmark', { _days: days });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const { self, peers, peerStats } = useMemo(() => {
    const rows = q.data ?? [];
    const self = rows.find((r) => r.is_self) ?? null;
    const peers = rows.filter((r) => !r.is_self);
    return {
      self,
      peers,
      peerStats: {
        hsi: peers.map((p) => Number(p.avg_hsi)).filter((n) => !isNaN(n)),
        temp: peers.map((p) => Number(p.avg_temp)).filter((n) => !isNaN(n)),
        humidity: peers.map((p) => Number(p.avg_humidity)).filter((n) => !isNaN(n)),
        ammonia: peers.map((p) => Number(p.avg_ammonia)).filter((n) => !isNaN(n)),
        alerts: peers.map((p) => Number(p.total_alerts)),
        critical: peers.map((p) => Number(p.critical_alerts)),
        mortality: peers.map((p) => Number(p.total_mortality)),
      },
    };
  }, [q.data]);

  const sortedByHsi = useMemo(
    () =>
      (q.data ?? [])
        .slice()
        .sort((a, b) => (a.avg_hsi ?? 999) - (b.avg_hsi ?? 999)),
    [q.data],
  );
  const myRank = sortedByHsi.findIndex((r) => r.is_self) + 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <div className="container max-w-5xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              ফার্ম বেঞ্চমার্ক
            </h1>
            <p className="text-xs text-muted-foreground">
              বাংলাদেশ ও এশিয়ার অন্যান্য ফার্মের সাথে আপনার KPI তুলনা (অ্যানোনিমাইজড)
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? 'default' : 'outline'}
              onClick={() => setDays(d)}
            >
              {d} দিন
            </Button>
          ))}
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-start gap-2 text-xs">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <strong>গোপনীয়তা:</strong> অন্য ফার্মের নাম, মালিক বা অবস্থান কখনো প্রকাশ করা হয় না।
              প্রতিটি ফার্ম শুধু একটি অ্যানোনিমাস কোড (যেমন "Farm-a3f2c1") হিসাবে দেখানো হয়।
            </div>
          </CardContent>
        </Card>

        {q.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : q.error ? (
          <Card className="border-destructive">
            <CardContent className="p-4 text-sm text-destructive">
              ডেটা লোড ব্যর্থ: {(q.error as Error).message}
            </CardContent>
          </Card>
        ) : !self ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              আপনার ফার্মের জন্য পর্যাপ্ত ডেটা পাওয়া যায়নি। প্রথমে কিছু সেন্সর রিডিং সংগ্রহ করুন।
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Rank summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  নেটওয়ার্ক র‍্যাঙ্ক (HSI অনুযায়ী)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums">
                  #{myRank || '—'}
                  <span className="text-base text-muted-foreground font-normal">
                    {' '}/ {sortedByHsi.length} ফার্ম
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  কম HSI = কম তাপ-চাপ = ভালো কর্মক্ষমতা
                </div>
              </CardContent>
            </Card>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI
                label="গড় HSI"
                yours={self.avg_hsi}
                peerMedian={median(peerStats.hsi)}
                higherIsBetter={false}
                pct={percentileRank(self.avg_hsi, peerStats.hsi, false)}
              />
              <KPI
                label="গড় তাপমাত্রা"
                yours={self.avg_temp}
                peerMedian={median(peerStats.temp)}
                unit="°C"
                higherIsBetter={false}
                pct={null}
              />
              <KPI
                label="গড় আর্দ্রতা"
                yours={self.avg_humidity}
                peerMedian={median(peerStats.humidity)}
                unit="%"
                higherIsBetter={false}
                pct={null}
              />
              <KPI
                label="গড় অ্যামোনিয়া"
                yours={self.avg_ammonia}
                peerMedian={median(peerStats.ammonia)}
                unit=" ppm"
                higherIsBetter={false}
                pct={percentileRank(self.avg_ammonia, peerStats.ammonia, false)}
              />
              <KPI
                label="মোট অ্যালার্ট"
                yours={self.total_alerts}
                peerMedian={median(peerStats.alerts)}
                higherIsBetter={false}
                pct={percentileRank(self.total_alerts, peerStats.alerts, false)}
              />
              <KPI
                label="জরুরি অ্যালার্ট"
                yours={self.critical_alerts}
                peerMedian={median(peerStats.critical)}
                higherIsBetter={false}
                pct={percentileRank(self.critical_alerts, peerStats.critical, false)}
              />
              <KPI
                label="মোট ডিম"
                yours={self.total_eggs}
                peerMedian={median(peers.map((p) => Number(p.total_eggs)))}
                higherIsBetter={true}
                pct={percentileRank(self.total_eggs, peers.map((p) => Number(p.total_eggs)), true)}
              />
              <KPI
                label="মৃত্যু"
                yours={self.total_mortality}
                peerMedian={median(peerStats.mortality)}
                higherIsBetter={false}
                pct={percentileRank(self.total_mortality, peerStats.mortality, false)}
              />
            </div>

            {/* Leaderboard */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">লিডারবোর্ড (অ্যানোনিমাইজড)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-2">র‍্যাঙ্ক</th>
                      <th className="py-2 pr-2">ফার্ম</th>
                      <th className="py-2 pr-2 text-right">পাখি</th>
                      <th className="py-2 pr-2 text-right">HSI</th>
                      <th className="py-2 pr-2 text-right">NH₃</th>
                      <th className="py-2 pr-2 text-right">অ্যালার্ট</th>
                      <th className="py-2 pr-2 text-right">মৃত্যু</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByHsi.map((r, i) => (
                      <tr
                        key={r.anon_id}
                        className={`border-b last:border-0 ${
                          r.is_self ? 'bg-primary/10 font-semibold' : ''
                        }`}
                      >
                        <td className="py-1.5 pr-2">#{i + 1}</td>
                        <td className="py-1.5 pr-2 truncate max-w-[140px]">
                          {r.anon_id}
                          {r.is_self && (
                            <Badge variant="default" className="ml-1 text-[10px]">
                              আপনি
                            </Badge>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{r.total_birds}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{r.avg_hsi ?? '—'}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {r.avg_ammonia ?? '—'}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {r.total_alerts}
                          {r.critical_alerts > 0 && (
                            <span className="text-destructive"> ({r.critical_alerts})</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{r.total_mortality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedByHsi.length < 3 && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    নেটওয়ার্কে আরও ফার্ম যোগ হলে তুলনা আরও নির্ভরযোগ্য হবে।
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
