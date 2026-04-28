import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Offline queue specifically for completed layer batch edits.
 * Stores pending edits in localStorage and replays them when connectivity returns.
 *
 * NOTE: When syncing, we always pass `force: true` semantics for the recompute
 * (the user already explicitly chose to save while offline). The summary
 * recompute is re-run server-side at sync time using current child rows.
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

  // 1. Update batch
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
  const batch: any = updated;

  // 2. Recompute summary inline (mirrors useEditCompletedLayerBatch logic, lightweight)
  const start = payload.start_date;
  const end = payload.actual_end_date;

  const [eggsRes, mortRes, feedRes] = await Promise.all([
    supabase
      .from('egg_production')
      .select('total_eggs,production_date')
      .eq('user_id', userId)
      .gte('production_date', start)
      .lte('production_date', end),
    supabase
      .from('daily_summary')
      .select('mortality_count')
      .eq('user_id', userId)
      .gte('summary_date', start)
      .lte('summary_date', end),
    supabase
      .from('feed_consumption')
      .select('quantity_kg')
      .eq('user_id', userId)
      .gte('consumption_date', start)
      .lte('consumption_date', end),
  ]);

  const total_eggs = (eggsRes.data || []).reduce((s, r: any) => s + (r.total_eggs || 0), 0);
  const total_mortality = (mortRes.data || []).reduce(
    (s, r: any) => s + (r.mortality_count || 0),
    0
  );
  const total_feed_kg = (feedRes.data || []).reduce(
    (s, r: any) => s + Number(r.quantity_kg || 0),
    0
  );

  const initial = payload.initial_bird_count || 1;
  const mortality_percent = +((total_mortality / initial) * 100).toFixed(2);
  const fcr = total_eggs > 0 ? +(total_feed_kg / (total_eggs * 0.06)).toFixed(2) : 0;
  const duration_days = Math.max(
    1,
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
    )
  );

  await supabase.from('layer_batch_summary' as any).delete().eq('batch_id', batchId);
  const { error: sErr } = await supabase.from('layer_batch_summary' as any).insert({
    batch_id: batchId,
    user_id: userId,
    farm_id: batch?.farm_id ?? null,
    total_eggs,
    total_mortality,
    mortality_percent,
    total_feed_kg,
    fcr,
    duration_days,
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
