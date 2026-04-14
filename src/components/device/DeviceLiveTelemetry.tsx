import { useAuth } from '@/context/AuthContext';
import { useAllDeviceHealth, DeviceHealth, formatUptime, formatDuration } from '@/hooks/useDeviceHealth';
import { useDeviceTokens } from '@/hooks/useDeviceHealth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, Clock, Wifi, WifiOff, Zap, 
  Radio, PackageX, Timer, BatteryWarning,
  CircuitBoard, ToggleRight, Signal
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

type FreshnessLevel = 'green' | 'yellow' | 'red';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

function isDeviceReallyOnline(device: DeviceHealth): boolean {
  if (!device.is_online) return false;
  if (!device.last_seen_at) return false;
  const diffMs = Date.now() - new Date(device.last_seen_at).getTime();
  return diffMs < ONLINE_THRESHOLD_MS;
}

function getLastSeenFreshness(lastSeenAt: string | null): FreshnessLevel {
  if (!lastSeenAt) return 'red';
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const diffSec = diffMs / 1000;
  if (diffSec < 10) return 'green';
  if (diffSec < 60) return 'yellow';
  return 'red';
}

const freshnessStyles: Record<FreshnessLevel, { bg: string; text: string; dot: string }> = {
  green: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  yellow: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  red: {
    bg: 'bg-red-500/10 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

function estimatePingLatency(device: DeviceHealth): { value: string; level: FreshnessLevel } {
  if (!device.last_seen_at || !device.is_online) return { value: '-', level: 'red' };
  const diffMs = Date.now() - new Date(device.last_seen_at).getTime();
  if (diffMs < 5000) return { value: '<5s', level: 'green' };
  if (diffMs < 30000) return { value: `${Math.round(diffMs / 1000)}s`, level: 'green' };
  if (diffMs < 60000) return { value: `${Math.round(diffMs / 1000)}s`, level: 'yellow' };
  return { value: `${Math.round(diffMs / 60000)}m`, level: 'red' };
}

function estimatePacketLoss(device: DeviceHealth): { value: string; level: FreshnessLevel } {
  const restarts = device.total_restarts ?? 0;
  const errors = device.error_count ?? 0;
  if (restarts === 0 && errors === 0) return { value: '0%', level: 'green' };
  if (errors < 5) return { value: `~${errors}%`, level: 'yellow' };
  return { value: `~${Math.min(errors * 2, 100)}%`, level: 'red' };
}

function getVoltageStatus(device: DeviceHealth): { value: string; level: FreshnessLevel } {
  const v = device.power_voltage_rms;
  if (v === null || v === undefined) return { value: '-', level: 'yellow' };
  if (v >= 200 && v <= 250) return { value: `${v.toFixed(0)}V`, level: 'green' };
  if (v >= 180 && v < 200) return { value: `${v.toFixed(0)}V ⚠️`, level: 'yellow' };
  return { value: `${v.toFixed(0)}V ❌`, level: 'red' };
}

function getSignalDisplay(device: DeviceHealth): { value: string; level: FreshnessLevel } {
  const rssi = device.wifi_signal_strength;
  if (rssi === null || rssi === undefined) return { value: '-', level: 'yellow' };
  if (rssi >= -50) return { value: `${rssi} dBm`, level: 'green' };
  if (rssi >= -70) return { value: `${rssi} dBm`, level: 'yellow' };
  return { value: `${rssi} dBm`, level: 'red' };
}

function getRelayRuntime(device: DeviceHealth): string {
  const online = device.online_duration_seconds;
  if (!online || online === 0) return '-';
  return formatDuration(online);
}

function getOfflineDuration(device: DeviceHealth): { value: string; level: FreshnessLevel } {
  const offline = device.offline_duration_seconds;
  if (!offline || offline === 0) return { value: '-', level: 'green' };
  if (offline < 300) return { value: formatDuration(offline), level: 'green' };
  if (offline < 3600) return { value: formatDuration(offline), level: 'yellow' };
  return { value: formatDuration(offline), level: 'red' };
}

interface TelemetryMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  level: FreshnessLevel;
}

function TelemetryMetric({ icon, label, value, level }: TelemetryMetricProps) {
  const style = freshnessStyles[level];
  return (
    <div className={`rounded-lg p-2.5 ${style.bg} transition-colors`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${style.dot} ${level === 'green' ? 'animate-pulse' : ''}`} />
        <span className={`text-sm font-semibold ${style.text}`}>{value}</span>
      </div>
    </div>
  );
}

function DeviceTelemetryRow({ device, deviceName, language }: { 
  device: DeviceHealth; 
  deviceName: string;
  language: 'bn' | 'en';
}) {
  const freshness = getLastSeenFreshness(device.last_seen_at);
  const ping = estimatePingLatency(device);
  const packetLoss = estimatePacketLoss(device);
  const voltage = getVoltageStatus(device);
  const offlineDur = getOfflineDuration(device);

  const lastSeenText = device.last_seen_at
    ? formatDistanceToNow(new Date(device.last_seen_at), {
        addSuffix: true,
        locale: language === 'bn' ? bn : enUS,
      })
    : (language === 'bn' ? 'অজানা' : 'Unknown');

  const t = {
    lastSeen: language === 'bn' ? 'সর্বশেষ দেখা' : 'Last Seen',
    ping: language === 'bn' ? 'পিং' : 'Ping',
    packetLoss: language === 'bn' ? 'প্যাকেট লস' : 'Packet Loss',
    voltage: language === 'bn' ? 'ভোল্টেজ' : 'Voltage',
    relayRuntime: language === 'bn' ? 'রিলে রানটাইম' : 'Relay Runtime',
    offlineDuration: language === 'bn' ? 'অফলাইন সময়' : 'Offline Duration',
    signalStrength: language === 'bn' ? 'সিগনাল' : 'Signal',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {/* Device header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircuitBoard className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{deviceName}</span>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] ${freshnessStyles[freshness].text}`}
        >
          {device.is_online 
            ? (language === 'bn' ? '🟢 অনলাইন' : '🟢 Online') 
            : (language === 'bn' ? '🔴 অফলাইন' : '🔴 Offline')}
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        <TelemetryMetric
          icon={<Clock className="h-3 w-3" />}
          label={t.lastSeen}
          value={lastSeenText}
          level={freshness}
        />
        <TelemetryMetric
          icon={<Radio className="h-3 w-3" />}
          label={t.ping}
          value={ping.value}
          level={ping.level}
        />
        <TelemetryMetric
          icon={<PackageX className="h-3 w-3" />}
          label={t.packetLoss}
          value={packetLoss.value}
          level={packetLoss.level}
        />
        <TelemetryMetric
          icon={<Zap className="h-3 w-3" />}
          label={t.voltage}
          value={voltage.value}
          level={voltage.level}
        />
        <TelemetryMetric
          icon={<Wifi className="h-3 w-3" />}
          label={t.signalStrength}
          value={getSignalDisplay(device).value}
          level={getSignalDisplay(device).level}
        />
        <TelemetryMetric
          icon={<ToggleRight className="h-3 w-3" />}
          label={t.relayRuntime}
          value={getRelayRuntime(device)}
          level="green"
        />
        <TelemetryMetric
          icon={<WifiOff className="h-3 w-3" />}
          label={t.offlineDuration}
          value={offlineDur.value}
          level={offlineDur.level}
        />
      </div>
    </motion.div>
  );
}

export function DeviceLiveTelemetry() {
  const { language } = useAuth();
  const { data: devices, isLoading: healthLoading } = useAllDeviceHealth();
  const { data: tokens, isLoading: tokensLoading } = useDeviceTokens();

  const isLoading = healthLoading || tokensLoading;

  const t = {
    title: language === 'bn' ? 'লাইভ টেলিমেট্রি' : 'Live Telemetry',
    subtitle: language === 'bn' ? 'রিয়েল-টাইম ডিভাইস স্ট্যাটাস' : 'Real-time device status',
    noDevices: language === 'bn' ? 'কোনো ডিভাইস নেই' : 'No devices found',
    legend: language === 'bn' ? 'রং কোড' : 'Color Code',
    green: language === 'bn' ? '< ১০ সেকেন্ড' : '< 10s',
    yellow: language === 'bn' ? '< ৬০ সেকেন্ড' : '< 60s',
    red: language === 'bn' ? '> ৬০ সেকেন্ড' : '> 60s',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getDeviceName = (tokenId: string) => {
    const token = tokens?.find(t => t.id === tokenId);
    return token?.device_name || 'ESP32';
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary animate-pulse" />
            {t.title}
          </div>
          <span className="text-xs font-normal text-muted-foreground">{t.subtitle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Color legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground border-b border-border pb-2">
          <span className="font-medium">{t.legend}:</span>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{t.green}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>{t.yellow}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span>{t.red}</span>
          </div>
        </div>

        {/* Device rows */}
        {(!devices || devices.length === 0) ? (
          <p className="text-center text-sm text-muted-foreground py-4">{t.noDevices}</p>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <DeviceTelemetryRow
                key={device.id}
                device={device}
                deviceName={getDeviceName(device.device_token_id)}
                language={language}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
