# Playwright E2E tests

## Install browsers (one-time)

```bash
bunx playwright install chromium
```

## Run

```bash
E2E_BASE_URL=http://localhost:8080 \
E2E_ADMIN_EMAIL=<super-admin email> \
E2E_ADMIN_PASSWORD=<password> \
E2E_TARGET_USER_QUERY="মনিরুজ্জামান" \
E2E_TARGET_FARM_NAME="Resil" \
bunx playwright test
```

Against the deployed preview, set `E2E_BASE_URL` to the preview/published URL.

## Tests

- `role-editor-cache-refresh.spec.ts` — Logs in as super-admin, opens the
  Unified Role Editor (`/admin?tab=users&subtab=roles`), saves a role change
  for the target user, and asserts that:
  1. The `update_user_roles_unified` RPC fires (single transaction).
  2. Access-gating caches (`farm_members` / `user_roles` / `farms`) refetch.
  3. A success toast appears.

  The test is auto-skipped if the required env vars are not set, so it is
  safe to keep in CI without secrets.
