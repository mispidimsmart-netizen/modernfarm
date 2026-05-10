import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, BellRing, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestResult {
  ok: boolean;
  message: string;
  diagnostics?: {
    subscription_count: number;
    vapid_configured: boolean;
    timestamp: string;
  };
}

export function TestNotificationCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('notification-test', {
        body: {},
      });
      if (error) throw error;
      setResult(data as TestResult);
      if ((data as TestResult).ok) toast.success('টেস্ট পাঠানো হয়েছে');
      else toast.error((data as TestResult).message ?? 'ব্যর্থ');
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error';
      setResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="w-4 h-4 text-primary" />
          নোটিফিকেশন টেস্ট
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          আপনার push notification ঠিকঠাক কাজ করছে কি না যাচাই করুন।
        </p>
        <Button onClick={runTest} disabled={loading} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2" />}
          {loading ? 'পাঠানো হচ্ছে...' : 'টেস্ট নোটিফিকেশন পাঠান'}
        </Button>

        {result && (
          <div className={`p-3 rounded-lg border space-y-2 ${
            result.ok
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          }`}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {result.ok
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                : <XCircle className="w-4 h-4 text-rose-600" />}
              <span className={result.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                {result.message}
              </span>
            </div>
            {result.diagnostics && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">
                  Subscriptions: {result.diagnostics.subscription_count}
                </Badge>
                <Badge variant={result.diagnostics.vapid_configured ? 'outline' : 'destructive'}>
                  VAPID: {result.diagnostics.vapid_configured ? 'OK' : 'Missing'}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
