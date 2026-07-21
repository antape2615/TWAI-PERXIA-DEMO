/**
 * Auditoría E2E de botones — Jardín Azuayo
 * BASE_URL: https://www.jardinazuayo.fin.ec/
 *
 * Inventaría controles accionables, mide latencia click→idle y genera evidencia.
 */
import { test, expect } from '@playwright/test';
import { JARDIN_AZUAYO } from './config';
import {
  attachDiagnostics,
  discoverKeyPages,
  ensureEvidenceDirs,
  getTimings,
  inventoryActionables,
  measureButtonClick,
  resetTimings,
  waitForPageReady,
  writeTabularReports,
} from './helpers';

test.describe('JA-BTN-AUDIT — Auditoría de botones @jardin-azuayo', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    resetTimings();
    ensureEvidenceDirs();
  });

  test('Auditoría completa: inventario + latencias + evidencia', async ({ page }) => {
    test.setTimeout(600_000);

    const { consoleErrors, failedResponses } = attachDiagnostics(page);

    await page.goto(JARDIN_AZUAYO.baseUrl, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);

    const keyPages = await discoverKeyPages(page);
    console.log(`[JA-AUDIT] Páginas clave: ${keyPages.length}`);

    for (const pageUrl of keyPages) {
      console.log(`[JA-AUDIT] Auditando: ${pageUrl}`);

      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await waitForPageReady(page);
      } catch (err) {
        console.warn(`[JA-AUDIT] No se pudo cargar ${pageUrl}:`, err);
        continue;
      }

      const pageTitle = await page.title();
      const actionables = await inventoryActionables(page);
      console.log(`[JA-AUDIT]   → ${actionables.length} controles en ${pageUrl}`);

      for (let i = 0; i < actionables.length; i++) {
        try {
          await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
          await waitForPageReady(page);

          const freshActionables = await inventoryActionables(page);
          if (i >= freshActionables.length) {
            console.warn(`[JA-AUDIT]   Botón índice ${i} ya no disponible, omitiendo`);
            continue;
          }

          const locator = freshActionables[i];
          const result = await measureButtonClick(
            page,
            locator,
            pageUrl,
            pageTitle,
            consoleErrors,
            failedResponses,
          );

          const label = result.text || result.selector;
          console.log(
            `[JA-AUDIT]   ${result.id} [${result.status}] ${label.slice(0, 50)} — ${result.latencyMs}ms${result.slow ? ' SLOW' : ''}`,
          );

          if (result.status === 'ok' && result.urlAfter !== result.urlBefore) {
            await page.goBack({ timeout: 15_000 }).catch(() => {
              return page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
            });
            await waitForPageReady(page);
          }
        } catch (err) {
          console.error(`[JA-AUDIT]   Error en botón índice ${i}:`, err);
        }
      }
    }

    writeTabularReports();

    const all = getTimings();
    const tested = all.filter((t) => t.status !== 'skipped');
    const errors = all.filter((t) => t.status === 'error');
    const slow = all.filter((t) => t.slow);

    console.log(`[JA-AUDIT] Resumen: ${all.length} total, ${tested.length} probados, ${errors.length} errores, ${slow.length} lentos`);

    expect(all.length, 'Debe inventariarse al menos un control accionable').toBeGreaterThan(0);

    if (errors.length > 0) {
      console.warn(`[JA-AUDIT] ${errors.length} botón(es) con error — ver timings.json y report.pdf`);
    }
  });
});
