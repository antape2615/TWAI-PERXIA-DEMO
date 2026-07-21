import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page, Response } from '@playwright/test';
import {
  CSV_REPORT,
  JARDIN_AZUAYO,
  MD_REPORT,
  SCREENSHOTS_DIR,
  TIMINGS_JSON,
} from './config';

export type ButtonStatus = 'ok' | 'error' | 'skipped';

export interface DiscoveredControl {
  index: number;
  tag: string;
  text: string;
  href: string;
  role: string | null;
  className: string;
  selector: string;
  kind: 'button' | 'submit' | 'role-button' | 'cta-link';
}

export interface ButtonAuditResult {
  id: string;
  page: string;
  pageTitle: string;
  selector: string;
  text: string;
  kind: string;
  href: string;
  urlBefore: string;
  urlAfter: string;
  status: ButtonStatus;
  skipReason?: string;
  latencyMs: number;
  latencies: number[];
  p50: number;
  p95: number;
  slow: boolean;
  broken: boolean;
  consoleErrors: string[];
  networkErrors: string[];
  screenshotBefore?: string;
  screenshotAfter?: string;
  error?: string;
}

export interface TimingsReport {
  meta: {
    cliente: string;
    baseUrl: string;
    executedAt: string;
    slowThresholdMs: number;
    repetitions: number;
  };
  pagesVisited: string[];
  results: ButtonAuditResult[];
  summary: {
    total: number;
    ok: number;
    error: number;
    skipped: number;
    slow: number;
    broken: number;
    p50Global: number;
    p95Global: number;
  };
}

const SKIP_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /cerrar\s*sesi[oó]n|logout|salir\s+de\s+cuenta/i, reason: 'Acción destructiva: cierre de sesión' },
  { pattern: /eliminar|borrar|delete|suprimir/i, reason: 'Acción destructiva: eliminación' },
  { pattern: /pagar\s+ahora|confirmar\s+pago|realizar\s+pago|transferir\s+fondos/i, reason: 'Flujo de pago real' },
  { pattern: /enviar\s+solicitud|confirmar\s+env[ií]o|enviar\s+formulario/i, reason: 'Envío irreversible de formulario' },
  { pattern: /whatsapp|wa\.me|api\.whatsapp/i, reason: 'CTA externa WhatsApp (fuera de alcance navegación interna)' },
  { pattern: /mailto:|tel:/i, reason: 'Enlace telefónico/correo (no medible como click UI)' },
  { pattern: /javascript:void|javascript:/i, reason: 'Handler JavaScript inline' },
];

export function ensureEvidenceDirs(): void {
  for (const dir of [SCREENSHOTS_DIR, 'evidence/video', 'evidence']) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function resetTimingsReport(): void {
  ensureEvidenceDirs();
  if (fs.existsSync(TIMINGS_JSON)) {
    fs.unlinkSync(TIMINGS_JSON);
  }
}

export function slugify(value: string, max = 48): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max) || 'control';
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function shouldSkipControl(control: DiscoveredControl): string | null {
  const haystack = `${control.text} ${control.href} ${control.className}`;
  for (const { pattern, reason } of SKIP_PATTERNS) {
    if (pattern.test(haystack)) return reason;
  }
  if (control.href && /^https?:\/\//i.test(control.href)) {
    const baseHost = new URL(JARDIN_AZUAYO.baseUrl).hostname;
    try {
      const linkHost = new URL(control.href).hostname;
      if (linkHost !== baseHost && !linkHost.endsWith('.jardinazuayo.fin.ec')) {
        return `Navegación externa: ${linkHost}`;
      }
    } catch {
      return 'URL externa no válida';
    }
  }
  return null;
}

export async function dismissOverlays(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Aceptar")',
    'button:has-text("Aceptar todas")',
    'button:has-text("Aceptar cookies")',
    'button:has-text("Entendido")',
    '#onetrust-accept-btn-handler',
    '[aria-label="Cerrar"]',
    'button.close',
  ];

  for (const selector of selectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 1200 }).catch(() => false)) {
      await btn.click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(400);
    }
  }
}

export async function waitForUiStable(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

export async function discoverControls(page: Page): Promise<DiscoveredControl[]> {
  return page.evaluate(() => {
    const isVisible = (el: Element): boolean => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0' &&
        style.pointerEvents !== 'none'
      );
    };

    const getText = (el: Element): string =>
      (
        el.textContent ||
        el.getAttribute('aria-label') ||
        el.getAttribute('value') ||
        el.getAttribute('title') ||
        el.getAttribute('alt') ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);

    const buildSelector = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      if (id) return `${tag}${id}`;
      const testId = el.getAttribute('data-testid');
      if (testId) return `[data-testid="${testId}"]`;
      const aria = el.getAttribute('aria-label');
      if (aria) return `${tag}[aria-label="${aria.replace(/"/g, '\\"')}"]`;
      const cls = (el.className?.toString?.() ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join('.');
      const text = getText(el).slice(0, 40);
      if (text) return `${tag}:has-text("${text.replace(/"/g, '\\"')}")`;
      if (cls) return `${tag}.${cls}`;
      return tag;
    };

    const results: DiscoveredControl[] = [];
    const seen = new Set<string>();

    const push = (el: Element, kind: DiscoveredControl['kind']) => {
      if (!isVisible(el)) return;
      const text = getText(el);
      const href = el.getAttribute('href') ?? '';
      const className = el.className?.toString?.() ?? '';
      const role = el.getAttribute('role');
      const selector = buildSelector(el);
      const key = `${el.tagName}|${text}|${href}|${selector}`;
      if (seen.has(key)) return;
      seen.add(key);
      results.push({
        index: results.length,
        tag: el.tagName,
        text: text || `[${el.tagName.toLowerCase()} sin texto]`,
        href,
        role,
        className: className.slice(0, 120),
        selector,
        kind,
      });
    };

    const structuralSelectors = [
      'button',
      'a[role="button"]',
      'input[type="submit"]',
      'input[type="button"]',
      '[role="button"]',
    ];
    for (const sel of structuralSelectors) {
      document.querySelectorAll(sel).forEach((el) => push(el, sel.includes('submit') ? 'submit' : 'button'));
    }

    const ctaSelectors = [
      'a.btn',
      'a.button',
      '.btn',
      '.button',
      'a[class*="btn"]',
      '[class*="cta"]',
      'a.wp-block-button__link',
    ];
    for (const sel of ctaSelectors) {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'A') push(el, 'cta-link');
      });
    }

    document.querySelectorAll('main a, .content a, article a, section a, .elementor-widget a').forEach((el) => {
      if (el.tagName !== 'A' || !isVisible(el)) return;
      const text = getText(el);
      const className = el.className?.toString?.() ?? '';
      const looksLikeButton =
        /btn|button|cta|primary|secondary|ver m[aá]s|saber m[aá]s|conoce|solicita|ingresa|descarga|calcular|m[aá]s informaci[oó]n|necesito/i.test(
          `${text} ${className}`,
        );
      if (looksLikeButton) push(el, 'cta-link');
    });

    return results.map((item, index) => ({ ...item, index }));
  });
}

export function resolveLocator(page: Page, control: DiscoveredControl): Locator {
  if (control.href) {
    const hrefLocator = page.locator(`a[href="${control.href}"]`).first();
    return hrefLocator;
  }
  if (control.selector && !control.selector.startsWith('button:has-text') && control.selector !== 'button') {
    return page.locator(control.selector).first();
  }
  if (control.text && !control.text.startsWith('[')) {
    return page.locator(`${control.tag.toLowerCase()}:visible`).filter({ hasText: control.text }).nth(control.index);
  }
  return page.locator(control.selector).first();
}

export function filterCriticalConsoleErrors(errors: string[]): string[] {
  const ignored = [
    /favicon/i,
    /third-party cookie/i,
    /content-security-policy/i,
    /net::ERR_BLOCKED_BY_CLIENT/i,
    /Failed to load resource.*analytics/i,
    /googletagmanager/i,
    /jquery/i,
    /deprecated/i,
  ];
  return errors.filter((e) => !ignored.some((rx) => rx.test(e)));
}

export function collectNetworkErrors(responses: Response[]): string[] {
  return responses
    .filter((r) => {
      const status = r.status();
      if (status < 400) return false;
      const url = r.url();
      if (/analytics|googletagmanager|facebook|hotjar|doubleclick/i.test(url)) return false;
      return true;
    })
    .map((r) => `${r.status()} ${r.url()}`);
}

export async function captureButtonScreenshot(
  page: Page,
  pagePath: string,
  control: DiscoveredControl,
  phase: 'before' | 'after',
): Promise<string> {
  ensureEvidenceDirs();
  const pageSlug = slugify(pagePath === '/' ? 'home' : pagePath.replace(/\//g, '-'));
  const textSlug = slugify(control.text);
  const filename = `${pageSlug}-${String(control.index).padStart(2, '0')}-${textSlug}-${phase}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}

export function writeTimingsReport(report: TimingsReport): void {
  ensureEvidenceDirs();
  fs.writeFileSync(TIMINGS_JSON, JSON.stringify(report, null, 2), 'utf-8');
  writeCsvReport(report);
  writeMarkdownReport(report);
}

function csvEscape(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function writeCsvReport(report: TimingsReport): void {
  const header = [
    'id',
    'page',
    'text',
    'selector',
    'kind',
    'status',
    'latencyMs',
    'p50',
    'p95',
    'slow',
    'broken',
    'urlBefore',
    'urlAfter',
    'skipReason',
    'error',
  ];
  const lines = [header.join(',')];
  for (const row of report.results) {
    lines.push(
      [
        row.id,
        row.page,
        row.text,
        row.selector,
        row.kind,
        row.status,
        row.latencyMs,
        row.p50,
        row.p95,
        row.slow,
        row.broken,
        row.urlBefore,
        row.urlAfter,
        row.skipReason ?? '',
        row.error ?? '',
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  fs.writeFileSync(CSV_REPORT, `${lines.join('\n')}\n`, 'utf-8');
}

export function writeMarkdownReport(report: TimingsReport): void {
  const lines: string[] = [
    '# Auditoría de botones — Jardín Azuayo',
    '',
    `- **Cliente:** ${report.meta.cliente}`,
    `- **BASE_URL:** ${report.meta.baseUrl}`,
    `- **Ejecutado:** ${report.meta.executedAt}`,
    `- **Umbral lento:** ${report.meta.slowThresholdMs} ms`,
    `- **Repeticiones:** ${report.meta.repetitions}`,
    '',
    '## Resumen',
    '',
    `| Métrica | Valor |`,
    `|---------|------:|`,
    `| Total controles | ${report.summary.total} |`,
    `| OK | ${report.summary.ok} |`,
    `| Error | ${report.summary.error} |`,
    `| Skipped | ${report.summary.skipped} |`,
    `| Lentos (>${report.meta.slowThresholdMs}ms) | ${report.summary.slow} |`,
    `| Rotos | ${report.summary.broken} |`,
    `| p50 global | ${report.summary.p50Global} ms |`,
    `| p95 global | ${report.summary.p95Global} ms |`,
    '',
    '## Detalle por botón',
    '',
    '| Estado | Latencia | p50 | p95 | Página | Texto | URL después | Notas |',
    '|--------|---------:|----:|----:|--------|-------|-------------|-------|',
  ];

  for (const row of report.results) {
    const flag = row.broken ? '🔴 ROTO' : row.slow ? '🟠 LENTO' : row.status === 'skipped' ? '⏭️ SKIP' : row.status === 'error' ? '❌ ERROR' : '✅ OK';
    const notes = row.skipReason || row.error || '';
    lines.push(
      `| ${flag} | ${row.latencyMs} | ${row.p50} | ${row.p95} | ${row.page} | ${row.text.replace(/\|/g, '\\|')} | ${row.urlAfter} | ${notes.replace(/\|/g, '\\|')} |`,
    );
  }

  lines.push('', '## Páginas visitadas', '', ...report.pagesVisited.map((p) => `- ${p}`));
  fs.writeFileSync(MD_REPORT, `${lines.join('\n')}\n`, 'utf-8');
}

export function buildSummary(results: ButtonAuditResult[]): TimingsReport['summary'] {
  const okLatencies = results.filter((r) => r.status === 'ok').map((r) => r.latencyMs);
  return {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    error: results.filter((r) => r.status === 'error').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    slow: results.filter((r) => r.slow).length,
    broken: results.filter((r) => r.broken).length,
    p50Global: percentile(okLatencies, 50),
    p95Global: percentile(okLatencies, 95),
  };
}
