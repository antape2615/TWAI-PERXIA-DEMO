import fs from 'node:fs';
import path from 'node:path';
import type { Page, Response } from '@playwright/test';
import { SCREENSHOTS_DIR, RESULTS_JSON } from './config';

export interface TestEvidence {
  id: string;
  titulo: string;
  criterio: string;
  regla: string;
  status: 'passed' | 'failed' | 'skipped';
  duracionMs: number;
  screenshot?: string;
  video?: string;
  detalles: Record<string, unknown>;
  error?: string;
}

const evidenceResults: TestEvidence[] = [];

export function ensureEvidenceDirs(): void {
  for (const dir of [SCREENSHOTS_DIR, 'evidence/video', 'evidence']) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function dismissOverlays(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Aceptar")',
    'button:has-text("Aceptar todas")',
    'button:has-text("Aceptar cookies")',
    'button:has-text("Entendido")',
    '#onetrust-accept-btn-handler',
    '.ot-pc-refuse-all-handler',
    '[aria-label="Cerrar"]',
    'button.close',
  ];

  for (const selector of selectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    }
  }
}

export async function captureScreenshot(
  page: Page,
  testId: string,
  suffix = 'happy-path',
): Promise<string> {
  ensureEvidenceDirs();
  const filename = `${testId}-${suffix}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}

export function recordEvidence(entry: TestEvidence): void {
  evidenceResults.push(entry);
  ensureEvidenceDirs();
  fs.writeFileSync(RESULTS_JSON, JSON.stringify(evidenceResults, null, 2), 'utf-8');
}

export function getConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

export function filterCriticalConsoleErrors(errors: string[]): string[] {
  const ignored = [
    /favicon/i,
    /third-party cookie/i,
    /content-security-policy/i,
    /net::ERR_BLOCKED_BY_CLIENT/i,
    /Failed to load resource.*analytics/i,
    /googletagmanager/i,
    /adobe/i,
    /demdex/i,
  ];
  return errors.filter((e) => !ignored.some((rx) => rx.test(e)));
}

export function collectFailedResponses(responses: Response[]): Response[] {
  return responses.filter((r) => {
    const url = r.url();
    const status = r.status();
    if (status < 400) return false;
    if (/analytics|googletagmanager|adobe|demdex|hotjar|facebook/i.test(url)) return false;
    return true;
  });
}

export async function waitForMainContent(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });
  const mainSelectors = [
    'header',
    'nav',
    'main',
    '[role="main"]',
    '.header',
    '#header',
  ];
  for (const sel of mainSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
      return;
    }
  }
  await page.locator('body *').first().waitFor({ state: 'visible', timeout: 5000 });
}
