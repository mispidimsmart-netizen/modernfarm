import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { toast } from 'sonner';

type CommandType = 'fan' | 'light' | 'alarm' | 'heater' | 'manual_override' | 'stop_automation' | 'circulation_fan' | 'fogger';

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
  const { selectedFarmId } = useFarmContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commandType, commandValue, deviceName = 'Shed A' }: SendCommandParams) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('device_commands')
        .insert({
          user_id: user.id,
          device_name: deviceName,
          command_type: commandType,
          command_value: commandValue,
          executed: false,
          farm_id: selectedFarmId,
        });

      if (error) throw error;

      // Update desired_state columns only (cloud never sets actual state)
      // ESP32 is the single source of truth for actual_state
      const desiredUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      switch (commandType) {
        case 'fan':
          desiredUpdate.desired_fan_on = commandValue;
          break;
        case 'light':
          desiredUpdate.desired_light_on = commandValue;
          break;
        case 'alarm':
          desiredUpdate.desired_alarm_on = commandValue;
          break;
        case 'heater':
          desiredUpdate.desired_heater_on = commandValue;
          break;
        case 'manual_override':
        case 'stop_automation':
          desiredUpdate.desired_manual_override = commandValue;
          break;
        case 'circulation_fan':
          desiredUpdate.desired_circulation_fan_on = commandValue;
          break;
        case 'fogger':
          desiredUpdate.desired_fogger_on = commandValue;
          break;
      }

      if (Object.keys(desiredUpdate).length > 1) {
        await supabase
          .from('device_status')
          .update(desiredUpdate)
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
        stop_automation: { en: 'Stop Automation', bn: 'অটোমেশন বন্ধ' },
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
