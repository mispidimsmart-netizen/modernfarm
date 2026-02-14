import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FirmwareEntry {
  id: string;
  version: string;
  version_code: number;
  release_channel: 'stable' | 'beta' | 'canary';
  min_hardware: {
    board_types: string[];
    min_relay_count: number;
    required_features: string[];
  };
  max_hardware: Record<string, unknown>;
  compatibility_matrix: unknown[];
  changelog: string | null;
  changelog_bn: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
  crc32_checksum: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

interface DeviceHardwareProfile {
  id: string;
  device_token_id: string;
  farm_id: string | null;
  board_type: string;
  relay_count: number;
  features: string[];
  gpio_map: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
  device_board: string;
  device_relays: number;
  device_features: string[];
  firmware_version: string;
  firmware_channel: string;
}

export function useFirmwareRegistry() {
  const queryClient = useQueryClient();

  const firmwareListQuery = useQuery({
    queryKey: ['firmware-registry'],
    queryFn: async (): Promise<FirmwareEntry[]> => {
      const { data, error } = await supabase
        .from('firmware_registry')
        .select('*')
        .order('version_code', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FirmwareEntry[];
    },
  });

  const deviceProfilesQuery = useQuery({
    queryKey: ['device-hardware-profiles'],
    queryFn: async (): Promise<DeviceHardwareProfile[]> => {
      const { data, error } = await supabase
        .from('device_hardware_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DeviceHardwareProfile[];
    },
  });

  const checkCompatibility = useMutation({
    mutationFn: async ({ deviceTokenId, firmwareId }: { deviceTokenId: string; firmwareId: string }): Promise<CompatibilityResult> => {
      const { data, error } = await supabase
        .rpc('check_firmware_compatibility', {
          _device_token_id: deviceTokenId,
          _firmware_id: firmwareId,
        });
      if (error) throw error;
      return data as unknown as CompatibilityResult;
    },
  });

  const addFirmware = useMutation({
    mutationFn: async (firmware: Partial<FirmwareEntry>) => {
      const { data, error } = await supabase
        .from('firmware_registry')
        .insert(firmware as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmware-registry'] });
      toast.success('Firmware added to registry');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add firmware: ${error.message}`);
    },
  });

  const toggleFirmwareActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('firmware_registry')
        .update({ is_active } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmware-registry'] });
    },
  });

  return {
    firmwares: firmwareListQuery.data || [],
    firmwaresLoading: firmwareListQuery.isLoading,
    deviceProfiles: deviceProfilesQuery.data || [],
    profilesLoading: deviceProfilesQuery.isLoading,
    checkCompatibility,
    addFirmware,
    toggleFirmwareActive,
  };
}
