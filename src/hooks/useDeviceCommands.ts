import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { toast } from 'sonner';

type CommandType = 'fan' | 'light' | 'alarm' | 'heater' | 'manual_override' | 'stop_automation' | 'circulation_fan' | 'fogger' | 'ceiling_fan' | 'sprinkler';

interface SendCommandParams {
  commandType: CommandType;
  commandValue: boolean;
  deviceName?: string;
  shedId?: string;
}

/**
 * Hook for sending instant device commands to ESP32
 * Commands are stored in device_commands table (Realtime-enabled).
 * ESP32 polls every 1 second + Supabase Realtime broadcasts changes via WebSocket.
 * Effective latency: ~500ms – 1.5s (down from 5s).
 */
export function useSendDeviceCommand() {
  const { user, language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commandType, commandValue, deviceName = 'Shed A', shedId }: SendCommandParams) => {
      if (!user) throw new Error('Not authenticated');

      const { data: cmdRow, error } = await supabase
        .from('device_commands')
        .insert({
          user_id: user.id,
          device_name: deviceName,
          command_type: commandType,
          command_value: commandValue,
          executed: false,
          farm_id: selectedFarmId,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update desired_state columns only (cloud never sets actual state)
      const desiredUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      // Map command → actual_col for ack-verification
      const ackActualCol: Partial<Record<CommandType, string>> = {
        fan: 'fan_on',
        light: 'light_on',
        alarm: 'alarm_on',
        heater: 'heater_on',
        circulation_fan: 'circulation_fan_on',
        fogger: 'fogger_on',
        ceiling_fan: 'ceiling_fan_on',
        sprinkler: 'sprinkler_on',
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
          if (!commandValue) {
            desiredUpdate.desired_fan_on = null;
            desiredUpdate.desired_light_on = null;
            desiredUpdate.desired_alarm_on = null;
            desiredUpdate.desired_heater_on = null;
            desiredUpdate.desired_circulation_fan_on = null;
            desiredUpdate.desired_fogger_on = null;
            desiredUpdate.desired_ceiling_fan_on = null;
            desiredUpdate.desired_sprinkler_on = null;
            desiredUpdate.desired_fan_speed = null;
          }
          break;
        case 'circulation_fan':
          desiredUpdate.desired_circulation_fan_on = commandValue;
          break;
        case 'fogger':
          desiredUpdate.desired_fogger_on = commandValue;
          break;
        case 'ceiling_fan':
          desiredUpdate.desired_ceiling_fan_on = commandValue;
          break;
        case 'sprinkler':
          desiredUpdate.desired_sprinkler_on = commandValue;
          break;
      }

      if (Object.keys(desiredUpdate).length > 1) {
        let query = supabase
          .from('device_status')
          .update(desiredUpdate)
          .eq('user_id', user.id);

        if (selectedFarmId) {
          query = query.eq('farm_id', selectedFarmId);
        }

        if (shedId) {
          query = query.eq('shed_id', shedId);
        }

        await query;
      }

      return { commandId: cmdRow?.id as string | undefined, ackActualCol, shedId };
    },
    onSuccess: (result, variables) => {
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
        ceiling_fan: { en: 'Ceiling Fan', bn: 'সিলিং ফ্যান' },
        sprinkler: { en: 'Roof Sprinkler', bn: 'ছাদ স্প্রিংকলার' },
      };

      const name = commandNames[variables.commandType];
      const state = variables.commandValue;
      const isBn = language === 'bn';

      toast.success(
        isBn
          ? `📡 ${name.bn} ${state ? 'চালু' : 'বন্ধ'} কমান্ড পাঠানো হয়েছে`
          : `📡 ${name.en} ${state ? 'ON' : 'OFF'} command sent`
      );

      // === ACK / READ-BACK VERIFICATION ===
      // After sending, poll device_status until ESP32 reports matching actual_state
      // OR the command row is marked executed=true. If neither happens within ~12s,
      // warn the farmer (relay stuck, ESP32 offline, safety override, etc.)
      const actualCol = result?.ackActualCol?.[variables.commandType];
      const commandId = result?.commandId;
      if (!actualCol || !user) return;

      const ackToastId = `ack-${variables.commandType}-${state}`;
      const startedAt = Date.now();
      const timeoutMs = 12000;
      const pollMs = 1500;
      let cancelled = false;

      const poll = async () => {
        if (cancelled) return;

        let executed = false;
        if (commandId) {
          const { data: cmd } = await supabase
            .from('device_commands')
            .select('executed')
            .eq('id', commandId)
            .maybeSingle();
          executed = !!cmd?.executed;
        }

        let actual: boolean | null = null;
        let q: any = supabase.from('device_status').select(actualCol).eq('user_id', user.id);
        if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
        if (variables.shedId) q = q.eq('shed_id', variables.shedId);
        const { data: ds } = await q.order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (ds && (ds as any)[actualCol] !== undefined && (ds as any)[actualCol] !== null) {
          actual = !!(ds as any)[actualCol];
        }

        if (actual === state || executed) {
          toast.success(
            isBn
              ? `✅ ${name.bn} ${state ? 'চালু' : 'বন্ধ'} নিশ্চিত হয়েছে`
              : `✅ ${name.en} ${state ? 'ON' : 'OFF'} confirmed by device`,
            { id: ackToastId }
          );
          queryClient.invalidateQueries({ queryKey: ['device_status'] });
          return;
        }

        if (Date.now() - startedAt < timeoutMs) {
          setTimeout(poll, pollMs);
        } else {
          toast.warning(
            isBn
              ? `⚠️ ${name.bn}: ডিভাইস থেকে নিশ্চিতকরণ আসেনি। অফলাইন বা সেফটি লক হতে পারে।`
              : `⚠️ ${name.en}: no device acknowledgement. Device may be offline or safety-locked.`,
            { id: ackToastId, duration: 8000 }
          );
        }
      };

      setTimeout(poll, 2000);
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
