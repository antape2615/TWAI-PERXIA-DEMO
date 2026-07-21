import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page, Response } from '@playwright/test';
import {
  BUTTON_AUDIT,
  EVIDENCE_DIR,
  SCREENSHOTS_DIR,
  TIMINGS_JSON,
} from './config';
import { dismissOverlays, filterCriticalConsoleErrors } from './helpers';

export type ButtonAuditStatus = 'ok' | 'error' | 'skipped';

export interface ButtonAuditEntry {
  id: string;
  pageUrl: string;
  pageTitle: string;
  selector: string;
  text: string;
  tag: string;
  role: string;
  urlBefore: string;
  urlAfter: string;
  status: ButtonAuditStatus;
  skipReason?: string;
  latencyMs: number | null;
  slow: boolean;
  broken: boolean;
  consoleErrors: string[];
  networkErrors: string[];
  screenshotBefore?: string;
  screenshotAfter?: string;
  error?: string;
  measuredAt: string;
}

export interface ButtonAuditReport {
  meta: {
    baseUrl: string;
    auditedAt: string;
    pagesAudited: string[];
    repeatCount: number;
    slowThresholdMs: number;
  };
  summary: {
    total: number;
    ok: number;
    error: number;
    skipped: number;
    slow: number;
    broken: number;
  };
  percentiles: {
    p50: number | null;
    p95: number | null;
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  buttons: ButtonAuditEntry[];
}

const DESTRUCTIVE_PATTERNS = [
  /\blog\s*out\b/i,
  /\bcerrar\s*sesi[oó]n\b/i,
  /\bsign\s*out\b/i,
  /\bpagar\b/i,
  /\bpayment\b/i,
  /\bcheckout\b/i,
  /\beliminar\b/i,
  /\bborrar\b/i,
  /\bdelete\b/i,
  /\bconfirmar\s*pago\b/i,
  /\benviar\s*solicitud\b/i,
  /\bsubmit\s*payment\b/i,
  /\btransferir\b/i,
  /\bretirar\b/i,
];

const SKIP_HREF_PATTERNS = [
  /^mailto:/i,
  /^tel:/i,
  /^javascript:void/i,
  /^#/,
];

const BUTTON_SELECTORS = [
  'button:visible',
  'input[type="submit"]:visible',
  'input[type="button"]:visible',
  'a[role="button"]:visible',
  '[role="button"]:visible',
  'a.btn:visible',
  'a.button:visible',
  'a[class*="cta"]:visible',
  'a[class*="CTA"]:visible',
].join(', ');

let entryCounter = 0;

export function ensureButtonAuditDirs(): void {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  fs.mkdirSync(`${EVIDENCE_DIR}/video`, { recursive: true });
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

export function resetButtonAuditCounter(): void {
  entryCounter = 0;
}

function nextButtonId(): string {
  entryCounter += 1;
  return `BTN-${String(entryCounter).padStart(4, '0')}`;
}

export function isDestructiveAction(text: string, href?: string | null): string | null {
  const combined = `${text} ${href ?? ''}`.trim();
  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(combined)) {
      return `Acción potencialmente destructiva: coincide con /${pattern.source}/`;
    }
  }
  if (href) {
    for (const pattern of SKIP_HREF_PATTERNS) {
      if (pattern.test(href)) {
        return `Enlace no seguro para click automático (${href})`;
      }
    }
  }
  return null;
}

export function isInternalUrl(url: string, baseUrl: string): boolean {
  try {
    const parsed = new URL(url, baseUrl);
    const base = new URL(baseUrl);
    return parsed.hostname === base.hostname;
  } catch {
    return false;
  }
}

export async function discoverKeyPages(page: Page, baseUrl: string): Promise<string[]> {
  const pages = new Set<string>(['/']);
  const navLinks = page.locator(
    [
      '[role="banner"] a[href]',
      'nav a[href]',
      'header a[href]',
      'footer a[href]',
      'a[href^="/"]',
      `a[href*="${new URL(baseUrl).hostname}"]`,
    ].join(', '),
  );

  const count = await navLinks.count();
  for (let i = 0; i < count; i++) {
    const href = await navLinks.nth(i).getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

    const absolute = new URL(href, baseUrl).href;
    if (!isInternalUrl(absolute, baseUrl)) continue;
    if (/\.(pdf|zip|docx?|xlsx?)(\?|$)/i.test(absolute)) continue;

    const pathname = new URL(absolute).pathname || '/';
    pages.add(pathname);
    if (pages.size >= BUTTON_AUDIT.maxPages) break;
  }

  return [...pages];
}

export interface DiscoveredButton {
  locator: Locator;
  selector: string;
  text: string;
  tag: string;
  role: string;
  href: string | null;
  index: number;
}

export async function discoverButtons(page: Page): Promise<DiscoveredButton[]> {
  const locators = page.locator(BUTTON_SELECTORS);
  const count = await locators.count();
  const seen = new Set<string>();
  const discovered: DiscoveredButton[] = [];

  for (let i = 0; i < count; i++) {
    const locator = locators.nth(i);
    const visible = await locator.isVisible().catch(() => false);
    if (!visible) continue;

    const box = await locator.boundingBox().catch(() => null);
    if (!box || box.width < 2 || box.height < 2) continue;

    const text = ((await locator.innerText().catch(() => '')) ||
      (await locator.getAttribute('aria-label')) ||
      (await locator.getAttribute('title')) ||
      (await locator.getAttribute('value')) ||
      '').trim().replace(/\s+/g, ' ').slice(0, 120);

    const tag = await locator.evaluate((el) => el.tagName.toLowerCase()).catch(() => 'unknown');
    const role = (await locator.getAttribute('role')) || tag;
    const href = tag === 'a' ? await locator.getAttribute('href') : null;

    const fingerprint = `${tag}|${role}|${text}|${href ?? ''}|${Math.round(box.x)}|${Math.round(box.y)}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    const selector = await locator.evaluate((el) => {
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && node !== document.body) {
        let part = node.tagName.toLowerCase();
        if (node.id) {
          part += `#${node.id}`;
          parts.unshift(part);
          break;
        }
        const parent = node.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter((c) => c.tagName === node!.tagName);
          if (siblings.length > 1) {
            part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
          }
        }
        parts.unshift(part);
        node = parent;
      }
      return parts.join(' > ');
    }).catch(() => `${tag}[data-audit-index="${i}"]`);

    discovered.push({
      locator,
      selector,
      text: text || `(sin texto #${i + 1})`,
      tag,
      role,
      href,
      index: i,
    });

    if (discovered.length >= BUTTON_AUDIT.maxButtonsPerPage) break;
  }

  return discovered;
}

async function captureButtonScreenshot(
  page: Page,
  buttonId: string,
  phase: 'before' | 'after',
): Promise<string> {
  ensureButtonAuditDirs();
  const filename = `${buttonId}-${phase}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}

async function waitForUiSettle(page: Page, urlBefore: string): Promise<void> {
  const navigationPromise = page
    .waitForURL((url) => url.href !== urlBefore, { timeout: BUTTON_AUDIT.settleTimeoutMs })
    .catch(() => null);

  const networkIdlePromise = page
    .waitForLoadState('networkidle', { timeout: BUTTON_AUDIT.settleTimeoutMs })
    .catch(() => null);

  await Promise.race([
    navigationPromise,
    networkIdlePromise,
    page.waitForTimeout(BUTTON_AUDIT.minSettleMs),
  ]);

  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(BUTTON_AUDIT.postClickWaitMs);
}

export async function measureButtonClick(
  page: Page,
  button: DiscoveredButton,
  pageUrl: string,
  pageTitle: string,
): Promise<ButtonAuditEntry> {
  const id = nextButtonId();
  const skipReason = isDestructiveAction(button.text, button.href);
  const baseEntry: ButtonAuditEntry = {
    id,
    pageUrl,
    pageTitle,
    selector: button.selector,
    text: button.text,
    tag: button.tag,
    role: button.role,
    urlBefore: page.url(),
    urlAfter: page.url(),
    status: 'skipped',
    skipReason: skipReason ?? undefined,
    latencyMs: null,
    slow: false,
    broken: false,
    consoleErrors: [],
    networkErrors: [],
    measuredAt: new Date().toISOString(),
  };

  if (skipReason) {
    baseEntry.screenshotBefore = await captureButtonScreenshot(page, id, 'before').catch(() => undefined);
    return baseEntry;
  }

  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];
  const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  const onPageError = (err: Error) => consoleErrors.push(err.message);
  const onResponse = (response: Response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !/analytics|googletagmanager|adobe|demdex|hotjar|facebook/i.test(url)) {
      networkErrors.push(`${status} ${url}`);
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  let screenshotBefore: string | undefined;
  let screenshotAfter: string | undefined;

  try {
    const urlBefore = page.url();
    baseEntry.urlBefore = urlBefore;
    screenshotBefore = await captureButtonScreenshot(page, id, 'before');

    const clickStart = Date.now();
    await button.locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await button.locator.click({ timeout: BUTTON_AUDIT.clickTimeoutMs });
    await waitForUiSettle(page, urlBefore);

    const latencyMs = Date.now() - clickStart;
    baseEntry.latencyMs = latencyMs;
    baseEntry.urlAfter = page.url();
    baseEntry.slow = latencyMs > BUTTON_AUDIT.slowThresholdMs;
    baseEntry.status = 'ok';
    screenshotAfter = await captureButtonScreenshot(page, id, 'after');
  } catch (err) {
    baseEntry.status = 'error';
    baseEntry.broken = true;
    baseEntry.error = err instanceof Error ? err.message : String(err);
    baseEntry.urlAfter = page.url();
    screenshotAfter = await captureButtonScreenshot(page, id, 'after').catch(() => undefined);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('response', onResponse);
    baseEntry.consoleErrors = filterCriticalConsoleErrors(consoleErrors);
    baseEntry.networkErrors = [...new Set(networkErrors)].slice(0, 10);
    baseEntry.screenshotBefore = screenshotBefore;
    baseEntry.screenshotAfter = screenshotAfter;
  }

  return baseEntry;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function buildAuditReport(
  entries: ButtonAuditEntry[],
  pagesAudited: string[],
  repeatCount: number,
): ButtonAuditReport {
  const latencies = entries
    .map((e) => e.latencyMs)
    .filter((v): v is number => typeof v === 'number');

  const summary = {
    total: entries.length,
    ok: entries.filter((e) => e.status === 'ok').length,
    error: entries.filter((e) => e.status === 'error').length,
    skipped: entries.filter((e) => e.status === 'skipped').length,
    slow: entries.filter((e) => e.slow).length,
    broken: entries.filter((e) => e.broken).length,
  };

  return {
    meta: {
      baseUrl: BUTTON_AUDIT.baseUrl,
      auditedAt: new Date().toISOString(),
      pagesAudited,
      repeatCount,
      slowThresholdMs: BUTTON_AUDIT.slowThresholdMs,
    },
    summary,
    percentiles: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      min: latencies.length ? Math.min(...latencies) : null,
      max: latencies.length ? Math.max(...latencies) : null,
      avg: latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null,
    },
    buttons: entries,
  };
}

export function writeTimingsJson(report: ButtonAuditReport): void {
  ensureButtonAuditDirs();
  fs.writeFileSync(TIMINGS_JSON, JSON.stringify(report, null, 2), 'utf-8');
}

export function writeCsvReport(report: ButtonAuditReport): string {
  const csvPath = path.join(EVIDENCE_DIR, 'button-audit.csv');
  const header = [
    'id',
    'pageUrl',
    'text',
    'selector',
    'tag',
    'status',
    'latencyMs',
    'slow',
    'broken',
    'urlBefore',
    'urlAfter',
    'skipReason',
    'error',
    'consoleErrors',
    'networkErrors',
  ].join(',');

  const rows = report.buttons.map((b) =>
    [
      b.id,
      b.pageUrl,
      `"${b.text.replace(/"/g, '""')}"`,
      `"${b.selector.replace(/"/g, '""')}"`,
      b.tag,
      b.status,
      b.latencyMs ?? '',
      b.slow ? 'yes' : 'no',
      b.broken ? 'yes' : 'no',
      b.urlBefore,
      b.urlAfter,
      b.skipReason ? `"${b.skipReason.replace(/"/g, '""')}"` : '',
      b.error ? `"${b.error.replace(/"/g, '""')}"` : '',
      `"${b.consoleErrors.join('; ').replace(/"/g, '""')}"`,
      `"${b.networkErrors.join('; ').replace(/"/g, '""')}"`,
    ].join(','),
  );

  fs.writeFileSync(csvPath, [header, ...rows].join('\n'), 'utf-8');
  return csvPath;
}

export function writeMarkdownReport(report: ButtonAuditReport): string {
  const mdPath = path.join(EVIDENCE_DIR, 'button-audit.md');
  const lines = [
    '# Auditoría de botones — Ficohsa',
    '',
    `- **BASE_URL:** ${report.meta.baseUrl}`,
    `- **Fecha:** ${report.meta.auditedAt}`,
    `- **Páginas auditadas:** ${report.meta.pagesAudited.length}`,
    `- **Umbral lento:** > ${report.meta.slowThresholdMs} ms`,
    '',
    '## Resumen',
    '',
    `| Métrica | Valor |`,
    `|---------|-------|`,
    `| Total botones | ${report.summary.total} |`,
    `| OK | ${report.summary.ok} |`,
    `| Error | ${report.summary.error} |`,
    `| Skipped | ${report.summary.skipped} |`,
    `| Lentos (>${report.meta.slowThresholdMs}ms) | ${report.summary.slow} |`,
    `| Rotos | ${report.summary.broken} |`,
    '',
    '## Percentiles de latencia (ms)',
    '',
    `| p50 | p95 | min | max | avg |`,
    `|-----|-----|-----|-----|-----|`,
    `| ${report.percentiles.p50 ?? '—'} | ${report.percentiles.p95 ?? '—'} | ${report.percentiles.min ?? '—'} | ${report.percentiles.max ?? '—'} | ${report.percentiles.avg ?? '—'} |`,
    '',
    '## Detalle por botón',
    '',
    '| ID | Página | Texto | Status | Latencia (ms) | Lento | Roto |',
    '|----|--------|-------|--------|---------------|-------|------|',
  ];

  for (const b of report.buttons) {
    const slowFlag = b.slow ? '⚠️' : '';
    const brokenFlag = b.broken ? '❌' : '';
    lines.push(
      `| ${b.id} | ${b.pageUrl} | ${b.text.slice(0, 40)} | ${b.status} | ${b.latencyMs ?? '—'} | ${slowFlag} | ${brokenFlag} |`,
    );
  }

  const slowButtons = report.buttons.filter((b) => b.slow);
  if (slowButtons.length > 0) {
    lines.push('', '## Botones lentos (>2s)', '');
    for (const b of slowButtons) {
      lines.push(`- **${b.id}** "${b.text}" — ${b.latencyMs} ms en ${b.pageUrl}`);
    }
  }

  const brokenButtons = report.buttons.filter((b) => b.broken);
  if (brokenButtons.length > 0) {
    lines.push('', '## Botones rotos / con error', '');
    for (const b of brokenButtons) {
      lines.push(`- **${b.id}** "${b.text}" — ${b.error ?? 'error desconocido'}`);
    }
  }

  fs.writeFileSync(mdPath, lines.join('\n'), 'utf-8');
  return mdPath;
}

export async function preparePageForAudit(page: Page, targetPath: string, baseUrl: string): Promise<string> {
  const url = new URL(targetPath, baseUrl).href;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissOverlays(page);
  await page.waitForTimeout(800);
  return page.url();
}
