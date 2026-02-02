import { motion } from 'framer-motion';
import { Cloud, CloudOff, Clock, Cpu, RefreshCw, Shield, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAllDeviceHealth, DeviceHealth } from '@/hooks/useDeviceHealth';

// Calculate time ago from a date string
function getTimeAgo(dateStr: string | null, language: 'bn' | 'en'): string {
  if (!dateStr) return language === 'bn' ? 'কখনো না' : 'Never';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffSec < 60) {
    return language === 'bn' ? `${diffSec} সেকেন্ড আগে` : `${diffSec}s ago`;
  }
  if (diffMin < 60) {
    return language === 'bn' ? `${diffMin} মিনিট আগে` : `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return language === 'bn' ? `${diffHour} ঘন্টা আগে` : `${diffHour}h ago`;
  }
  return language === 'bn' ? `${Math.floor(diffHour / 24)} দিন আগে` : `${Math.floor(diffHour / 24)}d ago`;
}

// Get primary device (most recently seen)
function getPrimaryDevice(devices: DeviceHealth[] | undefined): DeviceHealth | null {
  if (!devices || devices.length === 0) return null;
  return devices.reduce((latest, device) => {
    if (!latest.last_seen_at) return device;
    if (!device.last_seen_at) return latest;
    return new Date(device.last_seen_at) > new Date(latest.last_seen_at) ? device : latest;
  });
}

export function SystemModeCard() {
  const { language } = useAuth();
  const { data: deviceHealth, isLoading } = useAllDeviceHealth();
  
  const primaryDevice = getPrimaryDevice(deviceHealth);
  const isFailSafe = primaryDevice?.failsafe_mode ?? false;
  const lastCloudSync = primaryDevice?.last_cloud_sync_at;
  const lastSeenAt = primaryDevice?.last_seen_at;
  const isOnline = primaryDevice?.is_online ?? false;
  
  // Calculate if cloud connection is stale (> 5 minutes)
  const isCloudStale = (() => {
    if (!lastCloudSync) return true;
    const syncDate = new Date(lastCloudSync);
    const now = new Date();
    return (now.getTime() - syncDate.getTime()) > 5 * 60 * 1000; // 5 minutes
  })();

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card animate-pulse">
        <div className="h-16 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!primaryDevice) {
    return (
      <div className="rounded-2xl bg-muted/50 p-4 border border-border/50">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Cpu className="h-5 w-5" />
          <span className="text-sm">
            {language === 'bn' ? 'কোনো ডিভাইস সংযুক্ত নেই' : 'No device connected'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl p-4 shadow-card border ${
        isFailSafe 
          ? 'bg-amber-500/10 border-amber-500/30' 
          : 'bg-card border-border/50'
      }`}
    >
      {/* Mode Indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {isFailSafe ? (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-amber-500/20"
            >
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'সিস্টেম মোড' : 'System Mode'}
            </p>
            <p className={`font-bold text-sm ${isFailSafe ? 'text-amber-600' : 'text-primary'}`}>
              {isFailSafe 
                ? (language === 'bn' ? 'ফেইল-সেফ' : 'FAIL-SAFE')
                : (language === 'bn' ? 'অটো (ক্লাউড)' : 'AUTO (Cloud)')
              }
            </p>
          </div>
        </div>

        {/* Online Status */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isOnline 
            ? 'bg-status-normal/10 text-status-normal' 
            : 'bg-red-500/10 text-red-500'
        }`}>
          <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-status-normal' : 'bg-red-500'} ${isOnline ? 'animate-pulse' : ''}`} />
          {isOnline 
            ? (language === 'bn' ? 'অনলাইন' : 'Online')
            : (language === 'bn' ? 'অফলাইন' : 'Offline')
          }
        </div>
      </div>

      {/* Sync Info */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          {isCloudStale ? (
            <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Cloud className="h-3.5 w-3.5 text-primary" />
          )}
          <span className={isCloudStale ? 'text-muted-foreground' : 'text-foreground'}>
            {language === 'bn' ? 'সিংক:' : 'Sync:'}
          </span>
          <span className={`font-medium ${isCloudStale ? 'text-amber-600' : 'text-foreground'}`}>
            {getTimeAgo(lastCloudSync, language)}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 ml-auto">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {language === 'bn' ? 'দেখা:' : 'Seen:'}
          </span>
          <span className="font-medium">
            {getTimeAgo(lastSeenAt, language)}
          </span>
        </div>
      </div>

      {/* Fail-Safe Warning */}
      {isFailSafe && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
        >
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {language === 'bn' 
              ? '⚠️ ক্লাউড সংযোগ বিচ্ছিন্ন। ESP32 লোকাল অটোমেশনে চলছে।'
              : '⚠️ Cloud disconnected. ESP32 running local automation.'
            }
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
