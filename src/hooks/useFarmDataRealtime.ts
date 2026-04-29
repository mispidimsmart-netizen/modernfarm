import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';

/**
 * Subscribes to realtime changes on egg_production, feed_consumption,
 * and sensor_readings for the active farm. When new data arrives,
 * relevant React Query caches are invalidated so dashboard cards
 * (egg production, feed consumption, today/daily summaries) refresh
 * automatically. A safety polling interval (60s) covers cases where
 * the websocket is briefly disconnected.
 */
export function useFarmDataRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const lastInvalidatedAt = useRef(0);

  useEffect(() => {
    if (!user || !selectedFarmId) return;

    const invalidateAll = () => {
      // Throttle to avoid storming on bursts
      const now = Date.now();
      if (now - lastInvalidatedAt.current < 800) return;
      lastInvalidatedAt.current = now;

      queryClient.invalidateQueries({ queryKey: ['egg-production'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['feed-consumption'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['today-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['daily_reports'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['sensor-stats-today'], refetchType: 'active' });
    };

    const channel = supabase
      .channel(`farm-data-${selectedFarmId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'egg_production',
          filter: `farm_id=eq.${selectedFarmId}`,
        },
        invalidateAll,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_consumption',
          filter: `farm_id=eq.${selectedFarmId}`,
        },
        invalidateAll,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `farm_id=eq.${selectedFarmId}`,
        },
        // New sensor reading → daily/today summaries may include sensor stats
        () => {
          queryClient.invalidateQueries({ queryKey: ['today-summary'], refetchType: 'active' });
          queryClient.invalidateQueries({
            queryKey: ['sensor-stats-today'],
            refetchType: 'active',
          });
        },
      )
      .subscribe();

    // Safety net: refetch every 60s in case realtime drops
    const pollId = window.setInterval(invalidateAll, 60_000);

    // When tab becomes visible again, refresh immediately
    const onVis = () => {
      if (document.visibilityState === 'visible') invalidateAll();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, selectedFarmId, queryClient]);
}
