import { useAuth } from '@/context/AuthContext';
import { DeviceHealth, getSignalStrengthLabel, formatUptime, isDeviceOffline } from '@/hooks/useDeviceHealth';
import { Wifi, WifiOff, Battery, Cpu, Clock, AlertTriangle, Power } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

interface DeviceHealthCardProps {
  device: DeviceHealth;
  deviceName?: string;
}

export function DeviceHealthCard({ device, deviceName }: DeviceHealthCardProps) {
  const { language } = useAuth();
  const isOffline = isDeviceOffline(device.last_seen_at);
  const signal = getSignalStrengthLabel(device.wifi_signal_strength);
  
  const lastSeenText = device.last_seen_at 
    ? formatDistanceToNow(new Date(device.last_seen_at), {
        addSuffix: true,
        locale: language === 'bn' ? bn : enUS,
      })
    : (language === 'bn' ? 'অজানা' : 'Unknown');

  const signalColors = {
    excellent: 'text-status-normal',
    good: 'text-status-normal',
    fair: 'text-status-warning',
    weak: 'text-status-danger',
  };

  const powerSourceLabels = {
    mains: { bn: 'মেইন লাইন', en: 'Mains' },
    battery: { bn: 'ব্যাটারি', en: 'Battery' },
    solar: { bn: 'সোলার', en: 'Solar' },
  };

  return (
    <div className={`rounded-xl border p-4 ${isOffline ? 'border-status-danger/30 bg-status-danger/5' : 'border-border bg-card'}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOffline ? (
            <WifiOff className="h-5 w-5 text-status-danger" />
          ) : (
            <Wifi className={`h-5 w-5 ${signalColors[signal.level]}`} />
          )}
          <span className="font-medium">
            {deviceName || (language === 'bn' ? 'ESP32 কন্ট্রোলার' : 'ESP32 Controller')}
          </span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          isOffline 
            ? 'bg-status-danger/20 text-status-danger' 
            : 'bg-status-normal/20 text-status-normal'
        }`}>
          {isOffline 
            ? (language === 'bn' ? 'অফলাইন' : 'Offline')
            : (language === 'bn' ? 'অনলাইন' : 'Online')
          }
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* WiFi Signal */}
        <div className="rounded-lg bg-muted/50 p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wifi className="h-3.5 w-3.5" />
            {language === 'bn' ? 'সিগনাল' : 'Signal'}
          </div>
          <p className={`mt-1 text-sm font-medium ${signalColors[signal.level]}`}>
            {language === 'bn' ? signal.labelBn : signal.label}
            {device.wifi_signal_strength && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({device.wifi_signal_strength} dBm)
              </span>
            )}
          </p>
        </div>

        {/* Uptime */}
        <div className="rounded-lg bg-muted/50 p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {language === 'bn' ? 'আপটাইম' : 'Uptime'}
          </div>
          <p className="mt-1 text-sm font-medium">
            {formatUptime(device.uptime_seconds)}
          </p>
        </div>

        {/* Power Source */}
        <div className="rounded-lg bg-muted/50 p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Power className="h-3.5 w-3.5" />
            {language === 'bn' ? 'পাওয়ার' : 'Power'}
          </div>
          <p className="mt-1 text-sm font-medium">
            {powerSourceLabels[device.power_source as keyof typeof powerSourceLabels]?.[language] || device.power_source}
            {device.battery_percentage !== null && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({device.battery_percentage}%)
              </span>
            )}
          </p>
        </div>

        {/* CPU Temperature */}
        <div className="rounded-lg bg-muted/50 p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" />
            {language === 'bn' ? 'সিপিইউ' : 'CPU'}
          </div>
          <p className={`mt-1 text-sm font-medium ${
            device.cpu_temperature && Number(device.cpu_temperature) > 70 
              ? 'text-status-danger' 
              : ''
          }`}>
            {device.cpu_temperature ? `${device.cpu_temperature}°C` : '-'}
          </p>
        </div>
      </div>

      {/* Error Info */}
      {device.error_count > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-status-warning/10 p-2.5 text-status-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-xs">
            <p className="font-medium">
              {language === 'bn' 
                ? `${device.error_count}টি এরর` 
                : `${device.error_count} error(s)`}
            </p>
            {device.last_error_message && (
              <p className="mt-0.5 text-muted-foreground">{device.last_error_message}</p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {language === 'bn' ? 'সর্বশেষ দেখা:' : 'Last seen:'} {lastSeenText}
        </span>
        {device.firmware_version && (
          <span>v{device.firmware_version}</span>
        )}
      </div>
    </div>
  );
}
