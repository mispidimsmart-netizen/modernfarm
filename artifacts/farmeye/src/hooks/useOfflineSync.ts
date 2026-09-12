import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { resolveQueueAttribution } from '@/lib/offlineAttribution';
import { getQueueFarmId } from '@/lib/offlineQueue';

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
  /** Selected farm captured at enqueue time. */
  queued_farm_id?: string;
}

const SYNC_QUEUE_KEY = 'smart_farm_offline_queue';
const DEFAULT_MAX_AGE_MIN = 24 * 60; // 24h TTL — Phase 3
const MAX_RETRY_COUNT = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function legacyClientRequestId(value: unknown): string {
  const text = String(value ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const hex = Math.abs(hash >>> 0).toString(16).padStart(8, '0');
  return `${hex}-${hex.slice(0, 4)}-4${hex.slice(4, 7)}-a${hex.slice(1, 4)}-${hex}${hex.slice(0, 4)}`;
}

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
      queued_by: user?.id,
      queued_farm_id: getQueueFarmId() ?? undefined,
    };
    queue.push(newItem);
    saveLocalQueue(queue);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      syncQueue();
    }
  }, [getLocalQueue, saveLocalQueue, user?.id]);

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
      // Attribute the row to whoever actually authored it offline, for the
      // farm that was selected at enqueue time.
      const attribution = resolveQueueAttribution(item, user.id);
      if (attribution.action === 'defer') {
        console.warn(
          `[offline-sync] deferring ${item.table_name} mutation (${attribution.reason})`,
        );
        failed.push(item); // keep queued, do NOT bump retry_count
        continue;
      }
      const authorId = attribution.authorId;
      const rawClientRequestId = item.record_data.client_request_id;
      const clientRequestId = UUID_RE.test(String(rawClientRequestId ?? ''))
        ? String(rawClientRequestId)
        : legacyClientRequestId(item.id);
      // Only re-stamp farm_id when the payload already carried one — some
      // tables have no farm_id column.
      const payload = {
        ...item.record_data,
        user_id: authorId,
        ...(item.table_name === 'device_commands'
          ? { client_request_id: clientRequestId }
          : {}),
        ...(item.record_data.farm_id && attribution.farmId
          ? { farm_id: attribution.farmId }
          : {}),
      };


      try {
        let ok = false;
        // Actuator commands must replay through the idempotent server boundary.
        // Never replay a localStorage-supplied device_name or desired-state
        // mutation directly; localStorage is not an authorization boundary.
        if (item.table_name === 'device_commands') {
          const commandPayload = payload as Record<string, unknown>;
          const { error } = await (supabase as any).rpc('queue_v8_actuator_command', {
            p_farm_id: commandPayload.farm_id,
            p_shed_id: commandPayload.shed_id ?? null,
            p_device_token_id: commandPayload.device_token_id ?? null,
            p_command_type: commandPayload.command_type,
            p_command_value: commandPayload.command_value,
            p_client_request_id: commandPayload.client_request_id,
          });
          ok = !error;
        } else switch (item.operation) {
          case 'INSERT': {
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .insert(payload as any);
            ok = !error;
            break;
          }
          case 'UPSERT': {
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .upsert(
                payload as any,
                item.on_conflict ? { onConflict: item.on_conflict } : undefined,
              );
            ok = !error;
            break;
          }


          case 'UPDATE': {
            const { id: recordId, ...updateData } = item.record_data;
            const { error } = await supabase
              .from(item.table_name as 'egg_production')
              .update(updateData as never)
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
