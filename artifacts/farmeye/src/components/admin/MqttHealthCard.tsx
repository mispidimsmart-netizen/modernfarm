import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type LogRow = {
  id: string;
  direction: "publish" | "inbound" | "subscribe";
  topic: string;
  status: "pending" | "sent" | "failed" | "received";
  error: string | null;
  qos: number | null;
  created_at: string;
  farm_id: string | null;
  device_token_id: string | null;
};

export function MqttHealthCard() {
  const [testing, setTesting] = useState(false);

  const statsQ = useQuery({
    queryKey: ["mqtt-stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const since1h = new Date(Date.now() - 3600_000).toISOString();
      const since24h = new Date(Date.now() - 86400_000).toISOString();

      const [h1, h24, failed, devCount] = await Promise.all([
        supabase.from("mqtt_message_log").select("direction", { count: "exact", head: false }).gte("created_at", since1h),
        supabase.from("mqtt_message_log").select("direction", { count: "exact", head: false }).gte("created_at", since24h),
        supabase.from("mqtt_message_log").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since24h),
        supabase.from("device_tokens").select("id", { count: "exact", head: true }).eq("mqtt_enabled", true),
      ]);

      const count = (rows: any[] | null, dir: string) => (rows ?? []).filter((r) => r.direction === dir).length;
      return {
        inbound_1h: count(h1.data, "inbound"),
        publish_1h: count(h1.data, "publish"),
        inbound_24h: count(h24.data, "inbound"),
        publish_24h: count(h24.data, "publish"),
        failed_24h: failed.count ?? 0,
        mqtt_devices: devCount.count ?? 0,
      };
    },
  });

  const recentQ = useQuery({
    queryKey: ["mqtt-recent"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mqtt_message_log")
        .select("id, direction, topic, status, error, qos, created_at, farm_id, device_token_id")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const runTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("mqtt-publish", {
        body: {
          topic: `farm/_admin/test/ping`,
          payload: { ts: Date.now(), source: "admin-health-card" },
          qos: 0,
          retain: false,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("MQTT publish সফল");
      statsQ.refetch();
      recentQ.refetch();
    } catch (e: any) {
      toast.error("Publish ব্যর্থ: " + (e.message ?? "unknown"));
    } finally {
      setTesting(false);
    }
  };

  const s = statsQ.data;
  const errRate = s && s.publish_24h + s.inbound_24h > 0
    ? Math.round((s.failed_24h / (s.publish_24h + s.inbound_24h)) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          MQTT Bridge Health
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runTest} disabled={testing}>
            <Send className={`h-4 w-4 mr-1 ${testing ? "animate-pulse" : ""}`} />
            টেস্ট
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { statsQ.refetch(); recentQ.refetch(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {statsQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat icon={<ArrowDownToLine className="h-3 w-3" />} label="ইনবাউন্ড (১ঘ)" value={s?.inbound_1h ?? 0} sub={`২৪ঘ: ${s?.inbound_24h ?? 0}`} />
            <Stat icon={<ArrowUpFromLine className="h-3 w-3" />} label="পাবলিশ (১ঘ)" value={s?.publish_1h ?? 0} sub={`২৪ঘ: ${s?.publish_24h ?? 0}`} />
            <Stat icon={<AlertTriangle className="h-3 w-3" />} label="ত্রুটি (২৪ঘ)" value={s?.failed_24h ?? 0} sub={`${errRate}% রেট`} bad={errRate > 5} />
            <Stat icon={<Radio className="h-3 w-3" />} label="MQTT ডিভাইস" value={s?.mqtt_devices ?? 0} sub="enabled" />
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">সাম্প্রতিক বার্তা</div>
          {recentQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (recentQ.data?.length ?? 0) === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">কোনো বার্তা নেই</div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {recentQ.data!.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs border rounded p-2">
                  <Badge variant="outline" className={r.direction === "inbound" ? "bg-blue-500/10 border-blue-500/30" : "bg-green-500/10 border-green-500/30"}>
                    {r.direction === "inbound" ? "↓" : "↑"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      r.status === "failed"
                        ? "bg-red-500/10 border-red-500/30 text-red-700"
                        : r.status === "received" || r.status === "sent"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                        : ""
                    }
                  >
                    {r.status}
                  </Badge>
                  <span className="font-mono truncate flex-1" title={r.topic}>{r.topic}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value, sub, bad }: { icon: React.ReactNode; label: string; value: number; sub?: string; bad?: boolean }) {
  return (
    <div className={`border rounded-lg p-2 ${bad ? "border-red-500/40 bg-red-500/5" : ""}`}>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">{icon}{label}</div>
      <div className={`text-xl font-bold ${bad ? "text-red-600" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
