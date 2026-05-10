import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface SyncQueueItem {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_data: Record<string, unknown>;
  created_at: string;
  retry_count?: number;
  max_age_minutes?: number;
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
      try {
        let ok = false;
        switch (item.operation) {
          case 'INSERT': {
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .insert({ ...item.record_data, user_id: user.id });
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

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load
    setPendingCount(getLocalQueue().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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

// Hook to use offline-capable mutations
export function useOfflineMutation<T extends Record<string, unknown>>(
  tableName: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const { user } = useAuth();
  const { isOnline, addToQueue } = useOfflineSync();

  const insert = useCallback(async (data: T) => {
    if (!user) throw new Error('Not authenticated');

    if (isOnline) {
      const { error } = await supabase
        .from(tableName as 'egg_production')
        .insert({ ...data, user_id: user.id });
      
      if (error) {
        // If online insert fails, queue for later
        addToQueue(tableName, 'INSERT', data);
        options?.onError?.(new Error(error.message));
      } else {
        options?.onSuccess?.();
      }
    } else {
      // Queue for sync when back online
      addToQueue(tableName, 'INSERT', data);
      options?.onSuccess?.();
    }
  }, [user, isOnline, tableName, addToQueue, options]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    if (!user) throw new Error('Not authenticated');

    if (isOnline) {
      const { error } = await supabase
        .from(tableName as 'egg_production')
        .update(data)
        .eq('id', id);
      
      if (error) {
        addToQueue(tableName, 'UPDATE', { id, ...data });
        options?.onError?.(new Error(error.message));
      } else {
        options?.onSuccess?.();
      }
    } else {
      addToQueue(tableName, 'UPDATE', { id, ...data });
      options?.onSuccess?.();
    }
  }, [user, isOnline, tableName, addToQueue, options]);

  const remove = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated');

    if (isOnline) {
      const { error } = await supabase
        .from(tableName as 'egg_production')
        .delete()
        .eq('id', id);
      
      if (error) {
        addToQueue(tableName, 'DELETE', { id });
        options?.onError?.(new Error(error.message));
      } else {
        options?.onSuccess?.();
      }
    } else {
      addToQueue(tableName, 'DELETE', { id });
      options?.onSuccess?.();
    }
  }, [user, isOnline, tableName, addToQueue, options]);

  return { insert, update, remove, isOnline };
}
