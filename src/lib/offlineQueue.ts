/**
 * Shared offline-write helpers.
 *
 * Reuses the SAME localStorage key as `useOfflineSync` so the existing
 * background drainer (fires on network 'online' event + login) will
 * automatically flush anything we enqueue here — no extra plumbing.
 *
 * Public API:
 *   insertOrQueue(table, data, opts?)    → insert online, else queue for later
 *   upsertOrQueue(table, data, onConflict)→ same, upsert semantics
 *   queueInsert(table, data)             → force-queue (used by device commands)
 *
 * On drain, each queued item is replayed as INSERT / UPSERT / UPDATE / DELETE
 * by useOfflineSync's syncQueue().
 */
import { supabase } from '@/integrations/supabase/client';

const SYNC_QUEUE_KEY = 'smart_farm_offline_queue';

type Operation = 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';

interface QueueItem {
  id: string;
  table_name: string;
  operation: Operation;
  record_data: Record<string, unknown>;
  on_conflict?: string;
  created_at: string;
  retry_count?: number;
  max_age_minutes?: number;
  /**
   * The user who actually authored the mutation, captured at enqueue time.
   * On a shared device the account can change before the queue drains, so
   * the drainer MUST attribute rows to this id — never to whoever is
   * logged in at sync time.
   */
  queued_by?: string;
}

/** Cached auth user id so the (synchronous) enqueue path can stamp authorship. */
let cachedUserId: string | null = null;

supabase.auth.getSession().then(({ data }) => {
  cachedUserId = data.session?.user?.id ?? null;
}, () => { /* ignore */ });

supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id ?? null;
});

/** Exposed for tests and for callers that already know the author. */
export function getQueueAuthorId(): string | null {
  return cachedUserId;
}


function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(items: QueueItem[]) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
  // Notify listeners (OfflineMutationBadge) that count changed.
  try {
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: items.length }));
  } catch { /* ignore */ }
}

export function queueInsert(
  tableName: string,
  data: Record<string, unknown>,
  opts?: { operation?: Operation; onConflict?: string; maxAgeMinutes?: number },
) {
  const items = loadQueue();
  items.push({
    id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
    table_name: tableName,
    operation: opts?.operation ?? 'INSERT',
    record_data: data,
    on_conflict: opts?.onConflict,
    created_at: new Date().toISOString(),
    max_age_minutes: opts?.maxAgeMinutes,
  });
  saveQueue(items);
}

/**
 * Try an insert online; queue for later if the network is down or the
 * request errors out with a network failure. Returns { queued: boolean }.
 * Server-side errors (RLS, validation) are re-thrown so callers can
 * surface them normally — they must NOT be retried blindly.
 */
export async function insertOrQueue(
  tableName: string,
  data: Record<string, unknown>,
  opts?: { maxAgeMinutes?: number },
): Promise<{ queued: boolean; error?: unknown }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueInsert(tableName, data, { operation: 'INSERT', maxAgeMinutes: opts?.maxAgeMinutes });
    return { queued: true };
  }
  try {
    const { error } = await supabase.from(tableName as any).insert(data as any);
    if (error) {
      // Only queue transient/network errors — hard errors (RLS/validation) bubble up.
      const msg = (error.message || '').toLowerCase();
      const transient = msg.includes('network') || msg.includes('fetch') || msg.includes('timeout');
      if (transient) {
        queueInsert(tableName, data, { operation: 'INSERT', maxAgeMinutes: opts?.maxAgeMinutes });
        return { queued: true, error };
      }
      throw error;
    }
    return { queued: false };
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('network')) {
      queueInsert(tableName, data, { operation: 'INSERT', maxAgeMinutes: opts?.maxAgeMinutes });
      return { queued: true, error: err };
    }
    throw err;
  }
}

export async function upsertOrQueue(
  tableName: string,
  data: Record<string, unknown>,
  onConflict: string,
  opts?: { maxAgeMinutes?: number },
): Promise<{ queued: boolean; error?: unknown }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueInsert(tableName, data, { operation: 'UPSERT', onConflict, maxAgeMinutes: opts?.maxAgeMinutes });
    return { queued: true };
  }
  try {
    const { error } = await supabase.from(tableName as any).upsert(data as any, { onConflict });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      const transient = msg.includes('network') || msg.includes('fetch') || msg.includes('timeout');
      if (transient) {
        queueInsert(tableName, data, { operation: 'UPSERT', onConflict, maxAgeMinutes: opts?.maxAgeMinutes });
        return { queued: true, error };
      }
      throw error;
    }
    return { queued: false };
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('network')) {
      queueInsert(tableName, data, { operation: 'UPSERT', onConflict, maxAgeMinutes: opts?.maxAgeMinutes });
      return { queued: true, error: err };
    }
    throw err;
  }
}

export function getOfflineQueueCount(): number {
  return loadQueue().length;
}
