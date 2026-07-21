import { defineConfig, devices } from '@playwright/test';
import { HU_ARQ_001, EVIDENCE_DIR } from './e2e/ficosha/config';

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  reporter: [
    ['list'],
    ['json', { outputFile: `${EVIDENCE_DIR}/playwright-report.json` }],
    ['html', { outputFile: `${EVIDENCE_DIR}/html-report/index.html`, open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? HU_ARQ_001.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    locale: 'es-GT',
  },
  outputDir: `${EVIDENCE_DIR}/test-results`,
  projects: [
    {
      name: 'ficosha-chromium',
      testIgnore: '**/button-audit.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ficosha-button-audit',
      testMatch: '**/button-audit.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        video: 'on',
        screenshot: 'on',
        trace: 'on',
      },
    },
  ],
});
