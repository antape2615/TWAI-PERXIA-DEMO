import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { SCREENSHOTS_DIR } from './config';
import {
  ACTIONABLE_SELECTORS,
  BUTTON_AUDIT,
  BUTTON_REPORT_CSV,
  BUTTON_REPORT_MD,
  SKIP_PATTERNS,
  TIMINGS_JSON,
} from './button-audit.config';
import { dismissOverlays, ensureEvidenceDirs, filterCriticalConsoleErrors } from './helpers';

export type ButtonStatus = 'ok' | 'error' | 'skipped';

export interface ButtonDescriptor {
  pageUrl: string;
  index: number;
  tagName: string;
  role: string | null;
  text: string;
  ariaLabel: string | null;
  href: string | null;
  selector: string;
  skipReason?: string;
}

export interface ButtonClickResult {
  id: string;
  pageUrl: string;
  selector: string;
  text: string;
  ariaLabel: string | null;
  tagName: string;
  urlBefore: string;
  urlAfter: string;
  status: ButtonStatus;
  skipReason?: string;
  latencyMs: number;
  latenciesMs: number[];
  p50Ms: number | null;
  p95Ms: number | null;
  slow: boolean;
  broken: boolean;
  consoleErrors: string[];
  networkErrors: string[];
  error?: string;
  screenshotBefore?: string;
  screenshotAfter?: string;
}

export interface AuditReport {
  meta: {
    baseUrl: string;
    runAt: string;
    pagesAudited: string[];
    slowThresholdMs: number;
    repetitions: number;
  };
  summary: {
    total: number;
    ok: number;
    error: number;
    skipped: number;
    slow: number;
    broken: number;
    latencyP50Ms: number | null;
    latencyP95Ms: number | null;
  };
  buttons: ButtonClickResult[];
}

function slugify(value: string, maxLen = 48): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen) || 'btn';
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function getSkipReason(descriptor: Pick<ButtonDescriptor, 'text' | 'ariaLabel' | 'href' | 'tagName'>): string | undefined {
  const label = `${descriptor.text} ${descriptor.ariaLabel ?? ''} ${descriptor.href ?? ''}`.trim();
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(label)) {
      return `Acción excluida por política QA: coincide con /${pattern.source}/i`;
    }
  }
  if (descriptor.href) {
    if (descriptor.href.startsWith('mailto:') || descriptor.href.startsWith('tel:')) {
      return 'Enlace mailto/tel — fuera de alcance de click automatizado';
    }
    try {
      const url = new URL(descriptor.href, BUTTON_AUDIT.baseUrl);
      if (!url.hostname.endsWith('grupoficohsa.com') && !url.hostname.endsWith('ficohsa.com')) {
        return `Enlace externo: ${url.hostname}`;
      }
    } catch {
      /* relative link */
    }
  }
  if (descriptor.tagName === 'input' && /file/i.test(descriptor.text)) {
    return 'Input file upload — excluido';
  }
  return undefined;
}

export async function discoverNavPages(page: Page): Promise<string[]> {
  const base = new URL(BUTTON_AUDIT.baseUrl);
  const found = new Set<string>([base.href.replace(/\/$/, '') + '/']);

  const linkSelectors = [
    'header a[href]',
    'nav a[href]',
    '[role="navigation"] a[href]',
    'footer a[href]',
    'a[href^="/"]',
    'a[href*="grupoficohsa.com"]',
  ];

  for (const sel of linkSelectors) {
    const links = page.locator(sel);
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
      try {
        const url = new URL(href, base.href);
        if (!url.hostname.endsWith('grupoficohsa.com') && !url.hostname.endsWith('ficohsa.com')) continue;
        if (/\.(pdf|zip|docx?|xlsx?)$/i.test(url.pathname)) continue;
        found.add(url.origin + url.pathname + (url.search || ''));
      } catch {
        /* ignore */
      }
      if (found.size >= BUTTON_AUDIT.maxPages) break;
    }
    if (found.size >= BUTTON_AUDIT.maxPages) break;
  }

  return [...found].slice(0, BUTTON_AUDIT.maxPages);
}

export async function discoverActionableControls(page: Page, pageUrl: string): Promise<ButtonDescriptor[]> {
  const controls = page.locator(ACTIONABLE_SELECTORS);
  const count = await controls.count();
  const limit = Math.min(count, BUTTON_AUDIT.maxButtonsPerPage);
  const descriptors: ButtonDescriptor[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < limit; index++) {
    const el = controls.nth(index);
    const visible = await el.isVisible().catch(() => false);
    if (!visible) continue;

    const box = await el.boundingBox().catch(() => null);
    if (!box || box.width < 2 || box.height < 2) continue;

    const tagName = await el.evaluate((node) => node.tagName.toLowerCase());
    const role = await el.getAttribute('role');
    const ariaLabel = await el.getAttribute('aria-label');
    const href = tagName === 'a' ? await el.getAttribute('href') : null;
    const text = (await el.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
      || (ariaLabel ?? '')
      || (href ?? `control-${index}`);

    const dedupeKey = `${text}|${href ?? ''}|${tagName}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const descriptor: ButtonDescriptor = {
      pageUrl,
      index,
      tagName,
      role,
      text: text.slice(0, 120),
      ariaLabel,
      href,
      selector: `${ACTIONABLE_SELECTORS} >> nth=${index}`,
    };
    descriptor.skipReason = getSkipReason(descriptor);
    descriptors.push(descriptor);
  }

  return descriptors;
}

async function waitForUiStable(page: Page, urlBefore: string): Promise<void> {
  const navigated = page.url() !== urlBefore;
  const waits: Promise<unknown>[] = [
    page.waitForLoadState('domcontentloaded', { timeout: BUTTON_AUDIT.postClickIdleMs }).catch(() => undefined),
  ];

  if (navigated) {
    waits.push(
      page.waitForLoadState('load', { timeout: BUTTON_AUDIT.postClickIdleMs }).catch(() => undefined),
      page.waitForLoadState('networkidle', { timeout: BUTTON_AUDIT.postClickIdleMs }).catch(() => undefined),
    );
  } else {
    waits.push(page.waitForTimeout(400));
  }

  await Promise.race([
    Promise.all(waits),
    page.waitForTimeout(BUTTON_AUDIT.postClickIdleMs),
  ]);
}

async function captureButtonScreenshot(
  page: Page,
  id: string,
  phase: 'before' | 'after',
): Promise<string> {
  ensureEvidenceDirs();
  const filename = `${id}-${phase}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}

export async function measureButtonClick(
  page: Page,
  descriptor: ButtonDescriptor,
  buttonId: string,
): Promise<ButtonClickResult> {
  const baseResult: ButtonClickResult = {
    id: buttonId,
    pageUrl: descriptor.pageUrl,
    selector: descriptor.selector,
    text: descriptor.text,
    ariaLabel: descriptor.ariaLabel,
    tagName: descriptor.tagName,
    urlBefore: descriptor.pageUrl,
    urlAfter: descriptor.pageUrl,
    status: 'skipped',
    skipReason: descriptor.skipReason,
    latencyMs: 0,
    latenciesMs: [],
    p50Ms: null,
    p95Ms: null,
    slow: false,
    broken: false,
    consoleErrors: [],
    networkErrors: [],
  };

  if (descriptor.skipReason) {
    return baseResult;
  }

  const latenciesMs: number[] = [];
  const allConsoleErrors: string[] = [];
  const allNetworkErrors: string[] = [];
  let lastError: string | undefined;
  let urlBefore = '';
  let urlAfter = '';
  let screenshotBefore: string | undefined;
  let screenshotAfter: string | undefined;

  for (let rep = 0; rep < BUTTON_AUDIT.repetitions; rep++) {
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    const onConsole = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    };
    const onPageError = (err: Error) => consoleErrors.push(err.message);
    const onResponse = (response: { status: () => number; url: () => string }) => {
      const status = response.status();
      const url = response.url();
      if (status >= 400 && !/analytics|googletagmanager|adobe|demdex|hotjar|facebook/i.test(url)) {
        networkErrors.push(`${status} ${url}`);
      }
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    try {
      await page.goto(descriptor.pageUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await dismissOverlays(page);

      const controls = page.locator(ACTIONABLE_SELECTORS);
      const el = controls.nth(descriptor.index);
      await el.scrollIntoViewIfNeeded().catch(() => undefined);

      const enabled = await el.isEnabled().catch(() => false);
      if (!enabled) {
        lastError = 'Control deshabilitado';
        break;
      }

      urlBefore = page.url();
      if (rep === 0) {
        screenshotBefore = await captureButtonScreenshot(page, buttonId, 'before');
      }

      const start = Date.now();
      await el.click({ timeout: 10_000 });
      await waitForUiStable(page, urlBefore);
      const latency = Date.now() - start;
      latenciesMs.push(latency);

      urlAfter = page.url();
      if (rep === BUTTON_AUDIT.repetitions - 1) {
        screenshotAfter = await captureButtonScreenshot(page, buttonId, 'after');
      }

      if (urlAfter !== urlBefore && urlAfter !== descriptor.pageUrl) {
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined);
        await dismissOverlays(page);
      } else if (urlAfter !== descriptor.pageUrl) {
        await page.goto(descriptor.pageUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => undefined);
        await dismissOverlays(page);
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (latenciesMs.length === 0) latenciesMs.push(0);
      break;
    } finally {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('response', onResponse);
      allConsoleErrors.push(...filterCriticalConsoleErrors(consoleErrors));
      allNetworkErrors.push(...networkErrors);
    }
  }

  const p50Ms = percentile(latenciesMs, 50);
  const p95Ms = percentile(latenciesMs, 95);
  const latencyMs = p50Ms ?? latenciesMs[0] ?? 0;
  const broken = Boolean(lastError) || allNetworkErrors.some((e) => e.startsWith('5'));
  const slow = latencyMs > BUTTON_AUDIT.slowThresholdMs;

  return {
    ...baseResult,
    urlBefore,
    urlAfter,
    status: lastError ? 'error' : 'ok',
    latencyMs,
    latenciesMs,
    p50Ms,
    p95Ms,
    slow,
    broken,
    consoleErrors: [...new Set(allConsoleErrors)],
    networkErrors: [...new Set(allNetworkErrors)],
    error: lastError,
    screenshotBefore,
    screenshotAfter,
  };
}

export function buildAuditReport(pagesAudited: string[], buttons: ButtonClickResult[]): AuditReport {
  const okLatencies = buttons
    .filter((b) => b.status === 'ok')
    .map((b) => b.latencyMs)
    .filter((n) => n > 0);

  return {
    meta: {
      baseUrl: BUTTON_AUDIT.baseUrl,
      runAt: new Date().toISOString(),
      pagesAudited,
      slowThresholdMs: BUTTON_AUDIT.slowThresholdMs,
      repetitions: BUTTON_AUDIT.repetitions,
    },
    summary: {
      total: buttons.length,
      ok: buttons.filter((b) => b.status === 'ok').length,
      error: buttons.filter((b) => b.status === 'error').length,
      skipped: buttons.filter((b) => b.status === 'skipped').length,
      slow: buttons.filter((b) => b.slow && b.status === 'ok').length,
      broken: buttons.filter((b) => b.broken).length,
      latencyP50Ms: percentile(okLatencies, 50),
      latencyP95Ms: percentile(okLatencies, 95),
    },
    buttons,
  };
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function writeAuditArtifacts(report: AuditReport): void {
  ensureEvidenceDirs();
  fs.writeFileSync(TIMINGS_JSON, JSON.stringify(report, null, 2), 'utf-8');

  const csvHeader = [
    'id', 'pageUrl', 'text', 'selector', 'status', 'latencyMs', 'p50Ms', 'p95Ms',
    'slow', 'broken', 'urlBefore', 'urlAfter', 'skipReason', 'error',
    'consoleErrors', 'networkErrors', 'screenshotBefore', 'screenshotAfter',
  ].join(',');

  const csvRows = report.buttons.map((b) => [
    b.id, b.pageUrl, b.text, b.selector, b.status, b.latencyMs, b.p50Ms, b.p95Ms,
    b.slow, b.broken, b.urlBefore, b.urlAfter, b.skipReason ?? '', b.error ?? '',
    b.consoleErrors.join(' | '), b.networkErrors.join(' | '),
    b.screenshotBefore ?? '', b.screenshotAfter ?? '',
  ].map(csvEscape).join(','));

  fs.writeFileSync(BUTTON_REPORT_CSV, [csvHeader, ...csvRows].join('\n'), 'utf-8');

  const mdLines = [
    '# Auditoría de botones — Ficohsa',
    '',
    `**BASE_URL:** ${report.meta.baseUrl}`,
    `**Ejecución:** ${report.meta.runAt}`,
    `**Umbral lento:** >${report.meta.slowThresholdMs} ms`,
    '',
    '## Resumen',
    '',
    '| Métrica | Valor |',
    '|---------|-------|',
    `| Total botones inventariados | ${report.summary.total} |`,
    `| OK | ${report.summary.ok} |`,
    `| Error | ${report.summary.error} |`,
    `| Skipped | ${report.summary.skipped} |`,
    `| Lentos (>${report.meta.slowThresholdMs}ms) | ${report.summary.slow} |`,
    `| Rotos | ${report.summary.broken} |`,
    `| Latencia global p50 | ${report.summary.latencyP50Ms ?? 'N/A'} ms |`,
    `| Latencia global p95 | ${report.summary.latencyP95Ms ?? 'N/A'} ms |`,
    '',
    '## Detalle por botón',
    '',
    '| ID | Texto | Página | Status | Latencia (ms) | p50 | p95 | Lento | Roto |',
    '|----|-------|--------|--------|---------------|-----|-----|-------|------|',
  ];

  for (const b of report.buttons) {
    const slowFlag = b.slow ? '⚠️ Sí' : 'No';
    const brokenFlag = b.broken ? '❌ Sí' : 'No';
    mdLines.push(
      `| ${b.id} | ${b.text.replace(/\|/g, '/')} | ${b.pageUrl} | ${b.status} | ${b.latencyMs} | ${b.p50Ms ?? '-'} | ${b.p95Ms ?? '-'} | ${slowFlag} | ${brokenFlag} |`,
    );
  }

  mdLines.push('', '## Páginas auditadas', '', ...report.meta.pagesAudited.map((p) => `- ${p}`));
  fs.writeFileSync(BUTTON_REPORT_MD, mdLines.join('\n'), 'utf-8');
}

export function makeButtonId(pageUrl: string, descriptor: ButtonDescriptor): string {
  const pageSlug = slugify(new URL(pageUrl).pathname || 'home');
  const textSlug = slugify(descriptor.text || `idx-${descriptor.index}`);
  return `btn-${pageSlug}-${descriptor.index}-${textSlug}`;
}

export async function preparePageForAudit(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 });
  await dismissOverlays(page);
}

export function resetTimingsJson(): void {
  ensureEvidenceDirs();
  if (fs.existsSync(TIMINGS_JSON)) {
    fs.unlinkSync(TIMINGS_JSON);
  }
}
