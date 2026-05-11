import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, BellRing, Clock, X } from 'lucide-react';

interface Notif {
  id: string;
  threshold_days: number;
  days_remaining: number;
  license_expires_at: string;
  severity: 'info' | 'warning' | 'critical' | 'expired';
  message_bn: string;
  created_at: string;
  seen_at: string | null;
  dismissed_at: string | null;
}

interface Props {
  orgId: string;
  onRenew?: () => void;
}

const severityStyles: Record<Notif['severity'], string> = {
  info: 'border-primary/40 bg-primary/5',
  warning: 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/30',
  critical: 'border-orange-500/60 bg-orange-50 dark:bg-orange-950/30',
  expired: 'border-destructive/60 bg-destructive/10',
};

const severityIcon = (s: Notif['severity']) => {
  if (s === 'expired') return <AlertTriangle className="h-5 w-5 text-destructive" />;
  if (s === 'critical') return <AlertTriangle className="h-5 w-5 text-orange-600" />;
  if (s === 'warning') return <Clock className="h-5 w-5 text-amber-600" />;
  return <BellRing className="h-5 w-5 text-primary" />;
};

export function LicenseExpiryBanner({ orgId, onRenew }: Props) {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['license_notifications', orgId],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('license_notifications')
        .select('*')
        .eq('organization_id', orgId)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as Notif | undefined) ?? null;
    },
  });

  const markSeen = useMutation({
    mutationFn: async (id: string) => {
      await supabase.rpc('mark_license_notification_seen' as any, { _id: id });
    },
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      await supabase.rpc('dismiss_license_notification' as any, { _id: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['license_notifications', orgId] }),
  });

  useEffect(() => {
    if (data && !data.seen_at) markSeen.mutate(data.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  if (!data) return null;

  return (
    <Alert className={`relative ${severityStyles[data.severity]}`}>
      <div className="flex items-start gap-3 pr-8">
        <div className="mt-0.5">{severityIcon(data.severity)}</div>
        <div className="flex-1">
          <AlertTitle className="font-semibold">
            {data.severity === 'expired'
              ? 'লাইসেন্সের মেয়াদ শেষ'
              : 'লাইসেন্সের মেয়াদ সতর্কতা'}
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            {data.message_bn}
            <div className="mt-2 text-xs opacity-70">
              মেয়াদ শেষ: {new Date(data.license_expires_at).toLocaleDateString('bn-BD')}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  document.getElementById('payment-request-panel')?.scrollIntoView({
                    behavior: 'smooth', block: 'start',
                  });
                }}
              >
                এখনই নবায়ন করুন
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>
      <button
        type="button"
        onClick={() => dismiss.mutate(data.id)}
        className="absolute right-2 top-2 rounded p-1 opacity-60 hover:opacity-100"
        aria-label="বন্ধ করুন"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
