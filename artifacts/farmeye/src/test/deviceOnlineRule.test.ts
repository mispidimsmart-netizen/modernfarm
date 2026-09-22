import { describe, it, expect } from 'vitest';
import { isDeviceOnline, isDeviceStatusOnline, DEVICE_ONLINE_THRESHOLD_MS } from '@/lib/deviceFreshness';

const now = Date.UTC(2026, 8, 22, 12, 0, 0);
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

describe('single online rule (regression: brand-new account showed "লাইভ সংযুক্ত")', () => {
  it('device_status: only a fresh board ack counts as online', () => {
    expect(isDeviceStatusOnline({ last_device_ack_at: iso(10_000) }, now)).toBe(true);
    expect(isDeviceStatusOnline({ last_device_ack_at: iso(DEVICE_ONLINE_THRESHOLD_MS + 1) }, now)).toBe(false);
    expect(isDeviceStatusOnline({ last_device_ack_at: null }, now)).toBe(false);
    expect(isDeviceStatusOnline(null, now)).toBe(false);
  });

  it('device_status: updated_at is never a liveness signal', () => {
    expect(isDeviceStatusOnline({ updated_at: iso(1_000) } as any, now)).toBe(false);
  });

  it('device_health: seeded row (fresh last_seen_at, no online flag) is offline', () => {
    expect(isDeviceOnline({ last_seen_at: iso(1_000) }, now)).toBe(false);
    expect(isDeviceOnline({ is_online: null, last_seen_at: iso(1_000) }, now)).toBe(false);
    expect(isDeviceOnline({ is_online: false, last_seen_at: iso(1_000) }, now)).toBe(false);
    expect(isDeviceOnline({ is_online: true, last_seen_at: iso(1_000) }, now)).toBe(true);
    expect(isDeviceOnline({ is_online: true, last_seen_at: iso(DEVICE_ONLINE_THRESHOLD_MS + 1) }, now)).toBe(false);
  });
});
