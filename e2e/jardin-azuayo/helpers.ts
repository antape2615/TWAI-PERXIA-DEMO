import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page, Response } from '@playwright/test';
import {
  JARDIN_AZUAYO,
  SCREENSHOTS_DIR,
  TIMINGS_JSON,
  REPORT_CSV,
  REPORT_MD,
} from './config';

export type ButtonStatus = 'ok' | 'error' | 'skipped';

export interface ButtonTiming {
  id: string;
  pageUrl: string;
  pageTitle: string;
  selector: string;
  text: string;
  tagName: string;
  role: string | null;
  href: string | null;
  urlBefore: string;
  urlAfter: string;
  status: ButtonStatus;
  skipReason?: string;
  latencyMs: number;
  latenciesMs: number[];
  p50Ms?: number;
  p95Ms?: number;
  slow: boolean;
  consoleErrors: string[];
  networkErrors: string[];
  screenshotBefore?: string;
  screenshotAfter?: string;
  error?: string;
  timestamp: string;
}

const timings: ButtonTiming[] = [];
let buttonCounter = 0;

const SKIP_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /cerrar\s*sesi[oó]n|logout|sign\s*out/i, reason: 'Acción destructiva: cierre de sesión' },
  { pattern: /eliminar|borrar|delete|suprimir/i, reason: 'Acción destructiva: eliminación' },
  { pattern: /pagar\s*ahora|realizar\s*pago|confirmar\s*pago|transferir\s*fondos/i, reason: 'Pago real / transferencia irreversible' },
  { pattern: /enviar\s*denuncia|submit\s*complaint/i, reason: 'Envío irreversible de denuncia' },
  { pattern: /descargar\s*estado\s*de\s*cuenta/i, reason: 'Descarga sensible — fuera de alcance' },
];

const CTA_LINK_PATTERNS = [
  'btn',
  'button',
  'cta',
  'Más información',
  'Conoce más',
  'Calcular',
  'Encuéntranos',
  'Escríbenos',
  'Únete',
  'Inscríbete',
  'Descubre',
  'Necesito más información',
];

export function ensureEvidenceDirs(): void {
  for (const dir of [SCREENSHOTS_DIR, 'evidence/video', 'evidence']) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function resetTimings(): void {
  ensureEvidenceDirs();
  timings.length = 0;
  buttonCounter = 0;
  for (const file of [TIMINGS_JSON, REPORT_CSV, REPORT_MD]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

export function getTimings(): ButtonTiming[] {
  return [...timings];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
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
    '.modal button:has-text("Cerrar")',
  ];

  for (const selector of selectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(400);
    }
  }
}

export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible', timeout: 20_000 });
  await dismissOverlays(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
}

export function attachDiagnostics(page: Page): {
  consoleErrors: string[];
  failedResponses: Response[];
} {
  const consoleErrors: string[] = [];
  const failedResponses: Response[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !/analytics|googletagmanager|facebook|hotjar|doubleclick/i.test(url)) {
      failedResponses.push(response);
    }
  });

  return { consoleErrors, failedResponses };
}

export function filterCriticalConsoleErrors(errors: string[]): string[] {
  const ignored = [
    /favicon/i,
    /third-party cookie/i,
    /content-security-policy/i,
    /net::ERR_BLOCKED_BY_CLIENT/i,
    /Failed to load resource.*analytics/i,
    /googletagmanager/i,
  ];
  return errors.filter((e) => !ignored.some((rx) => rx.test(e)));
}

function shouldSkipButton(text: string, href: string | null, type: string | null): { skip: boolean; reason?: string } {
  const combined = `${text} ${href ?? ''} ${type ?? ''}`;
  for (const { pattern, reason } of SKIP_PATTERNS) {
    if (pattern.test(combined)) return { skip: true, reason };
  }
  if (href && /^(mailto:|tel:|javascript:void)/i.test(href)) {
    return { skip: true, reason: 'Enlace no navegable (mailto/tel/javascript)' };
  }
  if (href && /^https?:\/\//i.test(href)) {
    try {
      const host = new URL(href).hostname.replace(/^www\./, '');
      const baseHost = new URL(JARDIN_AZUAYO.baseUrl).hostname.replace(/^www\./, '');
      if (host !== baseHost && !host.endsWith('.jardinazuayo.fin.ec')) {
        return { skip: true, reason: 'Enlace externo (app stores, redes, etc.)' };
      }
    } catch {
      /* ignore */
    }
  }
  return { skip: false };
}

function slugify(value: string, max = 40): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max)
    .toLowerCase() || 'btn';
}

async function getElementMeta(locator: Locator): Promise<{
  selector: string;
  text: string;
  tagName: string;
  role: string | null;
  href: string | null;
  type: string | null;
}> {
  return locator.evaluate((el) => {
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
    const role = el.getAttribute('role');
    const href = tag === 'a' ? (el as HTMLAnchorElement).href || el.getAttribute('href') : null;
    const type = tag === 'input' ? (el as HTMLInputElement).type : null;
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string'
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
      : '';
    const selector = `${tag}${id}${cls}`;
    return { selector, text, tagName: tag, role, href, type };
  });
}

async function isCtaLink(locator: Locator): Promise<boolean> {
  return locator.evaluate((el, patterns) => {
    if (el.tagName !== 'A') return false;
    const cls = (el.className ?? '').toString().toLowerCase();
    const text = (el.textContent ?? '').trim();
    if (cls.includes('btn') || cls.includes('button') || cls.includes('cta')) return true;
    return (patterns as string[]).some((p) => text.includes(p));
  }, CTA_LINK_PATTERNS);
}

export async function discoverKeyPages(page: Page): Promise<string[]> {
  const base = new URL(JARDIN_AZUAYO.baseUrl);
  const baseHost = base.hostname.replace(/^www\./, '');
  const seen = new Set<string>([base.href.replace(/\/$/, '') + '/', base.origin + '/']);
  const pages: string[] = [JARDIN_AZUAYO.baseUrl];

  const navSelectors = [
    'header a[href]',
    'nav a[href]',
    '[role="navigation"] a[href]',
    'footer a[href]',
    '.menu a[href]',
    '.navbar a[href]',
  ];

  for (const sel of navSelectors) {
    const links = page.locator(sel);
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      let absolute: string;
      try {
        absolute = new URL(href, JARDIN_AZUAYO.baseUrl).href;
      } catch {
        continue;
      }
      const host = new URL(absolute).hostname.replace(/^www\./, '');
      if (host !== baseHost && !host.endsWith('.jardinazuayo.fin.ec')) continue;
      const normalized = absolute.split('#')[0];
      if (!seen.has(normalized)) {
        seen.add(normalized);
        pages.push(normalized);
      }
      if (pages.length >= JARDIN_AZUAYO.maxPages) break;
    }
    if (pages.length >= JARDIN_AZUAYO.maxPages) break;
  }

  return pages.slice(0, JARDIN_AZUAYO.maxPages);
}

export async function inventoryActionables(page: Page): Promise<Locator[]> {
  const selectors = [
    'button:visible',
    'a[role="button"]:visible',
    'input[type="submit"]:visible',
    'input[type="button"]:visible',
    '[role="button"]:visible',
  ];

  const locators: Locator[] = [];
  const fingerprints = new Set<string>();

  for (const sel of selectors) {
    const items = page.locator(sel);
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const loc = items.nth(i);
      if (!(await loc.isVisible().catch(() => false))) continue;
      if (!(await loc.isEnabled().catch(() => false))) continue;
      const meta = await getElementMeta(loc);
      const fp = `${meta.tagName}|${meta.text}|${meta.href ?? ''}|${meta.selector}`;
      if (fingerprints.has(fp)) continue;
      fingerprints.add(fp);
      locators.push(loc);
    }
  }

  const links = page.locator('a:visible');
  const linkCount = await links.count();
  for (let i = 0; i < linkCount; i++) {
    const loc = links.nth(i);
    if (!(await loc.isVisible().catch(() => false))) continue;
    if (!(await isCtaLink(loc))) continue;
    const meta = await getElementMeta(loc);
    const fp = `cta|${meta.text}|${meta.href ?? ''}|${meta.selector}`;
    if (fingerprints.has(fp)) continue;
    fingerprints.add(fp);
    locators.push(loc);
  }

  return locators;
}

async function captureButtonScreenshot(
  page: Page,
  timingId: string,
  phase: 'before' | 'after',
): Promise<string> {
  ensureEvidenceDirs();
  const filename = `${timingId}-${phase}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}

async function waitForClickSettle(page: Page, urlBefore: string): Promise<void> {
  const timeout = JARDIN_AZUAYO.clickSettleTimeoutMs;
  await Promise.race([
    page.waitForURL((u) => u.toString() !== urlBefore, { timeout }).catch(() => undefined),
    page.waitForLoadState('networkidle', { timeout }).catch(() => undefined),
    page.waitForFunction(
      () => {
        const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (entries.length > 0 && entries[0].loadEventEnd > 0) return true;
        return document.readyState === 'complete';
      },
      { timeout },
    ).catch(() => undefined),
    page.waitForTimeout(Math.min(timeout, 2500)),
  ]);
  await page.waitForTimeout(300);
}

export async function measureButtonClick(
  page: Page,
  locator: Locator,
  pageUrl: string,
  pageTitle: string,
  consoleErrors: string[],
  failedResponses: Response[],
): Promise<ButtonTiming> {
  buttonCounter += 1;
  const timingId = `JA-BTN-${String(buttonCounter).padStart(4, '0')}`;
  const meta = await getElementMeta(locator);
  const skipCheck = shouldSkipButton(meta.text, meta.href, meta.type);
  const latenciesMs: number[] = [];
  let status: ButtonStatus = 'ok';
  let error: string | undefined;
  let screenshotBefore: string | undefined;
  let screenshotAfter: string | undefined;
  let urlBefore = page.url();
  let urlAfter = page.url();

  if (skipCheck.skip) {
    const entry: ButtonTiming = {
      id: timingId,
      pageUrl,
      pageTitle,
      selector: meta.selector,
      text: meta.text,
      tagName: meta.tagName,
      role: meta.role,
      href: meta.href,
      urlBefore,
      urlAfter: urlBefore,
      status: 'skipped',
      skipReason: skipCheck.reason,
      latencyMs: 0,
      latenciesMs: [],
      slow: false,
      consoleErrors: [],
      networkErrors: [],
      timestamp: new Date().toISOString(),
    };
    timings.push(entry);
    persistTimings();
    return entry;
  }

  const errorsBefore = consoleErrors.length;
  const responsesBefore = failedResponses.length;

  try {
    screenshotBefore = await captureButtonScreenshot(page, timingId, 'before');
    urlBefore = page.url();

    for (let rep = 0; rep < JARDIN_AZUAYO.repetitions; rep++) {
      if (rep > 0) {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        const items = await inventoryActionables(page);
        let target = locator;
        for (const item of items) {
          const m = await getElementMeta(item);
          if (m.text === meta.text && m.selector === meta.selector) {
            target = item;
            break;
          }
        }
        const clickStart = Date.now();
        await target.scrollIntoViewIfNeeded().catch(() => undefined);
        await target.click({ timeout: 10_000 });
        await waitForClickSettle(page, page.url());
        latenciesMs.push(Date.now() - clickStart);
      } else {
        const clickStart = Date.now();
        await locator.scrollIntoViewIfNeeded().catch(() => undefined);
        await locator.click({ timeout: 10_000 });
        await waitForClickSettle(page, urlBefore);
        latenciesMs.push(Date.now() - clickStart);
      }
    }

    urlAfter = page.url();
    screenshotAfter = await captureButtonScreenshot(page, timingId, 'after');
  } catch (err) {
    status = 'error';
    error = err instanceof Error ? err.message : String(err);
    screenshotAfter = await captureButtonScreenshot(page, timingId, 'after').catch(() => undefined);
    urlAfter = page.url();
    if (latenciesMs.length === 0) latenciesMs.push(JARDIN_AZUAYO.clickSettleTimeoutMs);
  }

  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const latencyMs = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
  const p50Ms = sorted.length > 1 ? percentile(sorted, 50) : undefined;
  const p95Ms = sorted.length > 1 ? percentile(sorted, 95) : undefined;
  const slow = latencyMs > JARDIN_AZUAYO.slowThresholdMs;

  const newConsoleErrors = filterCriticalConsoleErrors(consoleErrors.slice(errorsBefore));
  const newNetworkErrors = failedResponses
    .slice(responsesBefore)
    .map((r) => `${r.status()} ${r.url()}`);

  const entry: ButtonTiming = {
    id: timingId,
    pageUrl,
    pageTitle,
    selector: meta.selector,
    text: meta.text,
    tagName: meta.tagName,
    role: meta.role,
    href: meta.href,
    urlBefore,
    urlAfter,
    status,
    latencyMs,
    latenciesMs,
    p50Ms,
    p95Ms,
    slow,
    consoleErrors: newConsoleErrors,
    networkErrors: newNetworkErrors,
    screenshotBefore,
    screenshotAfter,
    error,
    timestamp: new Date().toISOString(),
  };

  timings.push(entry);
  persistTimings();
  return entry;
}

function persistTimings(): void {
  ensureEvidenceDirs();
  fs.writeFileSync(TIMINGS_JSON, JSON.stringify(timings, null, 2), 'utf-8');
}

export function writeTabularReports(): void {
  ensureEvidenceDirs();
  persistTimings();

  const header = [
    'id', 'status', 'slow', 'latencyMs', 'p50Ms', 'p95Ms', 'text', 'selector',
    'pageUrl', 'urlBefore', 'urlAfter', 'skipReason', 'error', 'consoleErrors', 'networkErrors',
  ].join(',');

  const rows = timings.map((t) =>
    [
      t.id,
      t.status,
      t.slow ? 'YES' : 'NO',
      t.latencyMs,
      t.p50Ms ?? '',
      t.p95Ms ?? '',
      `"${(t.text || '').replace(/"/g, '""')}"`,
      `"${t.selector.replace(/"/g, '""')}"`,
      `"${t.pageUrl}"`,
      `"${t.urlBefore}"`,
      `"${t.urlAfter}"`,
      `"${t.skipReason ?? ''}"`,
      `"${(t.error ?? '').replace(/"/g, '""')}"`,
      `"${t.consoleErrors.join('; ').replace(/"/g, '""')}"`,
      `"${t.networkErrors.join('; ').replace(/"/g, '""')}"`,
    ].join(','),
  );

  fs.writeFileSync(REPORT_CSV, [header, ...rows].join('\n'), 'utf-8');

  const ok = timings.filter((t) => t.status === 'ok').length;
  const err = timings.filter((t) => t.status === 'error').length;
  const skipped = timings.filter((t) => t.status === 'skipped').length;
  const slow = timings.filter((t) => t.slow).length;

  const md = [
    '# Auditoría de botones — Jardín Azuayo',
    '',
    `**BASE_URL:** ${JARDIN_AZUAYO.baseUrl}`,
    `**Fecha:** ${new Date().toISOString()}`,
    `**Umbral lento:** > ${JARDIN_AZUAYO.slowThresholdMs} ms`,
    '',
    '## Resumen',
    '',
    `| Métrica | Valor |`,
    `|---------|-------|`,
    `| Total inventariados | ${timings.length} |`,
    `| OK | ${ok} |`,
    `| Error | ${err} |`,
    `| Skipped | ${skipped} |`,
    `| Lentos (>${JARDIN_AZUAYO.slowThresholdMs}ms) | ${slow} |`,
    '',
    '## Detalle por botón',
    '',
    '| ID | Status | Latencia (ms) | p50 | p95 | Lento | Texto | Página |',
    '|----|--------|---------------|-----|-----|-------|-------|--------|',
    ...timings.map((t) =>
      `| ${t.id} | ${t.status}${t.slow ? ' ⚠️' : ''} | ${t.latencyMs} | ${t.p50Ms ?? '-'} | ${t.p95Ms ?? '-'} | ${t.slow ? 'SÍ' : 'NO'} | ${(t.text || '-').slice(0, 40)} | ${t.pageUrl.replace(JARDIN_AZUAYO.baseUrl, '/')} |`,
    ),
    '',
    '## Botones lentos o rotos',
    '',
    ...timings
      .filter((t) => t.slow || t.status === 'error')
      .map((t) => `- **${t.id}** [${t.status}] ${t.text || t.selector} — ${t.latencyMs}ms${t.error ? ` — ${t.error}` : ''}`),
  ].join('\n');

  fs.writeFileSync(REPORT_MD, md, 'utf-8');
}

export function makeTimingId(prefix: string, text: string): string {
  return `${prefix}-${slugify(text)}`;
}
