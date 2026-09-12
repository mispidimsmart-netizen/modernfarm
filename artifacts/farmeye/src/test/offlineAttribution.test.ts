import { describe, it, expect } from 'vitest';
import { resolveQueueAttribution } from '@/lib/offlineAttribution';

const A = 'aaaaaaaa-0000-0000-0000-000000000001';
const B = 'bbbbbbbb-0000-0000-0000-000000000002';
const FARM1 = 'farm-1111';
const FARM2 = 'farm-2222';

describe('resolveQueueAttribution — user attribution', () => {
  it('syncs with the recorded author when it matches the current user', () => {
    const d = resolveQueueAttribution({ queued_by: A, record_data: {} }, A);
    expect(d).toEqual({ action: 'sync', authorId: A, farmId: undefined });
  });

  it('defers items authored by a different user (shared device)', () => {
    const d = resolveQueueAttribution({ queued_by: A, record_data: {} }, B);
    expect(d.action).toBe('defer');
    expect(d.authorId).toBe(A);
    if (d.action === 'defer') expect(d.reason).toBe('different-user');
  });

  it('falls back to record_data.user_id when queued_by is missing', () => {
    const d = resolveQueueAttribution({ record_data: { user_id: A } }, A);
    expect(d.action).toBe('sync');
    const d2 = resolveQueueAttribution({ record_data: { user_id: A } }, B);
    expect(d2.action).toBe('defer');
  });

  it('attributes legacy items with no author to the current user', () => {
    const d = resolveQueueAttribution({ record_data: {} }, B);
    expect(d.action).toBe('sync');
    expect(d.authorId).toBe(B);
  });
});

describe('resolveQueueAttribution — farm scoping', () => {
  it('keeps the farm captured at enqueue time', () => {
    const d = resolveQueueAttribution(
      { queued_by: A, queued_farm_id: FARM1, record_data: { farm_id: FARM1 } },
      A,
    );
    expect(d).toEqual({ action: 'sync', authorId: A, farmId: FARM1 });
  });

  it('defers when payload farm conflicts with the captured farm', () => {
    const d = resolveQueueAttribution(
      { queued_by: A, queued_farm_id: FARM1, record_data: { farm_id: FARM2 } },
      A,
    );
    expect(d.action).toBe('defer');
    if (d.action === 'defer') expect(d.reason).toBe('farm-mismatch');
  });

  it('uses the captured farm when the payload has none', () => {
    const d = resolveQueueAttribution(
      { queued_by: A, queued_farm_id: FARM1, record_data: {} },
      A,
    );
    expect(d).toEqual({ action: 'sync', authorId: A, farmId: FARM1 });
  });

  it('user mismatch takes precedence over farm checks', () => {
    const d = resolveQueueAttribution(
      { queued_by: A, queued_farm_id: FARM1, record_data: { farm_id: FARM2 } },
      B,
    );
    if (d.action === 'defer') expect(d.reason).toBe('different-user');
  });
});
