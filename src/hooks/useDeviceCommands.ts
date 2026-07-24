import { useEffect } from 'react';
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

// Module-level reference to the active mutate fn so failure-toast "Retry"
// buttons (closures) can re-issue without prop-drilling. Set in useEffect
// below by whichever component mounted the hook first/last.
let _activeMutate: ((p: SendCommandParams) => void) | null = null;
export function retryLastCommand(p: SendCommandParams) {
  _activeMutate?.(p);
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

  const mutation = useMutation({
    mutationFn: async ({ commandType, commandValue, deviceName = 'Shed A', shedId }: SendCommandParams) => {
      if (!user) throw new Error('Not authenticated');
      // Hard guard: farm_id MUST be a non-empty UUID. Without a valid farm_id
      // the RLS policy on device_commands will silently reject the insert and
      // the farmer only sees "কমান্ড পাঠাতে ব্যর্থ". Block here instead.
      const farmId = typeof selectedFarmId === 'string' ? selectedFarmId.trim() : '';
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!farmId || !uuidRe.test(farmId)) {
        throw new Error('NO_FARM_SELECTED');
      }


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

        query = query.eq('farm_id', selectedFarmId);

        if (shedId) {
          query = query.eq('shed_id', shedId);
        }

        await query;
      }

      // Log this command in device_command_log as 'pending' so EVERY command
      // appears in the in-app history (success + failure).
      const commandId = cmdRow?.id as string | undefined;
      try {
        await supabase.from('device_command_log').insert({
          user_id: user.id,
          farm_id: selectedFarmId ?? null,
          shed_id: shedId ?? null,
          command_id: commandId ?? `client-${Date.now()}`,
          device_name: deviceName,
          command_type: commandType,
          command_value: commandValue,
          status: 'pending',
          source: 'app',
          sent_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn('[useDeviceCommands] failed to log pending command', logErr);
      }

      return { commandId, ackActualCol, shedId };
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
          // Mark the pending log row as acked
          if (commandId) {
            try {
              await supabase
                .from('device_command_log')
                .update({ status: 'acked', acked_at: new Date().toISOString() })
                .eq('command_id', commandId);
              queryClient.invalidateQueries({ queryKey: ['device-command-log'] });
            } catch (e) {
              console.warn('[useDeviceCommands] failed to mark acked', e);
            }
          }
          queryClient.invalidateQueries({ queryKey: ['device_status'] });
          return;
        }

        if (Date.now() - startedAt < timeoutMs) {
          setTimeout(poll, pollMs);
        } else {
          // Distinguish: offline device vs safety lock vs generic no-ack
          let isOffline = false;
          let safetyLocked = false;
          try {
            let hq: any = supabase
              .from('device_health')
              .select('is_online,last_seen_at')
              .eq('user_id', user.id);
            if (selectedFarmId) hq = hq.eq('farm_id', selectedFarmId);
            const { data: dh } = await hq
              .order('last_seen_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (dh) {
              const lastSeen = dh.last_seen_at ? new Date(dh.last_seen_at).getTime() : 0;
              const stale = Date.now() - lastSeen > 90 * 1000; // >90s = offline
              isOffline = dh.is_online === false || stale;
            } else {
              isOffline = true;
            }

            if (!isOffline) {
              let sq: any = supabase
                .from('device_status')
                .select('safety_override,safety_override_reason')
                .eq('user_id', user.id);
              if (selectedFarmId) sq = sq.eq('farm_id', selectedFarmId);
              if (variables.shedId) sq = sq.eq('shed_id', variables.shedId);
              const { data: ss } = await sq
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (ss?.safety_override) safetyLocked = true;
            }
          } catch {
            // ignore — fallback to generic message
          }

          // Log failure to device_command_log so it shows up in the in-app history.
          const failureStatus = isOffline ? 'expired' : 'failed';
          const errMsg = isOffline
            ? 'Device offline — command not delivered (no ack within 12s)'
            : safetyLocked
              ? 'Blocked by Safety Engine'
              : 'No device acknowledgement within 12s';
          try {
            const updatePayload: Record<string, any> = {
              status: failureStatus,
              error_message: errMsg,
              expired_at: isOffline ? new Date().toISOString() : null,
            };
            if (commandId) {
              const { data: updated } = await supabase
                .from('device_command_log')
                .update(updatePayload)
                .eq('command_id', commandId)
                .select('id');
              // Fallback: if no pending row was found, insert one.
              if (!updated || updated.length === 0) {
                await supabase.from('device_command_log').insert({
                  user_id: user.id,
                  farm_id: selectedFarmId ?? null,
                  shed_id: variables.shedId ?? null,
                  command_id: commandId,
                  device_name: variables.deviceName ?? 'Shed A',
                  command_type: variables.commandType,
                  command_value: variables.commandValue,
                  source: 'app',
                  ...updatePayload,
                });
              }
            }
            queryClient.invalidateQueries({ queryKey: ['device-command-log'] });
          } catch (logErr) {
            console.warn('[useDeviceCommands] failed to log command failure', logErr);
          }

          const retryAction = {
            label: isBn ? 'আবার চেষ্টা' : 'Retry',
            onClick: () => retryLastCommand(variables),
          };

          if (isOffline) {
            toast.error(
              isBn
                ? `📡 ${name.bn}: ডিভাইস অফলাইন — কমান্ড পৌঁছায়নি। WiFi/পাওয়ার চেক করুন।`
                : `📡 ${name.en}: device offline — command not delivered. Check WiFi/power.`,
              { id: ackToastId, duration: 10000, action: retryAction }
            );
          } else if (safetyLocked) {
            // No retry — Safety Engine will block again until condition clears.
            toast.warning(
              isBn
                ? `🛡️ ${name.bn}: সেফটি ইঞ্জিন কমান্ড ব্লক করেছে (নিরাপত্তার জন্য)।`
                : `🛡️ ${name.en}: blocked by Safety Engine for protection.`,
              { id: ackToastId, duration: 10000 }
            );
          } else {
            toast.warning(
              isBn
                ? `⚠️ ${name.bn}: ডিভাইস থেকে নিশ্চিতকরণ আসেনি, আবার চেষ্টা করুন।`
                : `⚠️ ${name.en}: no device acknowledgement, please retry.`,
              { id: ackToastId, duration: 8000, action: retryAction }
            );
          }
        }
      };

      setTimeout(poll, 2000);
    },
    onError: (error) => {
      console.error('Failed to send command:', error);
      const message = error instanceof Error && error.message === 'NO_FARM_SELECTED'
        ? (language === 'bn'
          ? 'প্রথমে একটি ফার্ম নির্বাচন করুন'
          : 'Select a farm first')
        : (language === 'bn'
          ? 'কমান্ড পাঠাতে ব্যর্থ'
          : 'Failed to send command');
      toast.error(
        message
      );
    },
  });

  // Expose latest mutate to module-level singleton so failure-toast Retry buttons work.
  useEffect(() => {
    _activeMutate = mutation.mutate;
    return () => {
      if (_activeMutate === mutation.mutate) _activeMutate = null;
    };
  }, [mutation.mutate]);

  return mutation;
}
