import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

type CommandType = 'fan' | 'light' | 'alarm' | 'heater' | 'manual_override' | 'circulation_fan' | 'fogger';

interface SendCommandParams {
  commandType: CommandType;
  commandValue: boolean;
  deviceName?: string;
}

/**
 * Hook for sending instant device commands to ESP32
 * Commands are stored in device_commands table and ESP32 polls every 5 seconds
 * This provides near-real-time control (max 5 second delay)
 */
export function useSendDeviceCommand() {
  const { user, language } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commandType, commandValue, deviceName = 'Shed A' }: SendCommandParams) => {
      if (!user) throw new Error('Not authenticated');

      // Insert command into device_commands table
      // IMPORTANT: device_name must match ESP32's SHED_NAME constant
      const { error } = await supabase
        .from('device_commands')
        .insert({
          user_id: user.id,
          device_name: deviceName,
          command_type: commandType,
          command_value: commandValue,
          executed: false,
        });

      if (error) throw error;

      // Also update device_status for immediate UI feedback
      const statusUpdate: Record<string, boolean> = {};
      switch (commandType) {
        case 'fan':
          statusUpdate.fan_on = commandValue;
          break;
        case 'light':
          statusUpdate.light_on = commandValue;
          break;
        case 'alarm':
          statusUpdate.alarm_on = commandValue;
          break;
        case 'heater':
          statusUpdate.heater_on = commandValue;
          break;
        case 'manual_override':
          statusUpdate.manual_override = commandValue;
          break;
        case 'circulation_fan':
          statusUpdate.circulation_fan_on = commandValue;
          break;
        case 'fogger':
          statusUpdate.fogger_on = commandValue;
          break;
      }

      if (Object.keys(statusUpdate).length > 0) {
        await supabase
          .from('device_status')
          .update(statusUpdate)
          .eq('user_id', user.id);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['device_status'] });
      queryClient.invalidateQueries({ queryKey: ['device_commands'] });
      
      const commandNames: Record<CommandType, { en: string; bn: string }> = {
        fan: { en: 'Fan', bn: 'ফ্যান' },
        light: { en: 'Light', bn: 'লাইট' },
        alarm: { en: 'Alarm', bn: 'অ্যালার্ম' },
        heater: { en: 'Heater', bn: 'হিটার' },
        manual_override: { en: 'Manual Override', bn: 'ম্যানুয়াল ওভাররাইড' },
        circulation_fan: { en: 'Circulation Fan', bn: 'সার্কুলেশন ফ্যান' },
        fogger: { en: 'Fogger', bn: 'ফগার' },
      };

      const name = commandNames[variables.commandType];
      const state = variables.commandValue;
      
      toast.success(
        language === 'bn'
          ? `📡 ${name.bn} ${state ? 'চালু' : 'বন্ধ'} কমান্ড পাঠানো হয়েছে`
          : `📡 ${name.en} ${state ? 'ON' : 'OFF'} command sent`
      );
    },
    onError: (error) => {
      console.error('Failed to send command:', error);
      toast.error(
        language === 'bn'
          ? 'কমান্ড পাঠাতে ব্যর্থ'
          : 'Failed to send command'
      );
    },
  });
}
