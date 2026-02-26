import { Wifi, WifiOff } from 'lucide-react';

interface DeviceConnectionStatusProps {
  deviceHealth: any[] | undefined;
  language: string;
}

export function DeviceConnectionStatus({ deviceHealth, language }: DeviceConnectionStatusProps) {
  const devices = deviceHealth || [];
  const onlineCount = devices.filter((d: any) => d.is_online).length;
  const totalCount = devices.length;
  const allOnline = totalCount > 0 && onlineCount === totalCount;
  const anyOffline = totalCount > 0 && onlineCount < totalCount;

  if (totalCount === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <WifiOff className="h-4 w-4 text-status-off" />
        <span className="text-xs font-medium text-muted-foreground">
          {language === 'bn' ? 'কোনো ডিভাইস সংযুক্ত নেই' : 'No devices connected'}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${
      allOnline 
        ? 'border-status-normal/30 bg-status-normal/5' 
        : anyOffline 
          ? 'border-status-danger/30 bg-status-danger/5' 
          : 'border-border bg-muted/30'
    }`}>
      {allOnline ? (
        <Wifi className="h-4 w-4 text-status-normal" />
      ) : (
        <WifiOff className="h-4 w-4 text-status-danger" />
      )}
      <span className={`text-xs font-medium ${allOnline ? 'text-status-normal' : 'text-status-danger'}`}>
        {language === 'bn' 
          ? `🔌 ডিভাইস: ${onlineCount}/${totalCount} অনলাইন`
          : `🔌 Devices: ${onlineCount}/${totalCount} online`}
      </span>
      {anyOffline && (
        <span className="ml-auto text-[10px] font-medium text-status-danger">
          {language === 'bn' ? '⚠️ চেক করুন' : '⚠️ Check'}
        </span>
      )}
    </div>
  );
}
