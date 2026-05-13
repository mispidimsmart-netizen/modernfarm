import { test, expect, Page, Request } from '@playwright/test';

/**
 * E2E: UnifiedRoleEditorPanel → role update → farm/device access cache refresh.
 *
 * Verifies that after a super-admin saves a role change in the unified editor:
 *  1. The `update_user_roles_unified` RPC is called (single transactional save).
 *  2. The TanStack Query caches that gate farm/device access are re-fetched
 *     immediately (we observe network refetches for user-farms / farm-members /
 *     v_user_canonical_roles / device_status / dashboard-snapshot).
 *  3. The success toast appears.
 *
 * Requires env: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
 *               E2E_TARGET_USER_QUERY (search string for target user),
 *               E2E_TARGET_FARM_NAME (existing farm name to add as worker).
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const TARGET_USER_QUERY = process.env.E2E_TARGET_USER_QUERY || '';
const TARGET_FARM_NAME = process.env.E2E_TARGET_FARM_NAME || '';

test.describe('Unified role editor → cache refresh', () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD || !TARGET_USER_QUERY || !TARGET_FARM_NAME,
    'Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD / E2E_TARGET_USER_QUERY / E2E_TARGET_FARM_NAME to run.',
  );

  async function login(page: Page) {
    await page.goto('/');
    // Login form might already be visible at /login
    if (!page.url().includes('login')) await page.goto('/login');
    await page.getByLabel(/ইমেইল|email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/পাসওয়ার্ড|password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /লগইন|sign in|log in/i }).click();
    await page.waitForURL((u) => !u.pathname.includes('login'), { timeout: 30_000 });
  }

  test('saving a role triggers transactional RPC + access-cache refetch', async ({ page }) => {
    // Track relevant network calls.
    const rpcCalls: string[] = [];
    const refetchedKeys = new Set<string>();

    const trackedTables = [
      'farm_members',
      'farms',
      'user_roles',
      'device_status',
      'device_tokens',
      'device_health',
      'device_commands',
      'profiles',
    ];

    const onRequest = (req: Request) => {
      const url = req.url();
      if (url.includes('/rest/v1/rpc/')) {
        const m = url.match(/\/rpc\/([^?]+)/);
        if (m) rpcCalls.push(m[1]);
        if (url.includes('get_farm_dashboard_snapshot')) refetchedKeys.add('dashboard-snapshot');
        if (url.includes('v_user_canonical_roles')) refetchedKeys.add('v_user_canonical_roles');
      }
      if (url.includes('/rest/v1/')) {
        for (const t of trackedTables) {
          if (url.includes(`/rest/v1/${t}?`) || url.includes(`/rest/v1/${t}&`)) {
            refetchedKeys.add(t);
          }
        }
      }
    };
    page.on('request', onRequest);

    await login(page);

    // Go to unified role editor sub-tab.
    await page.goto('/admin?tab=users&subtab=roles');
    await expect(page.getByText(/ইউনিফাইড রোল এডিটর/)).toBeVisible({ timeout: 20_000 });

    // Find target user.
    await page.getByPlaceholder(/খুঁজুন|search/i).first().fill(TARGET_USER_QUERY);
    const userRow = page.getByText(TARGET_USER_QUERY).first();
    await expect(userRow).toBeVisible({ timeout: 10_000 });

    // Open editor for that user.
    const editButton = page
      .locator('button', { hasText: /রোল এডিট/ })
      .first();
    await editButton.click();

    // Dialog opens.
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/রোল এডিটর/)).toBeVisible();

    // Reset markers BEFORE the save so we only capture post-save refetches.
    rpcCalls.length = 0;
    refetchedKeys.clear();

    // Click Save.
    await dialog.getByRole('button', { name: /সেভ করুন/ }).click();

    // (1) Single transactional RPC was called.
    await expect
      .poll(() => rpcCalls.includes('update_user_roles_unified'), { timeout: 15_000 })
      .toBe(true);

    // (2) Success toast.
    await expect(page.getByText(/সেভ.*সফল|সফলভাবে|saved/i).first()).toBeVisible({ timeout: 10_000 });

    // (3) Access-gating caches are refetched within a few seconds.
    await expect
      .poll(
        () => {
          // At least one of the access-gating tables must refetch.
          const required = ['farm_members', 'user_roles', 'farms'];
          return required.some((k) => refetchedKeys.has(k));
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    // (4) Device-related caches (status/tokens/health) are refetched within a few seconds.
    //     The unified role editor broadcasts a cache-bust signal; even in admin context,
    //     at least one of these device tables should refetch as access scope changes.
    await expect
      .poll(
        () => {
          const deviceKeys = ['device_status', 'device_tokens', 'device_health', 'device_commands'];
          return deviceKeys.some((k) => refetchedKeys.has(k));
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    // (5) Dashboard snapshot RPC is re-invoked after role change.
    await expect
      .poll(
        () =>
          refetchedKeys.has('dashboard-snapshot') ||
          rpcCalls.includes('get_farm_dashboard_snapshot'),
        { timeout: 15_000 },
      )
      .toBe(true);

    // Sanity: at least one cache key was refetched overall.
    expect(refetchedKeys.size).toBeGreaterThan(0);

    page.off('request', onRequest);
  });
});
