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

function createQueueId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const hex = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

function legacyQueueId(value: unknown): string {
  const text = String(value ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const hex = Math.abs(hash >>> 0).toString(16).padStart(8, '0');
  return `${hex}-${hex.slice(0, 4)}-4${hex.slice(4, 7)}-a${hex.slice(1, 4)}-${hex}${hex.slice(0, 4)}`;
}

export interface QueuedDeviceCommand {
  id: string;
  user_id: string;
  farm_id: string;
  shed_id?: string | null;
  device_token_id?: string | null;
  /** Stable idempotency key reused by every replay attempt. */
  client_request_id: string;
  device_name: string;
  command_type: string;
  command_value: boolean;
  queued_at: string;
  max_age_minutes?: number;
}

function load(): QueuedDeviceCommand[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Older queue entries predate idempotency. Give them a stable key once;
    // localStorage is only a replay hint, never an authority.
    return parsed.map((item) => ({
      ...item,
      client_request_id:
        typeof item.client_request_id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.client_request_id)
          ? item.client_request_id
          : legacyQueueId(item.id),
    }));
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
  cmd: Omit<QueuedDeviceCommand, 'id' | 'queued_at' | 'client_request_id'> & {
    client_request_id?: string;
  },
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
    client_request_id:
      cmd.client_request_id ??
      createQueueId(),
    id:
      createQueueId(),
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
