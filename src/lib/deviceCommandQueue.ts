/**
 * Device-offline command queue.
 *
 * Distinct from `offlineQueue.ts` which handles BROWSER-offline mutations.
 * This queue holds device_commands issued while the BROWSER is online but
 * the ESP32 is offline. Items drain automatically when the device transitions
 * back to online (see `useDeviceOnlineSync`).
 *
 * Dedup rule: only the LATEST desired state per
 * (user_id, farm_id, shed_id, command_type) is kept — an older ON is replaced
 * by a newer OFF (or vice-versa) so a stale toggle never fires hours later.
 */

const KEY = 'farmeye_device_offline_queue';
const DEFAULT_TTL_MIN = 60; // drop commands older than 1h

export interface QueuedDeviceCommand {
  id: string;
  user_id: string;
  farm_id: string;
  shed_id?: string | null;
  device_name: string;
  command_type: string;
  command_value: boolean;
  queued_at: string;
  max_age_minutes?: number;
}

function load(): QueuedDeviceCommand[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items: QueuedDeviceCommand[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent('device-offline-queue-changed', { detail: items.length }),
    );
  } catch {
    /* ignore */
  }
}

export function enqueueDeviceCommand(
  cmd: Omit<QueuedDeviceCommand, 'id' | 'queued_at'>,
): QueuedDeviceCommand {
  const items = load().filter(
    (i) =>
      !(
        i.user_id === cmd.user_id &&
        i.farm_id === cmd.farm_id &&
        (i.shed_id ?? null) === (cmd.shed_id ?? null) &&
        i.command_type === cmd.command_type
      ),
  );
  const entry: QueuedDeviceCommand = {
    ...cmd,
    id:
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queued_at: new Date().toISOString(),
    max_age_minutes: cmd.max_age_minutes ?? DEFAULT_TTL_MIN,
  };
  items.push(entry);
  save(items);
  return entry;
}

export function getQueuedDeviceCommands(filter?: {
  user_id?: string;
  farm_id?: string;
}): QueuedDeviceCommand[] {
  const now = Date.now();
  const items = load().filter((i) => {
    const ttl = i.max_age_minutes ?? DEFAULT_TTL_MIN;
    const ageMin = (now - new Date(i.queued_at).getTime()) / 60_000;
    if (ageMin > ttl) return false;
    if (filter?.user_id && i.user_id !== filter.user_id) return false;
    if (filter?.farm_id && i.farm_id !== filter.farm_id) return false;
    return true;
  });
  return items;
}

export function removeDeviceCommand(id: string) {
  save(load().filter((i) => i.id !== id));
}

export function clearExpiredDeviceCommands() {
  const now = Date.now();
  const kept = load().filter((i) => {
    const ttl = i.max_age_minutes ?? DEFAULT_TTL_MIN;
    const ageMin = (now - new Date(i.queued_at).getTime()) / 60_000;
    return ageMin <= ttl;
  });
  save(kept);
}

export function getDeviceQueueCount(): number {
  return getQueuedDeviceCommands().length;
}
