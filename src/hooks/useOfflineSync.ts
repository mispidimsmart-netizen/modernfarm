import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { resolveQueueAttribution } from '@/lib/offlineAttribution';

interface SyncQueueItem {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
  record_data: Record<string, unknown>;
  on_conflict?: string;
  created_at: string;
  retry_count?: number;
  max_age_minutes?: number;
  /** Author captured at enqueue time (see src/lib/offlineQueue.ts). */
  queued_by?: string;
}

const SYNC_QUEUE_KEY = 'smart_farm_offline_queue';
const DEFAULT_MAX_AGE_MIN = 24 * 60; // 24h TTL — Phase 3
const MAX_RETRY_COUNT = 5;

/** Phase 3: drop items older than max_age_minutes or with too many failed retries */
function pruneExpired(queue: SyncQueueItem[]): { kept: SyncQueueItem[]; dropped: number } {
  const now = Date.now();
  const kept: SyncQueueItem[] = [];
  let dropped = 0;
  for (const item of queue) {
    const ageMin = (now - new Date(item.created_at).getTime()) / 60_000;
    const ttl = item.max_age_minutes ?? DEFAULT_MAX_AGE_MIN;
    if (ageMin > ttl || (item.retry_count ?? 0) >= MAX_RETRY_COUNT) {
      dropped += 1;
      continue;
    }
    kept.push(item);
  }
  return { kept, dropped };
}

export function useOfflineSync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load queue from localStorage
  const getLocalQueue = useCallback((): SyncQueueItem[] => {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save queue to localStorage
  const saveLocalQueue = useCallback((queue: SyncQueueItem[]) => {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    setPendingCount(queue.length);
  }, []);

  // Add item to queue
  const addToQueue = useCallback((
    tableName: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    recordData: Record<string, unknown>
  ) => {
    const queue = getLocalQueue();
    const newItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      table_name: tableName,
      operation,
      record_data: recordData,
      created_at: new Date().toISOString(),
    };
    queue.push(newItem);
    saveLocalQueue(queue);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      syncQueue();
    }
  }, [getLocalQueue, saveLocalQueue]);

  // Sync queue with server (Phase 3: TTL prune + retry counter)
  const syncQueue = useCallback(async () => {
    if (!user || isSyncing) return;

    const rawQueue = getLocalQueue();
    if (rawQueue.length === 0) return;

    const { kept: queue, dropped } = pruneExpired(rawQueue);
    if (dropped > 0) {
      console.warn(`[offline-sync] dropped ${dropped} expired/exhausted mutations`);
    }
    if (queue.length === 0) {
      saveLocalQueue([]);
      return;
    }

    setIsSyncing(true);
    const successfulIds: string[] = [];
    const failed: SyncQueueItem[] = [];

    for (const item of queue) {
      // Attribute the row to whoever actually authored it offline.
      const attribution = resolveQueueAttribution(item, user.id);
      if (attribution.action === 'defer') {
        console.warn(
          `[offline-sync] deferring ${item.table_name} mutation authored by another user`,
        );
        failed.push(item); // keep queued, do NOT bump retry_count
        continue;
      }
      const authorId = attribution.authorId;

      try {
        let ok = false;
        switch (item.operation) {
          case 'INSERT': {
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .insert({ ...item.record_data, user_id: authorId });
            ok = !error;
            break;
          }
          case 'UPSERT': {
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .upsert(
                { ...item.record_data, user_id: authorId } as any,
                item.on_conflict ? { onConflict: item.on_conflict } : undefined,
              );
            ok = !error;
            break;
          }

          case 'UPDATE': {
            const { id: recordId, ...updateData } = item.record_data;
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .update(updateData)
              .eq('id', recordId as string);
            ok = !error;
            break;
          }
          case 'DELETE': {
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .delete()
              .eq('id', item.record_data.id as string);
            ok = !error;
            break;
          }
        }
        if (ok) successfulIds.push(item.id);
        else failed.push({ ...item, retry_count: (item.retry_count ?? 0) + 1 });
      } catch (error) {
        console.error('Sync error for item:', item.id, error);
        failed.push({ ...item, retry_count: (item.retry_count ?? 0) + 1 });
      }
    }

    // Keep failed items (with bumped retry_count) for the next attempt
    saveLocalQueue(failed);
    setIsSyncing(false);
  }, [user, isSyncing, getLocalQueue, saveLocalQueue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChanged = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === 'number') setPendingCount(detail);
      else setPendingCount(getLocalQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChanged as EventListener);

    // Initial load
    setPendingCount(getLocalQueue().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChanged as EventListener);
    };
  }, [syncQueue, getLocalQueue]);

  // Auto sync when user logs in
  useEffect(() => {
    if (user && isOnline) {
      syncQueue();
    }
  }, [user, isOnline, syncQueue]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    addToQueue,
    syncQueue,
  };
}
