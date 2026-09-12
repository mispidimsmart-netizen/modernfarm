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
  type QueuedDeviceCommand,
} from '@/lib/deviceCommandQueue';

const DESIRED_COL: Record<string, string | null> = {
  fan: 'desired_fan_on',
  light: 'desired_light_on',
  alarm: 'desired_alarm_on',
  heater: 'desired_heater_on',
  circulation_fan: 'desired_circulation_fan_on',
  fogger: 'desired_fogger_on',
  ceiling_fan: 'desired_ceiling_fan_on',
  sprinkler: 'desired_sprinkler_on',
  manual_override: 'desired_manual_override',
  stop_automation: 'desired_manual_override',
};

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
      const { error: insErr } = await supabase.from('device_commands').insert({
        user_id: item.user_id,
        farm_id: item.farm_id,
        device_name: item.device_name,
        command_type: item.command_type as QueuedDeviceCommand['command_type'],
        command_value: item.command_value,
        executed: false,
      });
      if (insErr) continue;

      const desiredCol = DESIRED_COL[item.command_type];
      if (desiredCol) {
        const update: Record<string, unknown> = {
          [desiredCol]: item.command_value,
          updated_at: new Date().toISOString(),
        };
        let q: any = supabase
          .from('device_status')
          .update(update)
          .eq('user_id', item.user_id)
          .eq('farm_id', item.farm_id);
        if (item.shed_id) q = q.eq('shed_id', item.shed_id);
        await q;
      }

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
          .eq('user_id', user.id)
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
