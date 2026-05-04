import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  table: string;
  row_id?: string;
  user_id?: string;
  farm_id?: string;
  count?: number;
  detail: string;
}

interface AuditReport {
  scanned_at: string;
  summary: { farms: number; device_tokens: number; farm_members: number; total_issues: number };
  issues: Issue[];
}

const sevColor = (s: string) =>
  s === 'critical' ? 'destructive' : s === 'high' ? 'destructive' : s === 'medium' ? 'default' : 'secondary';

export function TenantIsolationAuditTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);

  const runAudit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('audit_tenant_isolation' as never);
      if (error) throw error;
      setReport(data as unknown as AuditReport);
      toast({ title: 'অডিট সম্পন্ন', description: `${(data as AuditReport).summary.total_issues}টি issue পাওয়া গেছে` });
    } catch (e) {
      toast({ title: 'ত্রুটি', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const issues = report?.issues ?? [];
  const clean = report && issues.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          ফার্ম আইসোলেশন অডিট
        </CardTitle>
        <Button onClick={runAudit} disabled={loading} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          স্ক্যান চালান
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          ESP32 টোকেন ও সব multi-tenant টেবিল চেক করে দেখায় — কোনো ফার্মের ডেটা/কমান্ড অন্য ফার্মে যাওয়ার ঝুঁকি আছে কিনা।
        </p>

        {report && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">মোট ফার্ম</div>
              <div className="text-2xl font-bold">{report.summary.farms}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">ডিভাইস টোকেন</div>
              <div className="text-2xl font-bold">{report.summary.device_tokens}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">ফার্ম মেম্বার</div>
              <div className="text-2xl font-bold">{report.summary.farm_members}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">পাওয়া issue</div>
              <div className={`text-2xl font-bold ${issues.length ? 'text-destructive' : 'text-primary'}`}>
                {issues.length}
              </div>
            </div>
          </div>
        )}

        {clean && (
          <Alert>
            <ShieldCheck className="w-4 h-4" />
            <AlertTitle>সব ঠিক আছে ✅</AlertTitle>
            <AlertDescription>
              কোনো ক্রস-ফার্ম mismatch বা NULL farm_id পাওয়া যায়নি। সব ESP32 টোকেন সঠিক ফার্মের সাথে bound।
            </AlertDescription>
          </Alert>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            {issues.map((iss, i) => (
              <Alert key={i} variant={iss.severity === 'critical' || iss.severity === 'high' ? 'destructive' : 'default'}>
                <ShieldAlert className="w-4 h-4" />
                <AlertTitle className="flex items-center gap-2">
                  <Badge variant={sevColor(iss.severity) as 'default' | 'destructive' | 'secondary'}>{iss.severity}</Badge>
                  <span className="font-mono text-xs">{iss.table}</span>
                  <span className="text-xs text-muted-foreground">· {iss.category}</span>
                </AlertTitle>
                <AlertDescription className="text-sm mt-1">
                  {iss.detail}
                  {iss.row_id && <div className="font-mono text-xs mt-1 opacity-60">id: {iss.row_id}</div>}
                  {iss.farm_id && <div className="font-mono text-xs opacity-60">farm: {iss.farm_id}</div>}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
