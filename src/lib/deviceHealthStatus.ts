/**
 * Device Health — PURE HELPERS (Single Source of Truth)
 *
 * Presentation/derivation helpers for ESP32 device_health rows.
 * No React, no network — unit tested in src/test/deviceHealthStatus.test.ts.
 */

// Helper to get signal strength label
export function getSignalStrengthLabel(rssi: number | null): { label: string; labelBn: string; level: 'excellent' | 'good' | 'fair' | 'weak' } {
  if (rssi === null) return { label: 'Unknown', labelBn: 'অজানা', level: 'weak' };
  if (rssi >= -50) return { label: 'Excellent', labelBn: 'চমৎকার', level: 'excellent' };
  if (rssi >= -60) return { label: 'Good', labelBn: 'ভালো', level: 'good' };
  if (rssi >= -70) return { label: 'Fair', labelBn: 'মধ্যম', level: 'fair' };
  return { label: 'Weak', labelBn: 'দুর্বল', level: 'weak' };
}

// Helper to format uptime
export function formatUptime(seconds: number | null): string {
  if (seconds === null) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Helper to format duration from seconds
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}দিন ${hours}ঘন্টা`;
  if (hours > 0) return `${hours}ঘন্টা ${minutes}মিনিট`;
  return `${minutes}মিনিট`;
}

// Helper to get restart reason label
export function getRestartReasonLabel(reason: string | null): { label: string; labelBn: string; severity: 'normal' | 'warning' | 'danger' } {
  if (!reason) return { label: 'Unknown', labelBn: 'অজানা', severity: 'normal' };
  
  const reasonMap: Record<string, { label: string; labelBn: string; severity: 'normal' | 'warning' | 'danger' }> = {
    'POWER_ON': { label: 'Power On', labelBn: 'পাওয়ার অন', severity: 'normal' },
    'POWER_EVENT': { label: 'Power Event', labelBn: 'পাওয়ার ইভেন্ট', severity: 'warning' },
    'SW_RESET': { label: 'Software Reset', labelBn: 'সফটওয়্যার রিসেট', severity: 'normal' },
    'SOFTWARE': { label: 'Software Reset', labelBn: 'সফটওয়্যার রিসেট', severity: 'normal' },
    'BROWNOUT': { label: 'Brownout', labelBn: 'ব্রাউনআউট (পাওয়ার দুর্বল)', severity: 'danger' },
    'PANIC': { label: 'Panic Crash', labelBn: 'প্যানিক ক্র্যাশ', severity: 'danger' },
    'WDT': { label: 'Watchdog', labelBn: 'ওয়াচডগ', severity: 'warning' },
    'WATCHDOG': { label: 'Watchdog Reset', labelBn: 'ওয়াচডগ রিসেট', severity: 'warning' },
    'TASK_WDT': { label: 'Task Watchdog', labelBn: 'টাস্ক ওয়াচডগ', severity: 'warning' },
    'INT_WDT': { label: 'Int Watchdog', labelBn: 'ইন্ট ওয়াচডগ', severity: 'warning' },
    'DEEPSLEEP': { label: 'Deep Sleep', labelBn: 'ডিপ স্লিপ', severity: 'normal' },
    'EXTERNAL': { label: 'External Reset', labelBn: 'এক্সটারনাল রিসেট', severity: 'normal' },
    'UNKNOWN': { label: 'Unknown', labelBn: 'অজানা', severity: 'normal' },
  };
  
  return reasonMap[reason] || { label: reason, labelBn: reason, severity: 'normal' };
}

// Helper to get OTA status label
export function getOTAStatusLabel(status: string | null): { label: string; labelBn: string } {
  if (!status) return { label: '-', labelBn: '-' };
  
  const statusMap: Record<string, { label: string; labelBn: string }> = {
    'idle': { label: 'Up to date', labelBn: 'আপ টু ডেট' },
    'available': { label: 'Update Available', labelBn: 'আপডেট আছে' },
    'downloading': { label: 'Downloading...', labelBn: 'ডাউনলোড হচ্ছে...' },
    'complete': { label: 'Completed', labelBn: 'সম্পন্ন' },
    'failed': { label: 'Failed', labelBn: 'ব্যর্থ' },
  };
  
  return statusMap[status] || { label: status, labelBn: status };
}

// Helper to check if device is offline
export function isDeviceOffline(lastSeenAt: string | null, thresholdMinutes: number = 5): boolean {
  if (!lastSeenAt) return true;
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  return diffMs > thresholdMinutes * 60 * 1000;
}
