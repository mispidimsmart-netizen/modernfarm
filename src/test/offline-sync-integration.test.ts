/**
 * Offline sync integration tests (client side).
 *
 * Covers the two queues that keep the app usable without connectivity:
 *   1. `offlineQueue` — browser-offline mutations (daily logs, expenses,
 *      income). Verifies queueing while offline, transient-error retry
 *      queueing, hard-error propagation (RLS/validation must NOT retry),
 *      and upsert semantics.
 *   2. `deviceCommandQueue` — commands issued while the ESP32 is offline.
 *      Verifies latest-wins dedup, TTL expiry, farm/user scoping and drain.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const insertMock = vi.fn();
const upsertMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: (...args: unknown[]) => insertMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
    }),
  },
}));

import {
  insertOrQueue,
  upsertOrQueue,
  queueInsert,
  getOfflineQueueCount,
} from '@/lib/offlineQueue';
import {
  enqueueDeviceCommand,
  getQueuedDeviceCommands,
  removeDeviceCommand,
  clearExpiredDeviceCommands,
  getDeviceQueueCount,
} from '@/lib/deviceCommandQueue';

const SYNC_QUEUE_KEY = 'smart_farm_offline_queue';
const DEVICE_QUEUE_KEY = 'farmeye_device_offline_queue';

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
}

function readSyncQueue() {
  return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
}

beforeEach(() => {
  localStorage.clear();
  insertMock.mockReset();
  upsertMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
  upsertMock.mockResolvedValue({ error: null });
  setOnline(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('offlineQueue — browser offline mutations', () => {
  it('queues an insert instead of hitting the network when offline', async () => {
    setOnline(false);
    const res = await insertOrQueue('expenses', { amount: 500, farm_id: 'f1' });

    expect(res.queued).toBe(true);
    expect(insertMock).not.toHaveBeenCalled();
    const q = readSyncQueue();
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ table_name: 'expenses', operation: 'INSERT' });
    expect(q[0].record_data).toEqual({ amount: 500, farm_id: 'f1' });
  });

  it('writes straight through when online and leaves the queue empty', async () => {
    const res = await insertOrQueue('egg_production', { eggs: 120 });

    expect(res.queued).toBe(false);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(getOfflineQueueCount()).toBe(0);
  });

  it('queues for retry when the write fails with a transient network error', async () => {
    insertMock.mockResolvedValue({ error: { message: 'Failed to fetch: network down' } });
    const res = await insertOrQueue('income', { amount: 1000 });

    expect(res.queued).toBe(true);
    expect(getOfflineQueueCount()).toBe(1);
  });

  it('queues when fetch itself throws (TypeError: Failed to fetch)', async () => {
    insertMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const res = await insertOrQueue('mortality_records', { count: 2 });

    expect(res.queued).toBe(true);
    expect(getOfflineQueueCount()).toBe(1);
  });

  it('does NOT retry hard server errors (RLS / validation) — it rethrows', async () => {
    insertMock.mockResolvedValue({
      error: { message: 'new row violates row-level security policy for table "expenses"' },
    });

    await expect(insertOrQueue('expenses', { amount: 1 })).rejects.toBeTruthy();
    expect(getOfflineQueueCount()).toBe(0);
  });

  it('queues upserts with their onConflict target preserved', async () => {
    setOnline(false);
    const res = await upsertOrQueue(
      'daily_summary',
      { farm_id: 'f1', date: '2026-08-06', eggs: 100 },
      'farm_id,date',
    );

    expect(res.queued).toBe(true);
    const q = readSyncQueue();
    expect(q[0].operation).toBe('UPSERT');
    expect(q[0].on_conflict).toBe('farm_id,date');
  });

  it('keeps a per-item TTL so stale writes can be pruned on drain', () => {
    queueInsert('feed_consumption', { kg: 40 }, { maxAgeMinutes: 30 });
    expect(readSyncQueue()[0].max_age_minutes).toBe(30);
  });

  it('notifies listeners when the queue size changes', async () => {
    const seen: number[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent<number>).detail);
    window.addEventListener('offline-queue-changed', handler);

    setOnline(false);
    await insertOrQueue('expenses', { amount: 1 });
    await insertOrQueue('expenses', { amount: 2 });

    window.removeEventListener('offline-queue-changed', handler);
    expect(seen).toEqual([1, 2]);
  });

  it('survives corrupted localStorage without throwing', async () => {
    localStorage.setItem(SYNC_QUEUE_KEY, 'not-json');
    setOnline(false);
    await expect(insertOrQueue('expenses', { amount: 5 })).resolves.toMatchObject({
      queued: true,
    });
    expect(getOfflineQueueCount()).toBe(1);
  });
});

describe('deviceCommandQueue — ESP32 offline commands', () => {
  const base = {
    user_id: 'u1',
    farm_id: 'f1',
    shed_id: null,
    device_name: 'fan',
    command_type: 'fan',
  };

  it('queues a command issued while the device is offline', () => {
    enqueueDeviceCommand({ ...base, command_value: true });
    const items = getQueuedDeviceCommands({ user_id: 'u1', farm_id: 'f1' });
    expect(items).toHaveLength(1);
    expect(items[0].command_value).toBe(true);
  });

  it('keeps only the latest desired state per device (ON then OFF = OFF)', () => {
    enqueueDeviceCommand({ ...base, command_value: true });
    enqueueDeviceCommand({ ...base, command_value: false });

    const items = getQueuedDeviceCommands();
    expect(items).toHaveLength(1);
    expect(items[0].command_value).toBe(false);
  });

  it('keeps commands for different sheds separate', () => {
    enqueueDeviceCommand({ ...base, shed_id: 's1', command_value: true });
    enqueueDeviceCommand({ ...base, shed_id: 's2', command_value: false });
    expect(getQueuedDeviceCommands()).toHaveLength(2);
  });

  it('scopes reads by user and farm (multi-tenant isolation)', () => {
    enqueueDeviceCommand({ ...base, command_value: true });
    enqueueDeviceCommand({ ...base, farm_id: 'f2', command_value: true });

    expect(getQueuedDeviceCommands({ user_id: 'u1', farm_id: 'f1' })).toHaveLength(1);
    expect(getQueuedDeviceCommands({ user_id: 'u2', farm_id: 'f1' })).toHaveLength(0);
  });

  it('drops commands past their TTL instead of firing them hours later', () => {
    enqueueDeviceCommand({ ...base, command_value: true, max_age_minutes: 10 });

    const stored = JSON.parse(localStorage.getItem(DEVICE_QUEUE_KEY)!);
    stored[0].queued_at = new Date(Date.now() - 11 * 60_000).toISOString();
    localStorage.setItem(DEVICE_QUEUE_KEY, JSON.stringify(stored));

    expect(getQueuedDeviceCommands()).toHaveLength(0);
    clearExpiredDeviceCommands();
    expect(JSON.parse(localStorage.getItem(DEVICE_QUEUE_KEY)!)).toHaveLength(0);
  });

  it('removes an item once it has been replayed to the cloud', () => {
    const entry = enqueueDeviceCommand({ ...base, command_value: true });
    expect(getDeviceQueueCount()).toBe(1);
    removeDeviceCommand(entry.id);
    expect(getDeviceQueueCount()).toBe(0);
  });

  it('emits a change event so the queue badge stays in sync', () => {
    const seen: number[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent<number>).detail);
    window.addEventListener('device-offline-queue-changed', handler);

    const a = enqueueDeviceCommand({ ...base, command_value: true });
    removeDeviceCommand(a.id);

    window.removeEventListener('device-offline-queue-changed', handler);
    expect(seen).toEqual([1, 0]);
  });

  it('drains every queued command exactly once on reconnect', async () => {
    enqueueDeviceCommand({ ...base, command_value: true });
    enqueueDeviceCommand({ ...base, device_name: 'light', command_type: 'light', command_value: true });

    const sent: string[] = [];
    for (const item of getQueuedDeviceCommands({ user_id: 'u1', farm_id: 'f1' })) {
      sent.push(item.command_type);
      removeDeviceCommand(item.id);
    }

    expect(sent.sort()).toEqual(['fan', 'light']);
    expect(getDeviceQueueCount()).toBe(0);
  });
});
