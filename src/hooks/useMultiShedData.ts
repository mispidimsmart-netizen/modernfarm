import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useSheds } from './useSheds';
import { useAllDeviceHealth, DeviceHealth } from './useDeviceHealth';

export interface ShedOverview {
  id: string;
  name: string;
  name_en: string;
  is_active: boolean;
  // Latest sensor readings
  temperature: number | null;
  humidity: number | null;
  ammonia: number | null;
  waterUsage: number | null;
  lastReading: string | null;
  // Calculated HSI (Heat Stress Index)
  hsi: number | null;
  hsiLevel: 'normal' | 'mild' | 'moderate' | 'severe' | 'emergency';
  // Device status
  isOnline: boolean;
  mode: 'AUTO' | 'MANUAL' | 'FAIL_SAFE' | 'OFFLINE';
  failsafeMode: boolean;
  lastSyncAt: string | null;
}

// Calculate HSI level based on value
function getHSILevel(hsi: number | null): ShedOverview['hsiLevel'] {
  if (hsi === null) return 'normal';
  if (hsi >= 85) return 'emergency';
  if (hsi >= 80) return 'severe';
  if (hsi >= 75) return 'moderate';
  if (hsi >= 70) return 'mild';
  return 'normal';
}

// Get the primary device for a shed (most recently seen)
function getPrimaryDeviceForShed(devices: DeviceHealth[], shedId: string): DeviceHealth | null {
  const shedDevices = devices.filter(d => d.shed_id === shedId);
  if (shedDevices.length === 0) return null;
  
  return shedDevices.reduce((latest, device) => {
    if (!latest.last_seen_at) return device;
    if (!device.last_seen_at) return latest;
    return new Date(device.last_seen_at) > new Date(latest.last_seen_at) ? device : latest;
  });
}

// Fetch latest sensor readings per shed
export function useMultiShedData() {
  const { user } = useAuth();
  const { data: sheds } = useSheds();
  const { data: allDeviceHealth } = useAllDeviceHealth();
  
  return useQuery({
    queryKey: ['multi-shed-overview', user?.id, sheds?.length],
    queryFn: async (): Promise<ShedOverview[]> => {
      if (!user || !sheds || sheds.length === 0) return [];
      
      const shedIds = sheds.map(s => s.id);
      
      // Fetch latest sensor readings for all sheds
      // Get the most recent reading per shed using a subquery approach
      const { data: readings, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('user_id', user.id)
        .in('shed_id', shedIds)
        .order('recorded_at', { ascending: false })
        .limit(100); // Get recent readings to find latest per shed
      
      if (error) throw error;
      
      // Group readings by shed and get latest
      const latestByShed: Record<string, typeof readings[0]> = {};
      for (const reading of readings || []) {
        if (reading.shed_id && !latestByShed[reading.shed_id]) {
          latestByShed[reading.shed_id] = reading;
        }
      }
      
      // Build shed overviews
      return sheds.map(shed => {
        const reading = latestByShed[shed.id];
        const device = allDeviceHealth ? getPrimaryDeviceForShed(allDeviceHealth, shed.id) : null;
        
        // Calculate HSI if we have readings
        const hsi = reading 
          ? Number(reading.temperature) + (Number(reading.humidity) * 0.1)
          : null;
        
        // Determine mode based on device health
        let mode: ShedOverview['mode'] = 'OFFLINE';
        if (device) {
          if (!device.is_online) {
            mode = 'OFFLINE';
          } else if (device.failsafe_mode) {
            mode = 'FAIL_SAFE';
          } else {
            mode = 'AUTO'; // Could check manual_override from device_status
          }
        }
        
        return {
          id: shed.id,
          name: shed.name,
          name_en: shed.name_en,
          is_active: shed.is_active,
          temperature: reading ? Number(reading.temperature) : null,
          humidity: reading ? Number(reading.humidity) : null,
          ammonia: reading ? Number(reading.ammonia) : null,
          waterUsage: reading ? Number(reading.water_usage) : null,
          lastReading: reading?.recorded_at || null,
          hsi,
          hsiLevel: getHSILevel(hsi),
          isOnline: device?.is_online ?? false,
          mode,
          failsafeMode: device?.failsafe_mode ?? false,
          lastSyncAt: device?.last_cloud_sync_at || null,
        };
      });
    },
    enabled: !!user && !!sheds && sheds.length > 0,
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}

// Get HSI color class based on level
export function getHSIColorClass(level: ShedOverview['hsiLevel']): string {
  switch (level) {
    case 'emergency':
      return 'bg-red-500';
    case 'severe':
      return 'bg-orange-500';
    case 'moderate':
      return 'bg-amber-500';
    case 'mild':
      return 'bg-yellow-400';
    default:
      return 'bg-status-normal';
  }
}

// Get HSI emoji based on level
export function getHSIEmoji(level: ShedOverview['hsiLevel']): string {
  switch (level) {
    case 'emergency':
    case 'severe':
      return '🔴';
    case 'moderate':
    case 'mild':
      return '🟡';
    default:
      return '🟢';
  }
}

// Get mode badge color
export function getModeColorClass(mode: ShedOverview['mode']): string {
  switch (mode) {
    case 'AUTO':
      return 'bg-primary/10 text-primary';
    case 'MANUAL':
      return 'bg-secondary/10 text-secondary';
    case 'FAIL_SAFE':
      return 'bg-amber-500/10 text-amber-600';
    case 'OFFLINE':
      return 'bg-muted text-muted-foreground';
  }
}
