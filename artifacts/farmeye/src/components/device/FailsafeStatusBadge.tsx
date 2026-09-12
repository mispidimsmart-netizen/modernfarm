import { Shield, ShieldAlert, Wifi, WifiOff, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAllDeviceHealth, formatUptime } from '@/hooks/useDeviceHealth';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

export function FailsafeStatusBadge() {
  const { language } = useAuth();
  const { data: healthData } = useAllDeviceHealth();

  const t = {
    online: { bn: 'অনলাইন', en: 'Online' },
    failsafe: { bn: 'ফেইলসেফ মোড', en: 'Failsafe Mode' },
    offline: { bn: 'অফলাইন', en: 'Offline' },
    onlineDesc: { bn: 'সার্ভারের সাথে সংযুক্ত', en: 'Connected to server' },
    failsafeDesc: { bn: 'লোকাল অটোমেশন চলছে', en: 'Running local automation' },
    offlineDesc: { bn: 'কোনো ডিভাইস সংযুক্ত নেই', en: 'No device connected' },
    lastSync: { bn: 'শেষ সিংক', en: 'Last sync' },
    failsafeDuration: { bn: 'ফেইলসেফ চলছে', en: 'Failsafe active' },
    localRules: { bn: 'লোকাল রুলস অনুসরণ করছে', en: 'Following local rules' },
  };

  if (!healthData || healthData.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <WifiOff className="h-3 w-3" />
            {t.offline[language]}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{t.offlineDesc[language]}</TooltipContent>
      </Tooltip>
    );
  }

  // Check if any device is in failsafe mode
  const failsafeDevice = healthData.find((d) => d.failsafe_mode === true);
  const onlineDevice = healthData.find((d) => d.is_online === true && !d.failsafe_mode);

  if (failsafeDevice) {
    const failsafeDuration = failsafeDevice.failsafe_activated_at 
      ? formatDistanceToNow(new Date(failsafeDevice.failsafe_activated_at), { 
          locale: language === 'bn' ? bn : enUS,
          addSuffix: false 
        })
      : null;

    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className="gap-1 border-orange-500 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 animate-pulse"
          >
            <ShieldAlert className="h-3 w-3" />
            {t.failsafe[language]}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-center">
            <p className="font-medium text-orange-600">{t.failsafe[language]}</p>
            <p className="text-xs text-muted-foreground">{t.localRules[language]}</p>
            {failsafeDuration && (
              <p className="text-xs flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                {t.failsafeDuration[language]}: {failsafeDuration}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (onlineDevice) {
    const lastSync = onlineDevice.last_cloud_sync_at 
      ? formatDistanceToNow(new Date(onlineDevice.last_cloud_sync_at), { 
          locale: language === 'bn' ? bn : enUS,
          addSuffix: true 
        })
      : null;

    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className="gap-1 border-green-500 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          >
            <Shield className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            {t.online[language]}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-center">
            <p className="font-medium text-green-600">{t.online[language]}</p>
            <p className="text-xs text-muted-foreground">{t.onlineDesc[language]}</p>
            {lastSync && (
              <p className="text-xs">
                {t.lastSync[language]}: {lastSync}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <WifiOff className="h-3 w-3" />
          {t.offline[language]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t.offlineDesc[language]}</TooltipContent>
    </Tooltip>
  );
}
