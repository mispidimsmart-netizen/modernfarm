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
  deviceTokenId?: string;
  clientRequestId?: string;
}

function createClientRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const hex = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
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
    mutationFn: async ({ commandType, commandValue, deviceName = 'Shed A', shedId, deviceTokenId, clientRequestId }: SendCommandParams) => {
      if (!user) throw new Error('Not authenticated');
      // Hard guard: farm_id MUST be a non-empty UUID. Without a valid farm_id
      // the RLS policy on device_commands will silently reject the insert and
      // the farmer only sees "কমান্ড পাঠাতে ব্যর্থ". Block here instead.
      const farmId = typeof selectedFarmId === 'string' ? selectedFarmId.trim() : '';
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!farmId || !uuidRe.test(farmId)) {
        throw new Error('NO_FARM_SELECTED');
      }
      const stableRequestId = clientRequestId ?? createClientRequestId();
      if (!uuidRe.test(stableRequestId)) {
        throw new Error('INVALID_CLIENT_REQUEST_ID');
      }
      let resolvedDeviceTokenId = deviceTokenId ?? null;
      // Resolve the device binding once while online. The server verifies it
      // again; this only lets retries/offline queues carry an explicit target.
      if (!resolvedDeviceTokenId && typeof navigator !== 'undefined' && navigator.onLine) {
        let tokenQuery: any = supabase
          .from('device_tokens')
          .select('id')
          .eq('farm_id', farmId)
          .eq('is_active', true)
          .limit(2);
        if (shedId) tokenQuery = tokenQuery.eq('shed_id', shedId);
        const { data: tokenRows, error: tokenError } = await tokenQuery;
        if (tokenError) throw tokenError;
        if (!tokenRows || tokenRows.length !== 1) {
          throw new Error('DEVICE_BINDING_REQUIRED');
        }
        resolvedDeviceTokenId = tokenRows[0].id;
      }

      // ===== OFFLINE PATH =====
      // If the browser is offline we cannot reach the cloud at all — queue the
      // command insert to localStorage and let useOfflineSync drain it when the
      // network returns. We deliberately skip the desired_* status update and
      // ACK polling (both need live cloud access); replay handles the insert
      // and the ESP32 will pick it up from device_commands as normal.
      // Short TTL (60 min) so a stale ON/OFF doesn't fire hours later.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const { queueInsert } = await import('@/lib/offlineQueue');
        queueInsert('device_commands', {
          user_id: user.id,
          device_name: deviceName,
          command_type: commandType,
          command_value: commandValue,
          executed: false,
          farm_id: farmId,
          shed_id: shedId ?? null,
          device_token_id: resolvedDeviceTokenId,
          client_request_id: stableRequestId,
        }, { maxAgeMinutes: 10 });
        return { queued: true, queuedReason: 'browser_offline', clientRequestId: stableRequestId } as any;
      }

      // ===== DEVICE-OFFLINE PATH =====
      // Browser is online but ESP32 is offline. Queue the command in a
      // separate device-command queue so `useDeviceOnlineSync` can replay it
      // the moment the ESP32 comes back online. Prevents "expired" toasts and
      // lost intent while WiFi/power is being restored.
      try {
        const hq: any = supabase
          .from('device_health')
          .select('is_online,last_seen_at')
          .eq('farm_id', farmId);
        const { data: dh } = await hq
          .order('last_seen_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastSeen = dh?.last_seen_at ? new Date(dh.last_seen_at).getTime() : 0;
        const stale = Date.now() - lastSeen > 90 * 1000;
        const deviceOffline = dh ? (dh.is_online === false || stale) : true;
        if (deviceOffline) {
          const { enqueueDeviceCommand } = await import('@/lib/deviceCommandQueue');
          enqueueDeviceCommand({
            user_id: user.id,
            farm_id: farmId,
            shed_id: shedId ?? null,
            device_token_id: resolvedDeviceTokenId,
            device_name: deviceName,
            command_type: commandType,
            command_value: commandValue,
            client_request_id: stableRequestId,
          });
          return { queued: true, queuedReason: 'device_offline', clientRequestId: stableRequestId } as any;
        }
      } catch (e) {
        // If we cannot determine online status, fall through to normal send.
        console.warn('[useDeviceCommands] device-offline check failed', e);
      }

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
      // The RPC resolves the authoritative device binding and applies desired
      // state in one transaction. The legacy deviceName is never trusted.
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
        'queue_v8_actuator_command',
        {
          p_farm_id: farmId,
          p_shed_id: shedId ?? null,
          p_device_token_id: resolvedDeviceTokenId,
          p_command_type: commandType,
          p_command_value: commandValue,
          p_client_request_id: stableRequestId,
        },
      );
      if (rpcError) throw rpcError;
      if (!rpcData?.command_id) throw new Error('COMMAND_QUEUE_FAILED');

      return {
        commandId: rpcData.command_id as string,
        clientRequestId: stableRequestId,
        ackActualCol,
        shedId: rpcData.shed_id ?? shedId,
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['device_status'] });
      queryClient.invalidateQueries({ queryKey: ['device_commands'] });

      // Offline: command was queued to localStorage — skip ACK polling and
      // show a clear "queued" toast instead of a false confirmation.
      if ((result as any)?.queued) {
        const reason = (result as any)?.queuedReason as
          | 'browser_offline'
          | 'device_offline'
          | undefined;
        const isDeviceOffline = reason === 'device_offline';
        toast(
          isDeviceOffline
            ? language === 'bn'
              ? '📡 ডিভাইস অফলাইন — কমান্ড কিউতে সংরক্ষিত'
              : '📡 Device offline — command queued'
            : language === 'bn'
              ? '📴 অফলাইনে সংরক্ষিত'
              : '📴 Saved offline',
          {
            description: isDeviceOffline
              ? language === 'bn'
                ? 'ESP32 অনলাইন হলে স্বয়ংক্রিয়ভাবে পাঠানো হবে'
                : 'Will auto-send when ESP32 comes back online'
              : language === 'bn'
                ? 'নেট এলে কমান্ড পাঠানো হবে'
                : 'Command will be sent when online',
          },
        );
        return;
      }



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

      // === ACK / READ-BACK VERIFICATION ===
      // After sending, poll device_status until ESP32 reports matching actual_state
      // OR the command row is marked executed=true. If neither happens within ~30s,
      // warn the farmer (relay stuck, ESP32 offline, safety override, etc.)
      const actualCol = result?.ackActualCol?.[variables.commandType];
      const commandId = result?.commandId;
      const resolvedShedId = result?.shedId ?? variables.shedId;
      if (!actualCol || !user) return;

      const ackToastId = `ack-${variables.commandType}-${state}`;
      const startedAt = Date.now();
      // The ESP32 polls device_commands on its own cadence; measured live
      // execution delays reach ~20s. A 12s window falsely logged executed
      // commands as "failed"/"expired", so allow 30s before reporting failure.
      const timeoutMs = 30000;
      const pollMs = 1500;
      const poll = async () => {
        try {
          await pollOnce();
        } catch (pollErr) {
          // A transient network/query error must not silently end verification:
          // keep polling until the timeout, then fall through to the failure path.
          console.warn('[useDeviceCommands] ack poll error', pollErr);
          if (Date.now() - startedAt < timeoutMs) setTimeout(poll, pollMs);
          else await reportAckFailure();
        }
      };

      const pollOnce = async () => {
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
        let actualUpdatedAt: number | null = null;
        let q: any = supabase
          .from('device_status')
          .select(`${actualCol},updated_at`);
        if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
        else q = q.eq('user_id', user.id);
        if (resolvedShedId) q = q.eq('shed_id', resolvedShedId);
        const { data: ds } = await q.order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (ds && (ds as any)[actualCol] !== undefined && (ds as any)[actualCol] !== null) {
          actual = !!(ds as any)[actualCol];
          const ts = (ds as any).updated_at;
          actualUpdatedAt = ts ? new Date(ts).getTime() : null;
        }

        // Check ESP32 online status — never confirm success while device is offline,
        // even if the "actual" column happens to already match (stale/pre-offline value).
        let isOnline = false;
        try {
          let hq: any = supabase
            .from('device_health')
            .select('is_online');
          if (selectedFarmId) hq = hq.eq('farm_id', selectedFarmId);
          else hq = hq.eq('user_id', user.id);
          const { data: dh } = await hq.order('last_seen_at', { ascending: false }).limit(1).maybeSingle();
          isOnline = !!dh?.is_online;
        } catch { /* health lookup is best-effort */ }

        // Only accept actual-match if it was updated AFTER we sent the command
        // (prevents false "confirmed" toast when device is offline and column is stale).
        const freshActualMatch =
          actual === state &&
          isOnline &&
          actualUpdatedAt !== null &&
          actualUpdatedAt >= startedAt - 500;

        if (executed || freshActualMatch) {
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
          await reportAckFailure();
        }
      };

      const reportAckFailure = async () => {
        {
          // Distinguish: offline device vs safety lock vs generic no-ack
          let isOffline = false;
          let safetyLocked = false;
          try {
            let hq: any = supabase
              .from('device_health')
              .select('is_online,last_seen_at');
            if (selectedFarmId) hq = hq.eq('farm_id', selectedFarmId);
            else hq = hq.eq('user_id', user.id);
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
              // Respect the Settings → Smart Safety Engine toggle. When the
              // farmer has turned the engine OFF, do NOT surface "blocked by
              // Safety Engine" (would be misleading in both AUTO and MANUAL
              // modes). We still fall through to the generic no-ack toast.
              let engineEnabled = true;
              if (selectedFarmId) {
                const { data: fs } = await supabase
                  .from('farm_settings')
                  .select('safety_engine_enabled')
                  .eq('farm_id', selectedFarmId)
                  .maybeSingle();
                if (fs && (fs as any).safety_engine_enabled === false) engineEnabled = false;
              }
              if (engineEnabled) {
                let sq: any = supabase
                  .from('device_status')
                  .select('safety_override,safety_override_reason');
                if (selectedFarmId) sq = sq.eq('farm_id', selectedFarmId);
                else sq = sq.eq('user_id', user.id);
                if (resolvedShedId) sq = sq.eq('shed_id', resolvedShedId);
                const { data: ss } = await sq
                  .order('updated_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (ss?.safety_override) safetyLocked = true;
              }
            }
          } catch {
            // ignore — fallback to generic message
          }

          // Log failure to device_command_log so it shows up in the in-app history.
          const failureStatus = isOffline ? 'expired' : 'failed';
          const errMsg = isOffline
            ? 'Device offline — command not delivered (no ack within 30s)'
            : safetyLocked
              ? 'Blocked by Safety Engine'
              : 'No device acknowledgement within 30s';
          try {
            const updatePayload: Record<string, any> = {
              status: failureStatus,
              error_message: errMsg,
              expired_at: isOffline ? new Date().toISOString() : null,
            };
            if (commandId) {
              const { data: updated, error: updateErr } = await supabase
                .from('device_command_log')
                .update(updatePayload as never)
                .eq('command_id', commandId)
                .select('id');
              if (updateErr) console.warn('[useDeviceCommands] log update failed', updateErr);
              // Fallback: if no pending row was found, insert one.
              if (updateErr || !updated || updated.length === 0) {
                await supabase.from('device_command_log').insert({
                  user_id: user.id,
                  farm_id: selectedFarmId ?? null,
                  shed_id: resolvedShedId ?? null,
                  client_request_id: result?.clientRequestId ?? null,
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
            // Reuse the same idempotency key: retrying delivery must not
            // enqueue a second actuator command.
            onClick: () => retryLastCommand({
              ...variables,
              clientRequestId: result?.clientRequestId,
            }),
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
