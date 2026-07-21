/**
 * Auditoría E2E de botones — Jardín Azuayo
 * BASE_URL: https://www.jardinazuayo.fin.ec/
 *
 * Inventaría controles accionables, mide latencia click → UI estable,
 * genera timings.json, CSV, Markdown y capturas en evidence/.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { JARDIN_AZUAYO } from './config';
import {
  buildSummary,
  captureButtonScreenshot,
  collectNetworkErrors,
  discoverControls,
  dismissOverlays,
  ensureEvidenceDirs,
  filterCriticalConsoleErrors,
  resetTimingsReport,
  resolveLocator,
  shouldSkipControl,
  slugify,
  waitForUiStable,
  writeTimingsReport,
  type ButtonAuditResult,
  type DiscoveredControl,
  type TimingsReport,
} from './helpers';

test.describe('Jardín Azuayo — Auditoría de botones UI @jardin-azuayo', () => {
  test.describe.configure({ mode: 'serial' });

  const allResults: ButtonAuditResult[] = [];
  const pagesVisited: string[] = [];

  test.beforeAll(() => {
    resetTimingsReport();
    ensureEvidenceDirs();
  });

  test('AUDIT-001: Inventariar y medir latencia de todos los botones seguros', async ({ page, context }) => {
    test.setTimeout(20 * 60_000);

    const consoleErrors: string[] = [];
    const networkResponses: import('@playwright/test').Response[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('response', (response) => networkResponses.push(response));

    for (const pagePath of JARDIN_AZUAYO.keyPages) {
      const pageUrl = new URL(pagePath, JARDIN_AZUAYO.baseUrl).href;
      pagesVisited.push(pageUrl);

      const response = await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      expect(response?.status(), `La página ${pagePath} debe responder HTTP < 400`).toBeLessThan(400);

      await dismissOverlays(page);
      await waitForUiStable(page);

      const pageTitle = await page.title();
      const controls = await discoverControls(page);

      test.info().annotations.push({
        type: 'page-inventory',
        description: `${pagePath}: ${controls.length} controles`,
      });

      for (const control of controls) {
        const resultId = `${pagePath === '/' ? 'home' : slugify(pagePath.replace(/\//g, '-'))}-${String(control.index).padStart(2, '0')}-${slugify(control.text)}`;
        const skipReason = shouldSkipControl(control);

        if (skipReason) {
          const skipped: ButtonAuditResult = {
            id: resultId,
            page: pagePath,
            pageTitle,
            selector: control.selector,
            text: control.text,
            kind: control.kind,
            href: control.href,
            urlBefore: page.url(),
            urlAfter: page.url(),
            status: 'skipped',
            skipReason,
            latencyMs: 0,
            latencies: [],
            p50: 0,
            p95: 0,
            slow: false,
            broken: false,
            consoleErrors: [],
            networkErrors: [],
          };
          allResults.push(skipped);
          continue;
        }

        const latencies: number[] = [];
        let lastUrlAfter = page.url();
        let screenshotBefore: string | undefined;
        let screenshotAfter: string | undefined;
        let status: ButtonAuditResult['status'] = 'ok';
        let errorMsg: string | undefined;
        const clickConsoleErrors: string[] = [];
        const clickNetworkErrors: string[] = [];

        for (let rep = 0; rep < JARDIN_AZUAYO.repetitions; rep++) {
          await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 60_000 });
          await dismissOverlays(page);
          await waitForUiStable(page);

          const urlBefore = page.url();
          const locator = resolveLocator(page, control);

          const visible = await locator.isVisible({ timeout: 5000 }).catch(() => false);
          if (!visible) {
            status = 'error';
            errorMsg = `Control no visible: ${control.selector}`;
            break;
          }

          if (rep === 0) {
            screenshotBefore = await captureButtonScreenshot(page, pagePath, control, 'before');
          }

          const errorsBefore = consoleErrors.length;
          const responsesBefore = networkResponses.length;
          const start = Date.now();

          try {
            const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
            await locator.scrollIntoViewIfNeeded();
            await locator.click({ timeout: 10_000, noWaitAfter: false });

            const popup = await popupPromise;
            if (popup) {
              await popup.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);
              lastUrlAfter = popup.url();
              await popup.close().catch(() => undefined);
            } else {
              await waitForUiStable(page);
              lastUrlAfter = page.url();
            }

            const elapsed = Date.now() - start;
            latencies.push(elapsed);

            if (rep === 0) {
              screenshotAfter = await captureButtonScreenshot(page, pagePath, control, 'after');
            }

            const newConsole = filterCriticalConsoleErrors(consoleErrors.slice(errorsBefore));
            const newNetwork = collectNetworkErrors(networkResponses.slice(responsesBefore));
            clickConsoleErrors.push(...newConsole);
            clickNetworkErrors.push(...newNetwork);

            if (newNetwork.some((e) => e.startsWith('5'))) {
              status = 'error';
              errorMsg = `Error de red: ${newNetwork.join('; ')}`;
            }
          } catch (err) {
            status = 'error';
            errorMsg = err instanceof Error ? err.message : String(err);
            latencies.push(Date.now() - start);
            try {
              screenshotAfter = await captureButtonScreenshot(page, pagePath, control, 'after');
            } catch {
              /* ignore screenshot failure */
            }
            break;
          }
        }

        const latencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
        const sorted = [...latencies].sort((a, b) => a - b);
        const p50 = sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.5)] : 0;
        const p95 = sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : 0;
        const slow = status === 'ok' && latencyMs > JARDIN_AZUAYO.slowThresholdMs;
        const broken = status === 'error';

        allResults.push({
          id: resultId,
          page: pagePath,
          pageTitle,
          selector: control.selector,
          text: control.text,
          kind: control.kind,
          href: control.href,
          urlBefore: new URL(pagePath, JARDIN_AZUAYO.baseUrl).href,
          urlAfter: lastUrlAfter,
          status,
          latencyMs,
          latencies,
          p50,
          p95,
          slow,
          broken,
          consoleErrors: [...new Set(clickConsoleErrors)].slice(0, 5),
          networkErrors: [...new Set(clickNetworkErrors)].slice(0, 5),
          screenshotBefore,
          screenshotAfter,
          error: errorMsg,
        });
      }
    }

    const report: TimingsReport = {
      meta: {
        cliente: JARDIN_AZUAYO.cliente,
        baseUrl: JARDIN_AZUAYO.baseUrl,
        executedAt: new Date().toISOString(),
        slowThresholdMs: JARDIN_AZUAYO.slowThresholdMs,
        repetitions: JARDIN_AZUAYO.repetitions,
      },
      pagesVisited,
      results: allResults,
      summary: buildSummary(allResults),
    };

    writeTimingsReport(report);

    test.info().attach('timings-json', {
      path: path.resolve('evidence/timings.json'),
      contentType: 'application/json',
    });

    const brokenCount = report.summary.broken;
    const slowCount = report.summary.slow;

    expect(
      allResults.length,
      'Debe haberse inventariado al menos un control en las páginas clave',
    ).toBeGreaterThan(0);

    test.info().annotations.push({
      type: 'audit-summary',
      description: `total=${report.summary.total} ok=${report.summary.ok} slow=${slowCount} broken=${brokenCount}`,
    });

    if (brokenCount > 0) {
      const brokenList = allResults
        .filter((r) => r.broken)
        .map((r) => `${r.page} → ${r.text}: ${r.error}`)
        .join('\n');
      console.warn(`Botones rotos (${brokenCount}):\n${brokenList}`);
    }
  });
});
