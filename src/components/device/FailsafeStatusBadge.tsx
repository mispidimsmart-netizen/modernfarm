import { Shield, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const failsafeDevice = healthData.find((d: any) => d.failsafe_mode === true);
  const onlineDevice = healthData.find((d: any) => d.is_online === true);

  if (failsafeDevice) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className="gap-1 border-orange-500 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
          >
            <ShieldAlert className="h-3 w-3" />
            {t.failsafe[language]}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{t.failsafe[language]}</p>
            <p className="text-xs text-muted-foreground">{t.failsafeDesc[language]}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (onlineDevice) {
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
        <TooltipContent>{t.onlineDesc[language]}</TooltipContent>
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
