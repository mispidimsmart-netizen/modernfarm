/**
 * Integration tests for OrganizationsPanel optimistic updates + onSettled invalidation.
 *
 * Verifies that:
 *  1. setRole mutation immediately updates cached members (optimistic), then refetches on settle.
 *  2. removeMember mutation immediately removes the row from cache, then refetches on settle.
 *  3. On RPC error, the optimistic change is rolled back to the previous snapshot.
 *
 * The Supabase client is mocked at the module level so tests are hermetic — no network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

// ---- Mock supabase client ----
const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

// ---- Mock toast (used by component, harmless here) ----
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

type OrgRole = 'org_owner' | 'org_admin' | 'member';
interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: { user_name: string | null; phone: string | null; email: string | null };
}

const ORG_ID = 'org-123';
const membersKey = ['admin_org_members', ORG_ID] as const;

const seedMembers = (): MemberRow[] => [
  { id: 'm1', user_id: 'u1', role: 'member', created_at: '2026-01-01' },
  { id: 'm2', user_id: 'u2', role: 'org_admin', created_at: '2026-01-02' },
];

// Replicates the exact mutation shape used in OrganizationsPanel.tsx so we
// validate the same optimistic-update + onSettled-invalidate contract.
function useOrgMutations() {
  const qc = useQueryClient();

  const setRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: OrgRole }) => {
      const { error } = await (await import('@/integrations/supabase/client')).supabase.rpc(
        'super_admin_set_org_member_role' as never,
        { _org_id: ORG_ID, _user_id: user_id, _role: role } as never,
      );
      if (error) throw error;
    },
    onMutate: async ({ user_id, role }) => {
      await qc.cancelQueries({ queryKey: membersKey });
      const previous = qc.getQueryData<MemberRow[]>(membersKey);
      if (previous) {
        qc.setQueryData<MemberRow[]>(
          membersKey,
          previous.map(m => (m.user_id === user_id ? { ...m, role } : m)),
        );
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(membersKey, ctx.previous);
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: membersKey, refetchType: 'active' });
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({ user_id }: { user_id: string }) => {
      const { error } = await (await import('@/integrations/supabase/client')).supabase.rpc(
        'super_admin_remove_org_member' as never,
        { _org_id: ORG_ID, _user_id: user_id } as never,
      );
      if (error) throw error;
    },
    onMutate: async ({ user_id }) => {
      await qc.cancelQueries({ queryKey: membersKey });
      const previous = qc.getQueryData<MemberRow[]>(membersKey);
      if (previous) {
        qc.setQueryData<MemberRow[]>(
          membersKey,
          previous.filter(m => m.user_id !== user_id),
        );
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(membersKey, ctx.previous);
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: membersKey, refetchType: 'active' });
    },
  });

  return { setRole, removeMember, qc };
}

const makeWrapper = (qc: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('OrganizationsPanel mutations — optimistic + onSettled', () => {
  let qc: QueryClient;
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rpcMock.mockReset();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  });

  it('setRole optimistically updates cache then invalidates on settle', async () => {
    rpcMock.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useOrgMutations(), { wrapper: makeWrapper(qc) });

    qc.setQueryData<MemberRow[]>(membersKey, seedMembers());

    await act(async () => {
      await result.current.setRole.mutateAsync({ user_id: 'u1', role: 'org_admin' });
    });

    const after = qc.getQueryData<MemberRow[]>(membersKey)!;
    expect(after.find(m => m.user_id === 'u1')?.role).toBe('org_admin');
    expect(rpcMock).toHaveBeenCalledWith(
      'super_admin_set_org_member_role',
      { _org_id: ORG_ID, _user_id: 'u1', _role: 'org_admin' },
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: membersKey, refetchType: 'active' }),
    );
  });

  it('setRole rolls back optimistic update when RPC fails', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'Permission denied' } });
    const { result } = renderHook(() => useOrgMutations(), { wrapper: makeWrapper(qc) });

    qc.setQueryData<MemberRow[]>(membersKey, seedMembers());

    await act(async () => {
      await result.current.setRole.mutateAsync({ user_id: 'u1', role: 'org_admin' })
        .catch(() => undefined);
    });

    const after = qc.getQueryData<MemberRow[]>(membersKey)!;
    expect(after.find(m => m.user_id === 'u1')?.role).toBe('member');
  });

  it('removeMember optimistically removes row then triggers refetch on settle', async () => {
    rpcMock.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useOrgMutations(), { wrapper: makeWrapper(qc) });

    qc.setQueryData<MemberRow[]>(membersKey, seedMembers());
    await qc.prefetchQuery({ queryKey: membersKey });
    refetchCount = 0;

    // Capture the snapshot during onMutate (synchronous post-commit) by reading
    // cache right after mutate() resolves the optimistic step.
    const promise = result.current.removeMember.mutateAsync({ user_id: 'u2' });

    await waitFor(() => {
      const snap = qc.getQueryData<MemberRow[]>(membersKey)!;
      expect(snap.find(m => m.user_id === 'u2')).toBeUndefined();
    });

    await act(async () => { await promise; });

    expect(rpcMock).toHaveBeenCalledWith(
      'super_admin_remove_org_member',
      { _org_id: ORG_ID, _user_id: 'u2' },
    );
    await waitFor(() => expect(refetchCount).toBeGreaterThanOrEqual(1));
  });

  it('removeMember rolls back when RPC fails', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'Permission denied' } });
    const { result } = renderHook(() => useOrgMutations(), { wrapper: makeWrapper(qc) });

    qc.setQueryData<MemberRow[]>(membersKey, seedMembers());

    await act(async () => {
      await result.current.removeMember.mutateAsync({ user_id: 'u2' })
        .catch(() => undefined);
    });

    const after = qc.getQueryData<MemberRow[]>(membersKey)!;
    expect(after.find(m => m.user_id === 'u2')).toBeDefined();
    expect(after).toHaveLength(2);
  });
});
