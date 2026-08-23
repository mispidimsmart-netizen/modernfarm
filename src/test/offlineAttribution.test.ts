import { describe, it, expect } from 'vitest';
import { resolveQueueAttribution } from '@/lib/offlineAttribution';

const A = 'aaaaaaaa-0000-0000-0000-000000000001';
const B = 'bbbbbbbb-0000-0000-0000-000000000002';

describe('resolveQueueAttribution', () => {
  it('syncs with the recorded author when it matches the current user', () => {
    const d = resolveQueueAttribution({ queued_by: A, record_data: {} }, A);
    expect(d).toEqual({ action: 'sync', authorId: A });
  });

  it('defers items authored by a different user (shared device)', () => {
    const d = resolveQueueAttribution({ queued_by: A, record_data: {} }, B);
    expect(d.action).toBe('defer');
    expect(d.authorId).toBe(A);
  });

  it('falls back to record_data.user_id when queued_by is missing', () => {
    const d = resolveQueueAttribution({ record_data: { user_id: A } }, A);
    expect(d).toEqual({ action: 'sync', authorId: A });
    const d2 = resolveQueueAttribution({ record_data: { user_id: A } }, B);
    expect(d2.action).toBe('defer');
  });

  it('attributes legacy items with no author to the current user', () => {
    const d = resolveQueueAttribution({ record_data: {} }, B);
    expect(d).toEqual({ action: 'sync', authorId: B });
  });
});
