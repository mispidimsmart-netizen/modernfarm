/**
 * Watches ESP32 online status for the active farm. When the device transitions
 * offline → online, drains any queued device commands (enqueued while the
 * device was offline) by inserting them into `device_commands` and updating
 * the matching `desired_*` columns. Uses Supabase Realtime on `device_health`
 * plus a 20s poll fallback.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getQueuedDeviceCommands,
  removeDeviceCommand,
  clearExpiredDeviceCommands,
} from '@/lib/deviceCommandQueue';

async function drainQueueForFarm(params: {
  userId: string;
  farmId: string;
  language: 'bn' | 'en';
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { userId, farmId, language, queryClient } = params;
  clearExpiredDeviceCommands();
  const items = getQueuedDeviceCommands({ user_id: userId, farm_id: farmId });
  if (items.length === 0) return;

  let sent = 0;
  for (const item of items) {
    try {
      // Replay through the same server-owned RPC as the online path. Values
      // in localStorage are untrusted; in particular, device_name is ignored
      // and the server resolves the farm/shed/device binding.
      const { error } = await (supabase as any).rpc('queue_v8_actuator_command', {
        p_farm_id: item.farm_id,
        p_shed_id: item.shed_id ?? null,
        p_device_token_id: item.device_token_id ?? null,
        p_command_type: item.command_type,
        p_command_value: item.command_value,
        p_client_request_id: item.client_request_id,
      });
      if (error) throw error;

      removeDeviceCommand(item.id);
      sent += 1;
    } catch (e) {
      console.warn('[device-online-sync] failed to replay command', e);
    }
  }

  if (sent > 0) {
    queryClient.invalidateQueries({ queryKey: ['device_status'] });
    queryClient.invalidateQueries({ queryKey: ['device_commands'] });
    queryClient.invalidateQueries({ queryKey: ['device-command-log'] });
    toast.success(
      language === 'bn'
        ? `📡 ডিভাইস অনলাইন — ${sent}টি সংরক্ষিত কমান্ড পাঠানো হলো`
        : `📡 Device online — sent ${sent} queued command${sent > 1 ? 's' : ''}`,
    );
  }
}

export function useDeviceOnlineSync() {
  const { user, language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const queryClient = useQueryClient();
  const lastOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!user || !selectedFarmId) return;

    let cancelled = false;

    const checkAndDrain = async () => {
      if (cancelled) return;
      try {
        const { data } = await supabase
          .from('device_health')
          .select('is_online,last_seen_at')
          .eq('farm_id', selectedFarmId)
          .order('last_seen_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastSeen = data?.last_seen_at
          ? new Date(data.last_seen_at).getTime()
          : 0;
        const fresh = Date.now() - lastSeen < 90 * 1000;
        const online = !!data?.is_online && fresh;

        const wasOffline = lastOnlineRef.current === false;
        lastOnlineRef.current = online;

        if (online && (wasOffline || getQueuedDeviceCommands({ user_id: user.id, farm_id: selectedFarmId }).length > 0)) {
          await drainQueueForFarm({
            userId: user.id,
            farmId: selectedFarmId,
            language: language as 'bn' | 'en',
            queryClient,
          });
        }
      } catch (e) {
        console.warn('[device-online-sync] check failed', e);
      }
    };

    checkAndDrain();
    const iv = setInterval(checkAndDrain, 20_000);

    const channel = supabase
      .channel(`device-online-sync-${selectedFarmId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_health',
          filter: `farm_id=eq.${selectedFarmId}`,
        },
        () => {
          checkAndDrain();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(iv);
      supabase.removeChannel(channel);
    };
  }, [user, selectedFarmId, language, queryClient]);
}
