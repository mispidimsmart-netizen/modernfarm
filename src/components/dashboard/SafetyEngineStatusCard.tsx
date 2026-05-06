import { ShieldCheck, ShieldAlert, Cpu, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { useFarmContext } from '@/context/FarmContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';

/**
 * Compact dashboard tile showing:
 *  - Live Safety Engine status (cloud farm_settings.safety_engine_enabled)
 *  - Connected ESP32's reported firmware version + online state
 *  - Hard-floor reminder (always-on, regardless of toggle)
 */
export function SafetyEngineStatusCard() {
  const { language } = useAuth();
  const isBn = language === 'bn';
  const locale = isBn ? bn : undefined;

  const { selectedFarmId } = useFarmContext();
  const { data: settings } = useFarmSettings();
  const { data: healthList } = useAllDeviceHealth();

  const enabled = ((settings as any)?.safety_engine_enabled ?? true) as boolean;

  // Pick the most recently-seen device for the current farm
  const farmHealth = (healthList ?? [])
    .filter((h: any) => !selectedFarmId || h.farm_id === selectedFarmId)
    .sort((a: any, b: any) =>
      new Date(b.last_seen_at ?? 0).getTime() - new Date(a.last_seen_at ?? 0).getTime()
    );
  const device = farmHealth[0] as any | undefined;

  const fwVersion = device?.firmware_version || (isBn ? 'অজানা' : 'unknown');
  const isOnline = !!device?.is_online;
  const lastSeen = device?.last_seen_at ? new Date(device.last_seen_at) : null;

  return (
    <Card
      className={
        enabled
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-amber-500/40 bg-amber-500/5'
      }
    >
      <CardContent className="p-4 space-y-3">
        {/* Top row: Safety Engine status */}
        <div className="flex items-start gap-3">
          {enabled ? (
            <ShieldCheck className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">
                {isBn ? 'সেফটি ইঞ্জিন' : 'Safety Engine'}
              </span>
              <Badge
                variant={enabled ? 'default' : 'secondary'}
                className={
                  enabled
                    ? 'bg-green-600 hover:bg-green-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-600 text-white'
                }
              >
                {enabled ? (isBn ? 'চালু' : 'ON') : (isBn ? 'বন্ধ' : 'OFF')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled
                ? (isBn
                    ? 'স্বয়ংক্রিয় সুরক্ষা সক্রিয়'
                    : 'Automatic protections active')
                : (isBn
                    ? 'শুধু ম্যানুয়াল ও schedule কাজ করছে'
                    : 'Only manual and schedule are active')}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/60" />

        {/* Firmware + connection row */}
        <div className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">
                {isBn ? 'ফার্মওয়্যার' : 'Firmware'}
              </span>
              <Badge variant="outline" className="font-mono text-[11px]">
                v{fwVersion}
              </Badge>
              {isOnline ? (
                <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] py-0 h-5 gap-1">
                  <Wifi className="h-3 w-3" />
                  {isBn ? 'অনলাইন' : 'Online'}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] py-0 h-5 gap-1">
                  <WifiOff className="h-3 w-3" />
                  {isBn ? 'অফলাইন' : 'Offline'}
                </Badge>
              )}
            </div>
            {lastSeen && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isBn ? 'শেষ যোগাযোগ: ' : 'Last seen: '}
                {formatDistanceToNow(lastSeen, { addSuffix: true, locale })}
              </p>
            )}
          </div>
        </div>

        {/* Hard floor reminder when toggle is OFF */}
        {!enabled && (
          <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/30 p-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              {isBn
                ? '🔥 ৪২°C ছাড়ালে ফ্যান+অ্যালার্ম তবুও স্বয়ংক্রিয় চালু হবে।'
                : '🔥 Above 42°C, fan + alarm will still auto-trigger.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
