/**
 * FailedCommandsBanner (S7.2) — Persistent banner for failed/expired device commands.
 *
 * Why: Toasts disappear in ~10s. Workers on the floor can miss them. A sticky
 * banner stays visible until the user explicitly dismisses or retries, so a
 * "no-ack" failure cannot silently slip past.
 *
 * Behavior:
 *   - Polls device_command_log (already 5s refetch in the hook) for the active farm.
 *   - Shows commands with status in ('failed','expired') from the LAST 5 MINUTES.
 *   - Per-command-id dismiss is persisted in sessionStorage so dismissed alerts
 *     don't reappear during the same session, but new failures still surface.
 *   - "Retry" re-sends only the most recent failed command via useSendDeviceCommand.
 *   - Hidden when no qualifying failures.
 */
import { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, RotateCw, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useDeviceCommandLog } from '@/hooks/useDeviceCommandLog';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'farmeye-dismissed-failed-cmds-v1';
const WINDOW_MS = 5 * 60 * 1000;

const DEVICE_LABELS: Record<string, { bn: string; en: string }> = {
  fan: { bn: 'ফ্যান', en: 'Fan' },
  heater: { bn: 'হিটার', en: 'Heater' },
  sprinkler: { bn: 'পানি', en: 'Water' },
  light: { bn: 'লাইট', en: 'Light' },
};

function loadDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function FailedCommandsBanner() {
  const { language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { data: log } = useDeviceCommandLog({ farmId: selectedFarmId ?? undefined });
  const sendCmd = useSendDeviceCommand();
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [, force] = useState(0);

  // Re-evaluate "within 5 min" window every 30s so old entries auto-disappear.
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const failed = useMemo(() => {
    if (!log) return [];
    const cutoff = Date.now() - WINDOW_MS;
    return log.filter(
      (e) =>
        (e.status === 'failed' || e.status === 'expired') &&
        new Date(e.created_at).getTime() >= cutoff &&
        !dismissed.has(e.command_id),
    );
  }, [log, dismissed]);

  if (failed.length === 0) return null;

  const latest = failed[0];
  const isOffline = latest.status === 'expired';
  const deviceLabel =
    DEVICE_LABELS[latest.command_type]?.[language] ?? latest.command_type;

  const headline =
    failed.length > 1
      ? language === 'bn'
        ? `${failed.length}টি কমান্ড ব্যর্থ হয়েছে`
        : `${failed.length} commands failed`
      : language === 'bn'
        ? `${deviceLabel}: কমান্ড ${isOffline ? 'পৌঁছায়নি' : 'নিশ্চিত হয়নি'}`
        : `${deviceLabel}: command ${isOffline ? 'not delivered' : 'not acknowledged'}`;

  const sub = isOffline
    ? language === 'bn'
      ? 'ডিভাইস অফলাইন — WiFi/পাওয়ার চেক করুন।'
      : 'Device offline — check WiFi/power.'
    : language === 'bn'
      ? 'ডিভাইস থেকে নিশ্চিতকরণ আসেনি (১২ সে.)।'
      : 'No acknowledgement within 12s.';

  const dismissOne = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const dismissAll = () => {
    const next = new Set(dismissed);
    failed.forEach((e) => next.add(e.command_id));
    setDismissed(next);
    saveDismissed(next);
  };

  const retryLatest = () => {
    sendCmd.mutate({
      commandType: latest.command_type as any,
      commandValue: latest.command_value,
      shedId: latest.shed_id ?? undefined,
      deviceName: latest.device_name,
    });
    dismissOne(latest.command_id);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-foreground shadow-sm"
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-destructive">
          {headline}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{sub}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-xs"
            onClick={retryLatest}
            disabled={sendCmd.isPending}
          >
            <RotateCw className="mr-1 h-3 w-3" />
            {language === 'bn' ? 'আবার চেষ্টা' : 'Retry'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={dismissAll}
          >
            <X className="mr-1 h-3 w-3" />
            {language === 'bn' ? 'বন্ধ করুন' : 'Dismiss'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FailedCommandsBanner;
