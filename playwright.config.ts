import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config.
 *
 * Run locally with:
 *   E2E_BASE_URL=http://localhost:8080 \
 *   E2E_ADMIN_EMAIL=...@... \
 *   E2E_ADMIN_PASSWORD=... \
 *   E2E_TARGET_USER_QUERY="মনিরুজ্জামান" \
 *   E2E_TARGET_FARM_NAME="Resil" \
 *   bunx playwright test
 *
 * Against the deployed preview, set E2E_BASE_URL to the preview URL.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'bn-BD',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
});
