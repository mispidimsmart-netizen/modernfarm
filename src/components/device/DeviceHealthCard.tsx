import { useAuth } from '@/context/AuthContext';
import { DeviceHealth, getSignalStrengthLabel, formatUptime, isDeviceOffline, getRestartReasonLabel, formatDuration, getOTAStatusLabel } from '@/hooks/useDeviceHealth';
import { Wifi, WifiOff, Battery, Cpu, Clock, AlertTriangle, Power, Zap, RefreshCw, Shield, Database, Download, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
      <div className="grid grid-cols-2 gap-2">
        {/* WiFi Signal */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wifi className="h-3.5 w-3.5" />
            {language === 'bn' ? 'সিগনাল' : 'Signal'}
          </div>
          <p className={`mt-1 text-sm font-medium ${signalColors[signal.level]}`}>
            {language === 'bn' ? signal.labelBn : signal.label}
          </p>
        </div>

        {/* Uptime */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {language === 'bn' ? 'আপটাইম' : 'Uptime'}
          </div>
          <p className="mt-1 text-sm font-medium">
            {formatUptime(device.uptime_seconds)}
          </p>
        </div>

        {/* Power Source */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Power className="h-3.5 w-3.5" />
            {language === 'bn' ? 'পাওয়ার' : 'Power'}
          </div>
          <p className="mt-1 text-sm font-medium">
            {powerSourceLabels[device.power_source as keyof typeof powerSourceLabels]?.[language] || device.power_source}
          </p>
        </div>

        {/* Restart Reason */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            {language === 'bn' ? 'রিস্টার্ট' : 'Restart'}
          </div>
          {(() => {
            const restartInfo = getRestartReasonLabel(device.restart_reason);
            const severityColors = {
              normal: '',
              warning: 'text-status-warning',
              danger: 'text-status-danger',
            };
            return (
              <p className={`mt-1 text-sm font-medium ${severityColors[restartInfo.severity]}`}>
                {language === 'bn' ? restartInfo.labelBn : restartInfo.label}
              </p>
            );
          })()}
        </div>
      </div>

      {/* Extended Reliability Info */}
      {(device.last_power_event_at || device.safe_mode_until || device.offline_buffer_count) && (
        <div className="mt-3 space-y-2">
          {/* Power Event */}
          {device.last_power_event_at && device.power_event_type && (
            <div className="flex items-center gap-2 text-xs">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-muted-foreground">
                {language === 'bn' ? 'শেষ পাওয়ার ইভেন্ট:' : 'Last power event:'}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {device.power_event_type}
              </Badge>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(device.last_power_event_at), {
                  addSuffix: true,
                  locale: language === 'bn' ? bn : enUS,
                })}
              </span>
            </div>
          )}

          {/* Safe Mode */}
          {device.safe_mode_until && new Date(device.safe_mode_until) > new Date() && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-600">
              <Shield className="h-3.5 w-3.5" />
              <span>
                {language === 'bn' 
                  ? 'সেফ মোড সক্রিয় - ফ্যান চালু, কমান্ড বন্ধ'
                  : 'Safe mode active - Fan ON, commands ignored'}
              </span>
            </div>
          )}

          {/* Offline Buffer */}
          {device.offline_buffer_count !== null && device.offline_buffer_count > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Database className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-muted-foreground">
                {language === 'bn' 
                  ? `${device.offline_buffer_count}টি অফলাইন রেকর্ড পেন্ডিং`
                  : `${device.offline_buffer_count} offline records pending`}
              </span>
            </div>
          )}

          {/* Gas Sensor Warmup */}
          {device.gas_sensor_warmup_done === false && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>
                {language === 'bn' 
                  ? 'গ্যাস সেন্সর ওয়ার্মআপ চলছে (৫ মিনিট)...'
                  : 'Gas sensor warming up (5 min)...'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* OTA Update Status */}
      {device.ota_status && device.ota_status !== 'idle' && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-2">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">
              {language === 'bn' ? 'ফার্মওয়্যার আপডেট' : 'Firmware Update'}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {getOTAStatusLabel(device.ota_status)[language === 'bn' ? 'labelBn' : 'label']}
            </Badge>
          </div>
          {device.ota_status === 'downloading' && device.ota_progress !== null && (
            <div className="mt-2">
              <Progress value={device.ota_progress} className="h-1.5" />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{device.ota_progress}%</p>
            </div>
          )}
          {device.ota_version_available && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {language === 'bn' ? 'নতুন ভার্সন:' : 'New version:'} v{device.ota_version_available}
            </p>
          )}
        </div>
      )}

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
        <div className="flex items-center gap-2">
          {device.total_restarts !== null && device.total_restarts > 0 && (
            <span title={language === 'bn' ? 'মোট রিস্টার্ট' : 'Total restarts'}>
              🔄 {device.total_restarts}
            </span>
          )}
          {device.firmware_version && (
            <Badge variant="outline" className="text-[10px]">v{device.firmware_version}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
