import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3115',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx next start -p 3115',
    url: 'http://127.0.0.1:3115',
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXTAUTH_URL: 'http://127.0.0.1:3115',
      NEXTAUTH_SECRET: 'local-dev-gizmo-nextauth-secret-key-2026-arcade-ref',
      ACCOUNT_ADMISSION_MODE: 'invitation-only',
      DATABASE_URL: 'file:./prisma/dev.db',
    },
  },
});
