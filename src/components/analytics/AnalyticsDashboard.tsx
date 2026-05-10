import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarmContext } from "@/context/FarmContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, AreaChart, Area,
} from "recharts";
import {
  Activity, AlertTriangle, Brain, Download, RefreshCw, CheckCircle2,
} from "lucide-react";

type RollupRow = {
  hour: string;
  avg_temp: number | null;
  max_temp: number | null;
  avg_humidity: number | null;
  avg_ammonia: number | null;
  max_ammonia: number | null;
  avg_hsi: number | null;
};

type Anomaly = {
  id: string;
  detected_at: string;
  metric: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  title_bn: string;
  description_bn: string | null;
  recommendation_bn: string | null;
  acknowledged: boolean;
};

const sevColor: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  critical: "bg-red-500/10 text-red-700 border-red-500/30",
};

export function AnalyticsDashboard() {
  const { selectedFarmId } = useFarmContext();
  const [days, setDays] = useState(7);
  const [scanning, setScanning] = useState(false);

  const rollupQ = useQuery({
    queryKey: ["sensor-hourly-rollup", selectedFarmId, days],
    enabled: !!selectedFarmId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sensor_hourly_rollup", {
        _farm_id: selectedFarmId!,
        _hours: days * 24,
      });
      if (error) throw error;
      return ((data ?? []) as RollupRow[])
        .slice()
        .reverse()
        .map((r) => ({
          ...r,
          label: new Date(r.hour).toLocaleString("bn-BD", { month: "short", day: "numeric", hour: "2-digit" }),
        }));
    },
  });

  const anomalyQ = useQuery({
    queryKey: ["anomalies", selectedFarmId],
    enabled: !!selectedFarmId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anomaly_detections")
        .select("id, detected_at, metric, severity, confidence, title_bn, description_bn, recommendation_bn, acknowledged")
        .eq("farm_id", selectedFarmId!)
        .order("detected_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Anomaly[];
    },
    refetchInterval: 60_000,
  });

  const runScan = async () => {
    if (!selectedFarmId) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("anomaly-detector", {
        body: {},
        method: "POST",
      });
      if (error) throw error;
      toast.success("AI স্ক্যান সম্পন্ন");
      anomalyQ.refetch();
    } catch (e: any) {
      toast.error("স্ক্যান ব্যর্থ: " + (e.message ?? "unknown"));
    } finally {
      setScanning(false);
    }
  };

  const ack = async (id: string) => {
    const { error } = await supabase.rpc("acknowledge_anomaly", { _id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("চিহ্নিত করা হয়েছে");
      anomalyQ.refetch();
    }
  };

  const downloadCsv = async (type: "sensors" | "finance" | "batch" | "anomalies") => {
    if (!selectedFarmId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/report-export?type=${type}&farm_id=${selectedFarmId}&days=${days}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${type}_${days}d.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("ডাউনলোড শুরু");
    } catch (e: any) {
      toast.error("এক্সপোর্ট ব্যর্থ: " + (e.message ?? "unknown"));
    }
  };

  if (!selectedFarmId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          খামার নির্বাচন করুন
        </CardContent>
      </Card>
    );
  }

  const rows = rollupQ.data ?? [];

  return (
    <div className="space-y-4">
      {/* Range + actions */}
      <div className="flex flex-wrap items-center gap-2">
        {[1, 7, 30].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? "default" : "outline"}
            onClick={() => setDays(d)}
          >
            {d === 1 ? "২৪ ঘন্টা" : `${d} দিন`}
          </Button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={runScan} disabled={scanning}>
            <Brain className={`h-4 w-4 mr-1 ${scanning ? "animate-pulse" : ""}`} />
            AI স্ক্যান
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCsv("sensors")}>
            <Download className="h-4 w-4 mr-1" /> সেন্সর CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCsv("finance")}>
            <Download className="h-4 w-4 mr-1" /> অর্থ CSV
          </Button>
        </div>
      </div>

      {/* Temperature chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            তাপমাত্রা ট্রেন্ড (গড়/সর্বোচ্চ)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {rollupQ.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : rows.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">কোনো ডেটা নেই</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avg_temp" name="গড় °C" stroke="hsl(var(--primary))" dot={false} />
                <Line type="monotone" dataKey="max_temp" name="সর্বোচ্চ °C" stroke="hsl(var(--destructive))" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Humidity + Ammonia + HSI */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">আর্দ্রতা (%)</CardTitle></CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Area type="monotone" dataKey="avg_humidity" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">অ্যামোনিয়া (ppm)</CardTitle></CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg_ammonia" name="গড়" stroke="#a855f7" dot={false} />
                <Line type="monotone" dataKey="max_ammonia" name="সর্বোচ্চ" stroke="#dc2626" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            AI Anomaly Detection
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={() => anomalyQ.refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {anomalyQ.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (anomalyQ.data?.length ?? 0) === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              কোনো anomaly পাওয়া যায়নি 🎉
            </div>
          ) : (
            anomalyQ.data!.map((a) => (
              <div
                key={a.id}
                className={`border rounded-lg p-3 ${a.acknowledged ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className={sevColor[a.severity]}>
                        {a.severity}
                      </Badge>
                      <Badge variant="outline">{a.metric}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(a.confidence * 100)}% সঠিক •{" "}
                        {new Date(a.detected_at).toLocaleString("bn-BD")}
                      </span>
                    </div>
                    <div className="font-semibold text-sm">{a.title_bn}</div>
                    {a.description_bn && (
                      <div className="text-sm text-muted-foreground mt-1">{a.description_bn}</div>
                    )}
                    {a.recommendation_bn && (
                      <div className="text-sm mt-1 p-2 bg-muted/50 rounded">
                        💡 {a.recommendation_bn}
                      </div>
                    )}
                  </div>
                  {!a.acknowledged && (
                    <Button size="sm" variant="ghost" onClick={() => ack(a.id)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
          <Button size="sm" variant="outline" className="w-full" onClick={() => downloadCsv("anomalies")}>
            <Download className="h-4 w-4 mr-1" /> Anomaly CSV ডাউনলোড
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
