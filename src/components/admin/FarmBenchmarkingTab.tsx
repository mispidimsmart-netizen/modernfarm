import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, AlertTriangle } from "lucide-react";

type Row = {
  farm_id: string;
  farm_name: string;
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
};

export function FarmBenchmarkingTab() {
  const [days, setDays] = useState(30);

  const q = useQuery({
    queryKey: ["farm-benchmark", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_farm_benchmark", { _days: days });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const sortedByHsi = (q.data ?? []).slice().sort(
    (a, b) => (a.avg_hsi ?? 999) - (b.avg_hsi ?? 999),
  );
  const worstAlerts = (q.data ?? []).slice().sort(
    (a, b) => b.critical_alerts - a.critical_alerts,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? "default" : "outline"}
            onClick={() => setDays(d)}
          >
            {d} দিন
          </Button>
        ))}
      </div>

      {q.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : q.error ? (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            ডেটা লোড ব্যর্থ: {(q.error as Error).message}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Best HSI Leaderboard */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                সেরা ফার্ম (HSI অনুযায়ী)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {sortedByHsi.slice(0, 10).map((r, i) => (
                <div key={r.farm_id} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                  <Badge variant="outline" className="w-8 justify-center">{i + 1}</Badge>
                  <div className="flex-1 truncate font-medium">{r.farm_name}</div>
                  <div className="text-muted-foreground tabular-nums">
                    HSI: {r.avg_hsi ?? "—"} • {r.total_birds} পাখি
                  </div>
                </div>
              ))}
              {sortedByHsi.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">কোনো ডেটা নেই</div>
              )}
            </CardContent>
          </Card>

          {/* Highest critical alerts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                সর্বাধিক জরুরি অ্যালার্ট
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {worstAlerts.slice(0, 10).map((r) => (
                <div key={r.farm_id} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                  <div className="flex-1 truncate">{r.farm_name}</div>
                  <Badge variant="destructive">{r.critical_alerts} critical</Badge>
                  <span className="text-xs text-muted-foreground">/{r.total_alerts} মোট</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Full table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">সব ফার্ম তুলনা</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left">
                  <tr className="border-b">
                    <th className="py-2 pr-2">ফার্ম</th>
                    <th className="py-2 pr-2 text-right">পাখি</th>
                    <th className="py-2 pr-2 text-right">গড় T</th>
                    <th className="py-2 pr-2 text-right">গড় H</th>
                    <th className="py-2 pr-2 text-right">NH3</th>
                    <th className="py-2 pr-2 text-right">HSI</th>
                    <th className="py-2 pr-2 text-right">Alerts</th>
                    <th className="py-2 pr-2 text-right">Anomaly</th>
                    <th className="py-2 pr-2 text-right">ডিম</th>
                    <th className="py-2 pr-2 text-right">মৃত্যু</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.data ?? []).map((r) => (
                    <tr key={r.farm_id} className="border-b last:border-0">
                      <td className="py-1.5 pr-2 truncate max-w-[120px]">{r.farm_name}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.total_birds}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.avg_temp ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.avg_humidity ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.avg_ammonia ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.avg_hsi ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">
                        {r.total_alerts}
                        {r.critical_alerts > 0 && <span className="text-destructive"> ({r.critical_alerts})</span>}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.total_anomalies}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.total_eggs}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.total_mortality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
