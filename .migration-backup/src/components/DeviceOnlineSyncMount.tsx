import { useDeviceOnlineSync } from '@/hooks/useDeviceOnlineSync';

/**
 * Headless mount for the device-online sync loop. Renders nothing.
 * Must be placed inside AuthProvider + FarmProvider.
 */
export function DeviceOnlineSyncMount() {
  useDeviceOnlineSync();
  return null;
}
