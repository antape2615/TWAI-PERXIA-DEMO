import { defineConfig, devices } from '@playwright/test';
import { HU_ARQ_001, EVIDENCE_DIR as FICOHSA_EVIDENCE } from './e2e/ficosha/config';
import { JARDIN_AZUAYO, EVIDENCE_DIR as JA_EVIDENCE } from './e2e/jardin-azuayo/config';

const isJardinAzuayo = process.env.E2E_SUITE === 'jardin-azuayo'
  || process.argv.some((a) => a.includes('jardin-azuayo'));

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: isJardinAzuayo ? 600_000 : 90_000,
  reporter: [
    ['list'],
    ['json', { outputFile: `${isJardinAzuayo ? JA_EVIDENCE : FICOHSA_EVIDENCE}/playwright-report.json` }],
    ['html', {
      outputFile: `${isJardinAzuayo ? JA_EVIDENCE : FICOHSA_EVIDENCE}/html-report/index.html`,
      open: 'never',
    }],
  ],
  use: {
    trace: isJardinAzuayo ? 'on' : 'retain-on-failure',
    screenshot: isJardinAzuayo ? 'on' : 'only-on-failure',
    video: isJardinAzuayo ? 'on' : 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    locale: 'es-EC',
  },
  outputDir: `${isJardinAzuayo ? JA_EVIDENCE : FICOHSA_EVIDENCE}/test-results`,
  projects: [
    {
      name: 'ficosha-chromium',
      testMatch: '**/ficosha/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: HU_ARQ_001.baseUrl,
      },
    },
    {
      name: 'jardin-azuayo-chromium',
      testMatch: '**/jardin-azuayo/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: JARDIN_AZUAYO.baseUrl,
      },
    },
  ],
});
