import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { computeBatchSummary, type LayerBatch } from '@/hooks/useLayerBatch';

/**
 * Offline queue specifically for completed layer batch edits.
 * Stores pending edits in localStorage and replays them when connectivity returns.
 *
 * On sync we reuse the SAME `computeBatchSummary` used by the online edit path
 * so all derived fields (peak_production_percent, peak_age_weeks, FCR,
 * total_feed_cost, total_expenses, net_profit, etc.) match exactly.
 */

const QUEUE_KEY = 'farmeye_batch_edit_queue_v1';

export interface QueuedBatchEdit {
  queueId: string;
  batchId: string;
  payload: {
    start_date: string;
    actual_end_date: string;
    initial_bird_count: number;
    current_bird_count: number;
    chick_cost_per_bird?: number;
    notes?: string;
    // SSOT fields — when synced, the DB trigger recomputes flock_info.age_weeks
    // from (age_at_start_weeks + weeks_elapsed_since start_date) so the
    // current age stays correct even after long offline periods.
    batch_name_bn?: string;
    breed?: string;
    age_at_start_weeks?: number;
  };
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

function readQueue(): QueuedBatchEdit[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedBatchEdit[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  window.dispatchEvent(new CustomEvent('batch-edit-queue-changed'));
}

export function enqueueBatchEdit(
  batchId: string,
  payload: QueuedBatchEdit['payload']
): QueuedBatchEdit {
  const q = readQueue();
  // De-dupe: replace any existing pending edit for the same batch (latest wins)
  const filtered = q.filter((it) => it.batchId !== batchId);
  const item: QueuedBatchEdit = {
    queueId: crypto.randomUUID(),
    batchId,
    payload,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
  filtered.push(item);
  writeQueue(filtered);
  return item;
}

async function applyQueuedEdit(
  userId: string,
  item: QueuedBatchEdit
): Promise<void> {
  const { batchId, payload } = item;

  // 1. Update batch row
  const { data: updated, error: uErr } = await supabase
    .from('layer_batches' as any)
    .update({
      start_date: payload.start_date,
      actual_end_date: payload.actual_end_date,
      initial_bird_count: payload.initial_bird_count,
      current_bird_count: payload.current_bird_count,
      chick_cost_per_bird: payload.chick_cost_per_bird ?? undefined,
    } as any)
    .eq('id', batchId)
    .select()
    .single();
  if (uErr) throw uErr;
  const batch = updated as unknown as LayerBatch;

  // 2. Recompute summary with the SAME canonical logic used online
  const summary = await computeBatchSummary(
    userId,
    batch,
    payload.start_date,
    payload.actual_end_date
  );

  // 3. Upsert summary
  await supabase.from('layer_batch_summary' as any).delete().eq('batch_id', batchId);
  const { error: sErr } = await supabase.from('layer_batch_summary' as any).insert({
    batch_id: batchId,
    user_id: userId,
    farm_id: batch.farm_id,
    ...summary,
    notes: payload.notes || null,
  } as any);
  if (sErr) throw sErr;
}

export function useBatchEditQueue() {
  const { user, language } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<QueuedBatchEdit[]>(() => readQueue());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(() => setQueue(readQueue()), []);

  const sync = useCallback(async () => {
    if (!user) return;
    if (!navigator.onLine) return;
    if (isSyncing) return;
    const current = readQueue();
    if (current.length === 0) return;

    setIsSyncing(true);
    let succeeded = 0;
    const remaining: QueuedBatchEdit[] = [];

    for (const item of current) {
      try {
        await applyQueuedEdit(user.id, item);
        succeeded++;
      } catch (e: any) {
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          lastError: e?.message || 'sync failed',
        });
      }
    }

    writeQueue(remaining);
    setQueue(remaining);
    setIsSyncing(false);

    if (succeeded > 0) {
      queryClient.invalidateQueries({ queryKey: ['layer-batches'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-summary'] });
      queryClient.invalidateQueries({ queryKey: ['layer-batch-trend'] });
      toast({
        title: language === 'bn' ? 'অফলাইন পরিবর্তন সিঙ্ক হয়েছে' : 'Offline edits synced',
        description:
          language === 'bn'
            ? `${succeeded}টি ব্যাচ এডিট সার্ভারে পাঠানো হয়েছে`
            : `${succeeded} batch edit(s) sent to server`,
      });
    }
    if (remaining.length > 0) {
      toast({
        title: language === 'bn' ? 'কিছু সিঙ্ক ব্যর্থ' : 'Some edits failed to sync',
        description:
          language === 'bn'
            ? `${remaining.length}টি অপেক্ষমাণ — পরে পুনরায় চেষ্টা হবে`
            : `${remaining.length} pending — will retry later`,
        variant: 'destructive',
      });
    }
  }, [user, isSyncing, queryClient, toast, language]);

  // Online/offline + queue change listeners
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      sync();
    };
    const onOffline = () => setIsOnline(false);
    const onQueueChange = () => refresh();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('batch-edit-queue-changed', onQueueChange);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('batch-edit-queue-changed', onQueueChange);
    };
  }, [sync, refresh]);

  // Try sync on mount / when user becomes available
  useEffect(() => {
    if (user && navigator.onLine) sync();
  }, [user, sync]);

  return {
    queue,
    pendingCount: queue.length,
    isOnline,
    isSyncing,
    sync,
  };
}
