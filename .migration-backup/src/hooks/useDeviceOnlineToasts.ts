import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeDeviceStatus } from './useRealtimeSensorData';

/**
 * Watches ESP32 online/offline transitions and surfaces a single toast
 * each time the state flips. Avoids spam by:
 *   - Skipping the very first render (no toast on app load)
 *   - Tracking the previous status in a ref
 *   - Using a stable toast id so duplicates collapse
 */
export function useDeviceOnlineToasts() {
  const { user, language } = useAuth();
  const { isDeviceOnline, isLoading } = useRealtimeDeviceStatus();
  const prevOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!user || isLoading) return;

    const prev = prevOnlineRef.current;

    // First observation after mount — just record, don't toast.
    if (prev === null) {
      prevOnlineRef.current = isDeviceOnline;
      return;
    }

    if (prev === isDeviceOnline) return;

    if (!isDeviceOnline) {
      toast.error(
        language === 'bn' ? '📡 ESP32 অফলাইন' : '📡 ESP32 offline',
        {
          id: 'esp32-status',
          description:
            language === 'bn'
              ? 'কন্ট্রোলারের সাথে সংযোগ নেই — রিলে অবস্থা যাচাই করা যাচ্ছে না'
              : 'No connection to controller — relay state cannot be verified',
          duration: 8000,
        }
      );
    } else {
      toast.success(
        language === 'bn' ? '✅ ESP32 আবার অনলাইন' : '✅ ESP32 back online',
        {
          id: 'esp32-status',
          description:
            language === 'bn'
              ? 'লাইভ ডেটা আবার আসছে'
              : 'Live data resumed',
          duration: 5000,
        }
      );
    }

    prevOnlineRef.current = isDeviceOnline;
  }, [isDeviceOnline, isLoading, user, language]);
}
