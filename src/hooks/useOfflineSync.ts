import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface SyncQueueItem {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_data: Record<string, unknown>;
  created_at: string;
}

const SYNC_QUEUE_KEY = 'smart_farm_offline_queue';

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

  // Sync queue with server
  const syncQueue = useCallback(async () => {
    if (!user || isSyncing) return;
    
    const queue = getLocalQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    const successfulIds: string[] = [];

    for (const item of queue) {
      try {
        switch (item.operation) {
          case 'INSERT': {
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .insert({ ...item.record_data, user_id: user.id });
            if (!error) successfulIds.push(item.id);
            break;
          }
          case 'UPDATE': {
            const { id: recordId, ...updateData } = item.record_data;
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .update(updateData)
              .eq('id', recordId as string);
            if (!error) successfulIds.push(item.id);
            break;
          }
          case 'DELETE': {
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .delete()
              .eq('id', item.record_data.id as string);
            if (!error) successfulIds.push(item.id);
            break;
          }
        }
      } catch (error) {
        console.error('Sync error for item:', item.id, error);
      }
    }

    // Remove successful items from queue
    const remainingQueue = queue.filter(item => !successfulIds.includes(item.id));
    saveLocalQueue(remainingQueue);
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
