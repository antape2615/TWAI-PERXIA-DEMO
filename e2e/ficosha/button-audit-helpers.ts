import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { EVIDENCE_DIR, HU_ARQ_001 } from './config';
import { dismissOverlays, filterCriticalConsoleErrors, waitForMainContent } from './helpers';
import type {
  ButtonAuditRecord,
  ButtonAuditSummary,
  ButtonCandidate,
  ButtonKind,
  ButtonTimingSample,
} from './button-audit-types';

export const TIMINGS_JSON = `${EVIDENCE_DIR}/timings.json`;
export const BUTTON_REPORT_MD = `${EVIDENCE_DIR}/button-audit-report.md`;
export const BUTTON_REPORT_CSV = `${EVIDENCE_DIR}/button-audit-report.csv`;
export const BUTTON_SCREENSHOTS_DIR = `${EVIDENCE_DIR}/screenshots/button-audit`;

export const SLOW_THRESHOLD_MS = Number(process.env.BUTTON_SLOW_THRESHOLD_MS ?? 2000);
export const AUDIT_REPEATS = Math.max(1, Number(process.env.BUTTON_AUDIT_REPEATS ?? 1));
export const MAX_PAGES = Number(process.env.BUTTON_AUDIT_MAX_PAGES ?? 12);

const SKIP_TEXT_PATTERNS: RegExp[] = [
  /cerrar\s*sesi[oó]n/i,
  /\blogout\b/i,
  /\bsalir\b/i,
  /eliminar/i,
  /borrar/i,
  /\bdelete\b/i,
  /pagar\s+ahora/i,
  /\bcheckout\b/i,
  /confirmar\s+pago/i,
  /realizar\s+pago/i,
  /transferir\s+fondos/i,
  /enviar\s+solicitud/i,
  /submit\s+payment/i,
];

const SKIP_HREF_PATTERNS: RegExp[] = [
  /^mailto:/i,
  /^tel:/i,
  /^javascript:void/i,
  /\/logout/i,
  /signout/i,
  /sign-out/i,
];

const CTA_CLASS_PATTERNS = /btn|button|cta|primary|secondary|call-to-action|gff-.*button/i;

export function ensureButtonAuditDirs(): void {
  for (const dir of [EVIDENCE_DIR, BUTTON_SCREENSHOTS_DIR, `${EVIDENCE_DIR}/video`]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function slugify(value: string, maxLen = 48): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen) || 'sin-texto';
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function isIgnoredNetworkUrl(url: string): boolean {
  return /analytics|googletagmanager|adobe|demdex|hotjar|facebook|doubleclick|clarity/i.test(url);
}

export function classifyButton(candidate: ButtonCandidate): { safe: boolean; reason?: string } {
  const label = `${candidate.text} ${candidate.ariaLabel}`.trim();

  if (candidate.disabled) {
    return { safe: false, reason: 'Control deshabilitado (no accionable)' };
  }

  for (const pattern of SKIP_TEXT_PATTERNS) {
    if (pattern.test(label)) {
      return { safe: false, reason: `Acción destructiva o irreversible: coincide con /${pattern.source}/` };
    }
  }

  if (candidate.href) {
    for (const pattern of SKIP_HREF_PATTERNS) {
      if (pattern.test(candidate.href)) {
        return { safe: false, reason: `Enlace excluido por patrón href: ${candidate.href}` };
      }
    }

    try {
      const resolved = new URL(candidate.href, HU_ARQ_001.baseUrl);
      const baseHost = new URL(HU_ARQ_001.baseUrl).hostname;
      if (resolved.hostname !== baseHost && !resolved.hostname.endsWith(`.${baseHost.replace('www.', '')}`)) {
        if (candidate.kind === 'cta-link') {
          return { safe: false, reason: `CTA externo (${resolved.hostname}) — fuera de alcance` };
        }
        return { safe: false, reason: `Navegación externa (${resolved.hostname})` };
      }
    } catch {
      return { safe: false, reason: 'href inválido' };
    }
  }

  if (/suscribirme|suscribir|newsletter/i.test(label) && candidate.type === 'submit') {
    return { safe: false, reason: 'Envío de formulario (newsletter) — excluido para evitar datos irreversibles' };
  }

  return { safe: true };
}

export async function discoverKeyPages(page: Page): Promise<string[]> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForMainContent(page);
  await dismissOverlays(page);

  const paths = await page.evaluate((baseUrl) => {
    const base = new URL(baseUrl);
    const seen = new Set<string>(['/']);
    const out: string[] = ['/'];

    const add = (href: string | null) => {
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      try {
        const url = new URL(href, baseUrl);
        if (url.hostname !== base.hostname) return;
        const p = url.pathname.replace(/\/$/, '') || '/';
        if (!seen.has(p)) {
          seen.add(p);
          out.push(p);
        }
      } catch {
        /* ignore */
      }
    };

    const navSelectors = [
      '[role="banner"] a[href]',
      'header a[href]',
      'nav a[href]',
      '.gff-header-menu a[href]',
      'a[href^="/"]',
    ];

    for (const sel of navSelectors) {
      document.querySelectorAll(sel).forEach((el) => add(el.getAttribute('href')));
    }

    return out;
  }, HU_ARQ_001.baseUrl);

  return paths.slice(0, MAX_PAGES);
}

export async function discoverActionables(page: Page): Promise<ButtonCandidate[]> {
  return page.evaluate(() => {
    const isVisible = (el: Element): boolean => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      const style = window.getComputedStyle(htmlEl);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      if (parseFloat(style.pointerEvents) === 0) return false;
      return true;
    };

    const getText = (el: Element): string =>
      (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);

    const getAria = (el: Element): string =>
      el.getAttribute('aria-label')?.trim() || el.getAttribute('title')?.trim() || '';

    const ctaClassRx = /btn|button|cta|primary|secondary|call-to-action|gff-.*button/i;

    const candidates: Array<{
      kind: ButtonKind;
      tagName: string;
      text: string;
      ariaLabel: string;
      href: string | null;
      role: string | null;
      type: string | null;
      disabled: boolean;
      boundingBox: { x: number; y: number; width: number; height: number };
      selectorHint: string;
    }> = [];

    const seen = new Set<string>();

    const push = (
      el: Element,
      kind: ButtonKind,
      selectorHint: string,
    ) => {
      if (!isVisible(el)) return;
      const text = getText(el);
      const ariaLabel = getAria(el);
      if (!text && !ariaLabel) return;

      const rect = (el as HTMLElement).getBoundingClientRect();
      const href = el.getAttribute('href');
      const key = `${kind}|${el.tagName}|${text}|${ariaLabel}|${href ?? ''}|${Math.round(rect.x)}|${Math.round(rect.y)}`;
      if (seen.has(key)) return;
      seen.add(key);

      const htmlEl = el as HTMLButtonElement | HTMLInputElement;
      const disabled =
        htmlEl.hasAttribute('disabled') ||
        htmlEl.getAttribute('aria-disabled') === 'true' ||
        htmlEl.classList.contains('disabled') ||
        htmlEl.classList.contains('gff-newsletter-button-disabled');

      candidates.push({
        kind,
        tagName: el.tagName.toLowerCase(),
        text,
        ariaLabel,
        href,
        role: el.getAttribute('role'),
        type: el.getAttribute('type'),
        disabled,
        boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        selectorHint,
      });
    };

    document.querySelectorAll('button').forEach((el, i) => push(el, 'button', `button:nth-of-type(${i + 1})`));
    document.querySelectorAll('a[role="button"]').forEach((el, i) =>
      push(el, 'role-button', `a[role="button"]:nth-of-type(${i + 1})`),
    );
    document.querySelectorAll('[role="button"]').forEach((el, i) => {
      if (el.tagName === 'A' || el.tagName === 'BUTTON') return;
      push(el, 'role-button', `[role="button"]:nth-of-type(${i + 1})`);
    });
    document.querySelectorAll('input[type="submit"], input[type="button"]').forEach((el, i) => {
      const type = el.getAttribute('type');
      push(el, type === 'submit' ? 'submit' : 'input-button', `input[type="${type}"]:nth-of-type(${i + 1})`);
    });

    document.querySelectorAll('a[href]').forEach((el) => {
      const cls = el.className?.toString?.() || '';
      const inBtnContainer = !!el.closest('[class*="btn"], [class*="button"], [class*="cta"]');
      if (ctaClassRx.test(cls) || inBtnContainer) {
        const text = getText(el);
        push(el, 'cta-link', `a[href="${el.getAttribute('href')}"]:has-text("${text.slice(0, 40)}")`);
      }
    });

    return candidates.map((c, index) => ({
      index,
      ...c,
      selector: c.selectorHint,
    }));
  });
}

function buildPlaywrightLocator(page: Page, candidate: ButtonCandidate): Locator {
  const label = candidate.text || candidate.ariaLabel;

  if (candidate.tagName === 'button') {
    if (label) return page.getByRole('button', { name: label, exact: false }).first();
    return page.locator('button').nth(candidate.index);
  }

  if (candidate.tagName === 'a' && candidate.role === 'button') {
    if (label) return page.getByRole('button', { name: label, exact: false }).first();
    return page.locator('a[role="button"]').nth(candidate.index);
  }

  if (candidate.tagName === 'input') {
    if (label) return page.locator(`input[type="${candidate.type}"]`).filter({ hasText: label }).first();
    return page.locator(`input[type="${candidate.type}"]`).first();
  }

  if (candidate.kind === 'cta-link' && candidate.href) {
    const link = page.locator(`a[href="${candidate.href}"]`);
    if (label) return link.filter({ hasText: label }).first();
    return link.first();
  }

  if (label) return page.getByText(label, { exact: false }).first();
  return page.locator(candidate.selector).first();
}

async function captureButtonScreenshot(
  page: Page,
  pageSlug: string,
  buttonId: string,
  phase: 'before' | 'after',
): Promise<string> {
  ensureButtonAuditDirs();
  const filename = `${pageSlug}__${buttonId}__${phase}.png`;
  const filepath = path.join(BUTTON_SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}

async function stabilizeAfterClick(page: Page, urlBefore: string): Promise<void> {
  await Promise.race([
    page.waitForURL((url) => url.toString() !== urlBefore, { timeout: 12_000 }).catch(() => undefined),
    page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined),
    page.waitForTimeout(2500),
  ]);

  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(350);
}

export async function auditSingleButton(
  page: Page,
  pageUrl: string,
  pageTitle: string,
  candidate: ButtonCandidate,
  repeatIndex: number,
): Promise<ButtonAuditRecord> {
  const pagePath = new URL(pageUrl).pathname || '/';
  const pageSlug = slugify(pagePath === '/' ? 'home' : pagePath);
  const buttonId = `${String(candidate.index).padStart(3, '0')}-${slugify(candidate.text || candidate.ariaLabel || candidate.kind)}`;
  const recordId = `${pageSlug}__${buttonId}`;

  const classification = classifyButton(candidate);
  if (!classification.safe) {
    return {
      id: recordId,
      pageUrl,
      pagePath,
      pageTitle,
      selector: candidate.selector,
      text: candidate.text || candidate.ariaLabel,
      kind: candidate.kind,
      tagName: candidate.tagName,
      urlBefore: pageUrl,
      urlAfter: pageUrl,
      status: 'skipped',
      skipReason: classification.reason,
      latencyMs: 0,
      samples: [],
      p50Ms: null,
      p95Ms: null,
      slow: false,
      broken: false,
      consoleErrors: [],
      networkErrors: [],
      auditedAt: new Date().toISOString(),
    };
  }

  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  const onPageError = (err: Error) => consoleErrors.push(err.message);
  const onResponse = (r: { status: () => number; url: () => string }) => {
    const status = r.status();
    const url = r.url();
    if (status >= 400 && !isIgnoredNetworkUrl(url)) {
      networkErrors.push(`${status} ${url}`);
    }
  };

  let status: 'ok' | 'error' = 'ok';
  let error: string | undefined;
  let latencyMs = 0;
  let urlBefore = pageUrl;
  let urlAfter = pageUrl;
  let screenshotBefore: string | undefined;
  let screenshotAfter: string | undefined;

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForMainContent(page);
    await dismissOverlays(page);

    const locator = buildPlaywrightLocator(page, candidate);
    await locator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);

    const visible = await locator.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) {
      throw new Error('Control no visible en viewport tras recarga');
    }

    screenshotBefore = await captureButtonScreenshot(page, pageSlug, `${buttonId}-r${repeatIndex}`, 'before');

    urlBefore = page.url();
    const start = Date.now();
    await locator.click({ timeout: 10_000 });
    await stabilizeAfterClick(page, urlBefore);
    latencyMs = Date.now() - start;
    urlAfter = page.url();

    screenshotAfter = await captureButtonScreenshot(page, pageSlug, `${buttonId}-r${repeatIndex}`, 'after');
  } catch (err) {
    status = 'error';
    error = err instanceof Error ? err.message : String(err);
    try {
      screenshotAfter = await captureButtonScreenshot(page, pageSlug, `${buttonId}-r${repeatIndex}-error`, 'after');
    } catch {
      /* ignore */
    }
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('response', onResponse);
  }

  const criticalConsole = filterCriticalConsoleErrors(consoleErrors);
  const broken = status === 'error';
  const slow = latencyMs > SLOW_THRESHOLD_MS;

  const sample: ButtonTimingSample = { latencyMs, timestamp: new Date().toISOString() };

  return {
    id: recordId,
    pageUrl,
    pagePath,
    pageTitle,
    selector: candidate.selector,
    text: candidate.text || candidate.ariaLabel,
    kind: candidate.kind,
    tagName: candidate.tagName,
    urlBefore,
    urlAfter,
    status,
    latencyMs,
    samples: [sample],
    p50Ms: latencyMs,
    p95Ms: latencyMs,
    slow,
    broken,
    consoleErrors: criticalConsole,
    networkErrors,
    screenshotBefore,
    screenshotAfter,
    error,
    auditedAt: new Date().toISOString(),
  };
}

export function mergeRepeatRecords(records: ButtonAuditRecord[]): ButtonAuditRecord {
  if (records.length === 1) return records[0];

  const base = { ...records[0] };
  const allSamples = records.flatMap((r) => r.samples);
  const latencies = allSamples.map((s) => s.latencyMs);

  base.samples = allSamples;
  base.latencyMs = latencies[latencies.length - 1];
  base.p50Ms = percentile(latencies, 50);
  base.p95Ms = percentile(latencies, 95);
  base.slow = latencies.some((l) => l > SLOW_THRESHOLD_MS);
  base.broken = records.some((r) => r.broken);
  base.status = records.some((r) => r.status === 'error')
    ? 'error'
    : records.every((r) => r.status === 'skipped')
      ? 'skipped'
      : 'ok';
  base.consoleErrors = [...new Set(records.flatMap((r) => r.consoleErrors))];
  base.networkErrors = [...new Set(records.flatMap((r) => r.networkErrors))];
  base.error = records.find((r) => r.error)?.error;

  return base;
}

export function buildSummary(records: ButtonAuditRecord[], pagesVisited: string[]): ButtonAuditSummary {
  const okLatencies = records.filter((r) => r.status === 'ok').map((r) => r.latencyMs);

  return {
    baseUrl: HU_ARQ_001.baseUrl,
    auditedAt: new Date().toISOString(),
    pagesVisited,
    totalButtons: records.length,
    ok: records.filter((r) => r.status === 'ok').length,
    error: records.filter((r) => r.status === 'error').length,
    skipped: records.filter((r) => r.status === 'skipped').length,
    slow: records.filter((r) => r.slow).length,
    broken: records.filter((r) => r.broken).length,
    globalP50Ms: percentile(okLatencies, 50),
    globalP95Ms: percentile(okLatencies, 95),
    records,
  };
}

export function writeTimingsJson(summary: ButtonAuditSummary): void {
  ensureButtonAuditDirs();
  fs.writeFileSync(TIMINGS_JSON, JSON.stringify(summary, null, 2), 'utf-8');
}

export function writeMarkdownReport(summary: ButtonAuditSummary): void {
  const lines: string[] = [
    '# Auditoría de botones — Ficohsa',
    '',
    `**BASE_URL:** ${summary.baseUrl}`,
    `**Fecha:** ${summary.auditedAt}`,
    `**Páginas visitadas:** ${summary.pagesVisited.length}`,
    '',
    '## Resumen',
    '',
    '| Métrica | Valor |',
    '|---------|-------|',
    `| Total botones | ${summary.totalButtons} |`,
    `| OK | ${summary.ok} |`,
    `| Error | ${summary.error} |`,
    `| Skipped | ${summary.skipped} |`,
    `| Lentos (>${SLOW_THRESHOLD_MS}ms) | ${summary.slow} |`,
    `| Rotos | ${summary.broken} |`,
    `| p50 global (ok) | ${summary.globalP50Ms ?? '—'} ms |`,
    `| p95 global (ok) | ${summary.globalP95Ms ?? '—'} ms |`,
    '',
    '## Detalle por botón',
    '',
    '| ID | Página | Texto | Estado | Latencia (ms) | p50 | p95 | Lento | Roto | URL después |',
    '|----|--------|-------|--------|---------------|-----|-----|-------|------|-------------|',
  ];

  for (const r of summary.records) {
    lines.push(
      `| ${r.id} | ${r.pagePath} | ${r.text.replace(/\|/g, '/')} | ${r.status} | ${r.latencyMs} | ${r.p50Ms ?? '—'} | ${r.p95Ms ?? '—'} | ${r.slow ? '⚠️' : ''} | ${r.broken ? '❌' : ''} | ${r.urlAfter} |`,
    );
  }

  lines.push('', '## Skipped / errores', '');
  for (const r of summary.records.filter((x) => x.status !== 'ok')) {
    lines.push(`- **${r.id}** (${r.status}): ${r.skipReason || r.error || '—'}`);
  }

  fs.writeFileSync(BUTTON_REPORT_MD, lines.join('\n'), 'utf-8');
}

export function writeCsvReport(summary: ButtonAuditSummary): void {
  const header =
    'id,page_path,text,kind,status,latency_ms,p50_ms,p95_ms,slow,broken,url_before,url_after,skip_reason,error,console_errors,network_errors';
  const rows = summary.records.map((r) => {
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [
      r.id,
      r.pagePath,
      r.text,
      r.kind,
      r.status,
      r.latencyMs,
      r.p50Ms ?? '',
      r.p95Ms ?? '',
      r.slow,
      r.broken,
      r.urlBefore,
      r.urlAfter,
      r.skipReason ?? '',
      r.error ?? '',
      r.consoleErrors.join('; '),
      r.networkErrors.join('; '),
    ]
      .map((c) => (typeof c === 'string' ? esc(c) : c))
      .join(',');
  });

  fs.writeFileSync(BUTTON_REPORT_CSV, [header, ...rows].join('\n'), 'utf-8');
}

export async function auditPageButtons(
  page: Page,
  pagePath: string,
): Promise<ButtonAuditRecord[]> {
  const pageUrl = new URL(pagePath, HU_ARQ_001.baseUrl).href;

  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForMainContent(page);
  await dismissOverlays(page);

  const pageTitle = await page.title();
  const candidates = await discoverActionables(page);
  const records: ButtonAuditRecord[] = [];

  for (const candidate of candidates) {
    const repeatResults: ButtonAuditRecord[] = [];
    for (let i = 0; i < AUDIT_REPEATS; i++) {
      const result = await auditSingleButton(page, pageUrl, pageTitle, candidate, i + 1);
      repeatResults.push(result);
      if (result.status === 'skipped') break;
    }
    records.push(mergeRepeatRecords(repeatResults));
  }

  return records;
}
