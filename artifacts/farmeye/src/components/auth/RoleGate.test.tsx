import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGate } from './RoleGate';

// Mock the two underlying hooks. Each test sets the next return values.
vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: vi.fn(),
}));
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: vi.fn(),
}));

import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUserRole } from '@/hooks/useUserRole';

const mockedPerms = useUserPermissions as unknown as ReturnType<typeof vi.fn>;
const mockedRole = useUserRole as unknown as ReturnType<typeof vi.fn>;

function setup({
  role,
  ownerBypass = false,
  loading = false,
  perms = {},
}: {
  role: 'viewer' | 'farmer' | 'admin';
  ownerBypass?: boolean;
  loading?: boolean;
  perms?: Record<string, boolean>;
}) {
  mockedPerms.mockReturnValue({
    isLoading: loading,
    data: loading ? undefined : { role, ...perms },
  });
  mockedRole.mockReturnValue({
    isLoading: loading,
    data: loading ? undefined : { role: ownerBypass ? 'owner' : 'worker', farmOwnerId: 'x' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoleGate', () => {
  it('viewer is denied when role="farmer" required', () => {
    setup({ role: 'viewer' });
    render(
      <RoleGate role="farmer" fallback={<span>denied</span>}>
        <span>allowed</span>
      </RoleGate>
    );
    expect(screen.queryByText('allowed')).not.toBeInTheDocument();
    expect(screen.getByText('denied')).toBeInTheDocument();
  });

  it('farmer is allowed when role="farmer" required', () => {
    setup({ role: 'farmer' });
    render(
      <RoleGate role="farmer">
        <span>allowed</span>
      </RoleGate>
    );
    expect(screen.getByText('allowed')).toBeInTheDocument();
  });

  it('farmer is denied when role="admin" required', () => {
    setup({ role: 'farmer' });
    render(
      <RoleGate role="admin" fallback={<span>nope</span>}>
        <span>allowed</span>
      </RoleGate>
    );
    expect(screen.getByText('nope')).toBeInTheDocument();
  });

  it('admin is allowed for admin requirement', () => {
    setup({ role: 'admin' });
    render(
      <RoleGate role="admin">
        <span>allowed</span>
      </RoleGate>
    );
    expect(screen.getByText('allowed')).toBeInTheDocument();
  });

  it('owner bypasses even when underlying permission role is viewer', () => {
    setup({ role: 'viewer', ownerBypass: true });
    render(
      <RoleGate role="admin" fallback={<span>denied</span>}>
        <span>owner-allowed</span>
      </RoleGate>
    );
    expect(screen.getByText('owner-allowed')).toBeInTheDocument();
    expect(screen.queryByText('denied')).not.toBeInTheDocument();
  });

  it('renders loading slot while hooks are loading', () => {
    setup({ role: 'viewer', loading: true });
    render(
      <RoleGate role="farmer" loading={<span>loading…</span>} fallback={<span>denied</span>}>
        <span>allowed</span>
      </RoleGate>
    );
    expect(screen.getByText('loading…')).toBeInTheDocument();
    expect(screen.queryByText('allowed')).not.toBeInTheDocument();
    expect(screen.queryByText('denied')).not.toBeInTheDocument();
  });

  it('permission gate denies when flag is false', () => {
    setup({ role: 'farmer', perms: { canEditDeviceSettings: false } });
    render(
      <RoleGate permission="canEditDeviceSettings" fallback={<span>denied</span>}>
        <span>allowed</span>
      </RoleGate>
    );
    expect(screen.getByText('denied')).toBeInTheDocument();
  });

  it('permission gate allows when flag is true', () => {
    setup({ role: 'farmer', perms: { canEditDeviceSettings: true } });
    render(
      <RoleGate permission="canEditDeviceSettings">
        <span>allowed</span>
      </RoleGate>
    );
    expect(screen.getByText('allowed')).toBeInTheDocument();
  });

  it('owner bypasses permission gate too', () => {
    setup({ role: 'viewer', ownerBypass: true, perms: { canEditDeviceSettings: false } });
    render(
      <RoleGate permission="canEditDeviceSettings" fallback={<span>denied</span>}>
        <span>owner-allowed</span>
      </RoleGate>
    );
    expect(screen.getByText('owner-allowed')).toBeInTheDocument();
  });

  it('renders fallback null by default (no children, no fallback)', () => {
    setup({ role: 'viewer' });
    const { container } = render(
      <RoleGate role="admin">
        <span>allowed</span>
      </RoleGate>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
