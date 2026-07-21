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

export function resetEvidenceResults(): void {
  ensureEvidenceDirs();
  if (fs.existsSync(RESULTS_JSON)) {
    fs.unlinkSync(RESULTS_JSON);
  }
}

export function recordEvidence(entry: TestEvidence): void {
  ensureEvidenceDirs();
  let existing: TestEvidence[] = [];
  if (fs.existsSync(RESULTS_JSON)) {
    try {
      existing = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8'));
    } catch {
      existing = [];
    }
  }
  const idx = existing.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.push(entry);
  }
  fs.writeFileSync(RESULTS_JSON, JSON.stringify(existing, null, 2), 'utf-8');
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

  const ficohsaSelectors = [
    '[role="banner"]',
    'img[alt*="Ficohsa" i]',
    'a[href*="grupoficohsa.com"]',
    'text=TE DAMOS LA BIENVENIDA',
    'button:has-text("Acerca de Ficohsa")',
    'text=Acerca de Ficohsa',
    'h1:visible',
    'h2:visible',
    'h3:visible',
    'p:visible',
  ];

  for (const sel of ficohsaSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      return;
    }
  }

  await page.waitForFunction(
    () => (document.body?.innerText?.trim().length ?? 0) > 50,
    { timeout: 10_000 },
  );
}
