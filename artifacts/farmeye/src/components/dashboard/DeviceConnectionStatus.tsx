import { Wifi, WifiOff, Radio, Clock, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DeviceHealth } from '@/hooks/useDeviceHealth';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/** Check if device is truly online based on last_seen_at freshness */
function isDeviceReallyOnline(device: DeviceHealth): boolean {
  if (!device.is_online) return false;
  if (!device.last_seen_at) return false;
  const diffMs = Date.now() - new Date(device.last_seen_at).getTime();
  return diffMs < ONLINE_THRESHOLD_MS;
}

/** Convert Bengali numerals */
function toBn(n: number | string, language: string): string {
  if (language !== 'bn') return String(n);
  const map: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  return String(n).replace(/[0-9]/g, (d) => map[d] ?? d);
}

/** Format relative "last seen" */
function formatLastSeen(lastSeenAt: string | null, language: string): string {
  if (!lastSeenAt) {
    return language === 'bn' ? 'কখনো সংযুক্ত হয়নি' : 'Never connected';
  }
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 10) return language === 'bn' ? 'এইমাত্র' : 'just now';
  if (sec < 60) return language === 'bn' ? `${toBn(sec, language)} সেকেন্ড আগে` : `${sec}s ago`;
  if (min < 60) return language === 'bn' ? `${toBn(min, language)} মিনিট আগে` : `${min}m ago`;
  if (hr < 24) return language === 'bn' ? `${toBn(hr, language)} ঘন্টা আগে` : `${hr}h ago`;
  return language === 'bn' ? `${toBn(day, language)} দিন আগে` : `${day}d ago`;
}

/** WiFi signal label */
function signalLabel(rssi: number | null, language: string): { text: string; color: string } {
  if (rssi === null || rssi === undefined) {
    return { text: language === 'bn' ? 'অজানা' : 'Unknown', color: 'text-muted-foreground' };
  }
  if (rssi >= -55) return { text: language === 'bn' ? 'চমৎকার' : 'Excellent', color: 'text-status-normal' };
  if (rssi >= -65) return { text: language === 'bn' ? 'ভালো' : 'Good', color: 'text-status-normal' };
  if (rssi >= -75) return { text: language === 'bn' ? 'মধ্যম' : 'Fair', color: 'text-status-warning' };
  return { text: language === 'bn' ? 'দুর্বল' : 'Weak', color: 'text-status-danger' };
}

interface DeviceConnectionStatusProps {
  deviceHealth: DeviceHealth[] | undefined;
  language: string;
}

export function DeviceConnectionStatus({ deviceHealth, language }: DeviceConnectionStatusProps) {
  const devices = deviceHealth || [];
  // Re-render every 15s to keep "last seen" relative time fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const onlineCount = devices.filter(isDeviceReallyOnline).length;
  const totalCount = devices.length;
  const allOnline = totalCount > 0 && onlineCount === totalCount;
  const anyOffline = totalCount > 0 && onlineCount < totalCount;
  const allOffline = totalCount > 0 && onlineCount === 0;

  // No devices configured
  if (totalCount === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {language === 'bn' ? 'কোনো ESP32 ডিভাইস সংযুক্ত নেই' : 'No ESP32 device connected'}
          </span>
        </div>
      </div>
    );
  }

  const headerBgClass = allOnline
    ? 'border-status-normal/30 bg-status-normal/5'
    : allOffline
      ? 'border-status-danger/30 bg-status-danger/5'
      : 'border-status-warning/30 bg-status-warning/5';

  const headerTextClass = allOnline
    ? 'text-status-normal'
    : allOffline
      ? 'text-status-danger'
      : 'text-status-warning';

  return (
    <div className={`rounded-xl border ${headerBgClass} overflow-hidden`}>
      {/* Header summary */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="relative">
          {allOnline ? (
            <>
              <Wifi className={`h-4 w-4 ${headerTextClass}`} />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-status-normal animate-pulse" />
            </>
          ) : (
            <WifiOff className={`h-4 w-4 ${headerTextClass}`} />
          )}
        </div>
        <span className={`text-xs font-semibold ${headerTextClass}`}>
          {language === 'bn'
            ? `ESP32 ডিভাইস: ${toBn(onlineCount, language)}/${toBn(totalCount, language)} অনলাইন`
            : `ESP32 Devices: ${onlineCount}/${totalCount} online`}
        </span>
        {anyOffline && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-status-danger">
            <AlertTriangle className="h-3 w-3" />
            {language === 'bn' ? 'চেক করুন' : 'Check'}
          </span>
        )}
      </div>

      {/* Per-device details */}
      <div className="border-t border-border/50 bg-card/40 divide-y divide-border/40">
        {devices.map((device) => {
          const online = isDeviceReallyOnline(device);
          const sig = signalLabel(device.wifi_signal_strength, language);
          const failsafe = device.failsafe_mode;

          return (
            <div key={device.id} className="flex items-center gap-2 px-4 py-2 text-[11px]">
              <div className="relative shrink-0">
                <Radio className={`h-3.5 w-3.5 ${online ? 'text-status-normal' : 'text-status-danger'}`} />
                {online && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-status-normal animate-pulse" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold truncate ${online ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {language === 'bn' ? 'কন্ট্রোলার' : 'Controller'}
                  </span>
                  {failsafe && (
                    <span className="rounded bg-status-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-status-warning">
                      {language === 'bn' ? 'ফেইল-সেফ' : 'FAIL-SAFE'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">
                    {online
                      ? (language === 'bn' ? 'লাইভ সংযুক্ত' : 'Live connected')
                      : `${language === 'bn' ? 'শেষ দেখা' : 'Last seen'} ${formatLastSeen(device.last_seen_at, language)}`}
                  </span>
                </div>
              </div>

              {online && device.wifi_signal_strength !== null && (
                <div className="shrink-0 text-right">
                  <div className={`text-[10px] font-semibold ${sig.color}`}>{sig.text}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {toBn(device.wifi_signal_strength, language)} dBm
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
