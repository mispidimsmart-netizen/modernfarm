import { Shield, ShieldAlert, Wifi, WifiOff, Clock, Zap, Database, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { useAllDeviceHealth, formatUptime, DeviceHealth } from '@/hooks/useDeviceHealth';
import { useSelectedShed } from '@/hooks/useSheds';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

// Get primary device for a specific shed (each shed = independent fail-safe unit)
function getDeviceForShed(devices: DeviceHealth[] | undefined, shedId: string | null): DeviceHealth | null {
  if (!devices || devices.length === 0) return null;
  
  // Filter by shed if selected
  const shedDevices = shedId 
    ? devices.filter(d => d.shed_id === shedId)
    : devices;
  
  if (shedDevices.length === 0) return null;
  
  // Return most recently seen device for this shed
  return shedDevices.reduce((latest, device) => {
    if (!latest.last_seen_at) return device;
    if (!device.last_seen_at) return latest;
    return new Date(device.last_seen_at) > new Date(latest.last_seen_at) ? device : latest;
  });
}

export function FailsafeStatusCard() {
  const { language } = useAuth();
  const { data: healthData, isLoading } = useAllDeviceHealth();
  const { selectedShedId } = useSelectedShed();

  const t = {
    title: { bn: 'ফেইলসেফ সিস্টেম', en: 'Fail-Safe System' },
    cloudMode: { bn: 'ক্লাউড মোড', en: 'Cloud Mode' },
    failsafeMode: { bn: 'ফেইলসেফ মোড', en: 'Failsafe Mode' },
    offline: { bn: 'অফলাইন', en: 'Offline' },
    lastSync: { bn: 'শেষ সিংক', en: 'Last Sync' },
    uptime: { bn: 'আপটাইম', en: 'Uptime' },
    cachedSettings: { bn: 'ক্যাশড সেটিংস', en: 'Cached Settings' },
    localRules: { bn: 'লোকাল রুলস', en: 'Local Rules' },
    active: { bn: 'সক্রিয়', en: 'Active' },
    noDevice: { bn: 'এই শেডে কোনো ডিভাইস নেই', en: 'No device in this shed' },
    cloudConnected: { bn: 'ক্লাউড সংযুক্ত', en: 'Cloud Connected' },
    runningLocal: { bn: 'লোকাল অটোমেশন চলছে', en: 'Running Local Automation' },
    description: { 
      bn: 'ইন্টারনেট না থাকলেও এই শেডের ESP32 স্বয়ংক্রিয়ভাবে লোকাল রুলস ফলো করে', 
      en: 'This shed\'s ESP32 follows local rules when internet is unavailable' 
    },
    settingsVersion: { bn: 'সেটিংস ভার্সন', en: 'Settings Version' },
    wifiSignal: { bn: 'ওয়াইফাই সিগন্যাল', en: 'WiFi Signal' },
    batteryBackup: { bn: 'ব্যাটারি ব্যাকআপ', en: 'Battery Backup' },
    independentUnit: { bn: 'স্বাধীন ইউনিট', en: 'Independent Unit' },
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t.title[language]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Each shed = independent fail-safe unit
  const device = getDeviceForShed(healthData, selectedShedId);

  if (!device) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {t.title[language]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <WifiOff className="h-5 w-5 mr-2" />
            <span className="text-sm">{t.noDevice[language]}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isFailsafe = device.failsafe_mode;
  const isOnline = device.is_online;

  const lastSyncTime = device.last_cloud_sync_at 
    ? formatDistanceToNow(new Date(device.last_cloud_sync_at), { 
        locale: language === 'bn' ? bn : enUS,
        addSuffix: true 
      })
    : null;

  const failsafeDuration = device.failsafe_activated_at 
    ? formatDistanceToNow(new Date(device.failsafe_activated_at), { 
        locale: language === 'bn' ? bn : enUS,
        addSuffix: false 
      })
    : null;

  const getWifiStrengthPercent = (rssi: number | null) => {
    if (rssi === null) return 0;
    // RSSI typically ranges from -90 (weak) to -30 (strong)
    return Math.min(100, Math.max(0, ((rssi + 90) / 60) * 100));
  };

  return (
    <Card className={isFailsafe ? 'border-orange-500 dark:border-orange-600' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isFailsafe ? (
              <ShieldAlert className="h-4 w-4 text-orange-500" />
            ) : (
              <Shield className="h-4 w-4 text-green-500" />
            )}
            {t.title[language]}
          </div>
          <Badge 
            variant="outline"
            className={
              isFailsafe 
                ? 'border-orange-500 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 animate-pulse'
                : isOnline
                  ? 'border-green-500 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'text-muted-foreground'
            }
          >
            {isFailsafe ? t.failsafeMode[language] : isOnline ? t.cloudMode[language] : t.offline[language]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Description */}
        <div className={`text-sm p-3 rounded-lg ${
          isFailsafe 
            ? 'bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
            : 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
        }`}>
          {isFailsafe ? (
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{t.runningLocal[language]}</p>
                <p className="text-xs opacity-80 mt-1">{t.description[language]}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <span>{t.cloudConnected[language]}</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Last Sync */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              {t.lastSync[language]}
            </div>
            <p className="text-sm font-medium">
              {lastSyncTime || '-'}
            </p>
          </div>

          {/* Uptime */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t.uptime[language]}
            </div>
            <p className="text-sm font-medium">
              {formatUptime(device.uptime_seconds)}
            </p>
          </div>

          {/* Cached Settings Version */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              {t.settingsVersion[language]}
            </div>
            <p className="text-sm font-medium">
              v{device.cached_settings_version || 0}
            </p>
          </div>

          {/* WiFi Signal */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wifi className="h-3 w-3" />
              {t.wifiSignal[language]}
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={getWifiStrengthPercent(device.wifi_signal_strength)} 
                className="h-2 flex-1"
              />
              <span className="text-xs font-medium">
                {device.wifi_signal_strength ? `${device.wifi_signal_strength}dBm` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Failsafe Duration */}
        {isFailsafe && failsafeDuration && (
          <div className="flex items-center justify-between p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <span className="text-xs text-orange-700 dark:text-orange-300">
              {t.failsafeMode[language]} {t.active[language].toLowerCase()}:
            </span>
            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
              {failsafeDuration}
            </span>
          </div>
        )}

        {/* Battery Backup */}
        {device.battery_percentage !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t.batteryBackup[language]}</span>
              <span className="font-medium">{device.battery_percentage}%</span>
            </div>
            <Progress 
              value={device.battery_percentage} 
              className={`h-2 ${device.battery_percentage < 20 ? '[&>div]:bg-red-500' : device.battery_percentage < 50 ? '[&>div]:bg-yellow-500' : ''}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
