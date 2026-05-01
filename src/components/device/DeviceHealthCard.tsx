import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DeviceHealth, getSignalStrengthLabel, formatUptime, isDeviceOffline, getRestartReasonLabel, formatDuration, getOTAStatusLabel } from '@/hooks/useDeviceHealth';
import { Wifi, WifiOff, Battery, Cpu, Clock, AlertTriangle, Power, Zap, RefreshCw, Shield, Database, Download, Activity, Bird, Cloud, Server, Droplets, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RestartHistorySheet } from './RestartHistorySheet';

interface DeviceHealthCardProps {
  device: DeviceHealth;
  deviceName?: string;
}

export function DeviceHealthCard({ device, deviceName }: DeviceHealthCardProps) {
  const { language } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
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

      {/* Broiler Age Source Tracking */}
      {device.broiler_age_source && (
        <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/5 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bird className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium">
                {language === 'bn' ? 'ব্রয়লার বয়স উৎস' : 'Broiler Age Source'}
              </span>
            </div>
            <Badge 
              variant={device.broiler_age_source === 'SERVER' ? 'default' : 'secondary'} 
              className="text-[10px]"
            >
              {device.broiler_age_source === 'SERVER' ? (
                <><Cloud className="h-3 w-3 mr-1" />{language === 'bn' ? 'সার্ভার' : 'SERVER'}</>
              ) : (
                <><Server className="h-3 w-3 mr-1" />{language === 'bn' ? 'লোকাল' : 'LOCAL'}</>
              )}
            </Badge>
          </div>
          {device.last_server_age_sync_at && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {language === 'bn' ? 'শেষ সার্ভার সিঙ্ক:' : 'Last server sync:'}{' '}
              {formatDistanceToNow(new Date(device.last_server_age_sync_at), {
                addSuffix: true,
                locale: language === 'bn' ? bn : enUS,
              })}
            </p>
          )}
        </div>
      )}

      {/* Water Monitoring Status */}
      {(device.water_24h_rolling_avg !== null && device.water_24h_rolling_avg > 0) && (
        <div className="mt-3 rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-2 text-xs">
            <Droplets className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-muted-foreground">
              {language === 'bn' ? 'পানি মনিটরিং' : 'Water Monitoring'}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {language === 'bn' ? '২ঘ গড়:' : '2h Avg:'} {(device.water_last_2h_avg ?? 0).toFixed(1)} L/h
            </span>
            <span className="text-muted-foreground">
              {language === 'bn' ? '২৪ঘ গড়:' : '24h Avg:'} {(device.water_24h_rolling_avg ?? 0).toFixed(1)} L/h
            </span>
          </div>
          {device.water_anomaly_consecutive_count !== null && device.water_anomaly_consecutive_count > 0 && (
            <div className="mt-1 flex items-center gap-1 text-amber-600 text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              {language === 'bn' 
                ? `${device.water_anomaly_consecutive_count}টি ধারাবাহিক অ্যানোমালি সাইকেল`
                : `${device.water_anomaly_consecutive_count} consecutive anomaly cycles`}
            </div>
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

      {/* Restart history button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setHistoryOpen(true)}
        className="mt-3 h-8 w-full text-xs"
      >
        <History className="mr-1.5 h-3.5 w-3.5" />
        {language === 'bn' ? 'রিস্টার্ট ইতিহাস দেখুন' : 'View Restart History'}
        {device.total_restarts !== null && device.total_restarts > 0 && (
          <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
            {device.total_restarts}
          </Badge>
        )}
      </Button>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {language === 'bn' ? 'সর্বশেষ দেখা:' : 'Last seen:'} {lastSeenText}
        </span>
        <div className="flex items-center gap-2">
          {device.firmware_version && (
            <Badge variant="outline" className="text-[10px]">v{device.firmware_version}</Badge>
          )}
        </div>
      </div>

      <RestartHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        deviceTokenId={device.device_token_id}
        deviceName={deviceName}
      />
    </div>
  );
}
