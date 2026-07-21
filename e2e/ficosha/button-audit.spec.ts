/**
 * Auditoría de botones + tiempos de respuesta — Ficohsa
 * BASE_URL: https://www.grupoficohsa.com
 *
 * Inventaría controles accionables, hace click en los seguros de probar,
 * mide latencia click → idle de red / UI estable, y genera evidencia.
 */
import { test, expect } from '@playwright/test';
import {
  auditPageButtons,
  buildSummary,
  discoverKeyPages,
  ensureButtonAuditDirs,
  SLOW_THRESHOLD_MS,
  writeCsvReport,
  writeMarkdownReport,
  writeTimingsJson,
} from './button-audit-helpers';

test.describe('Auditoría de botones — Ficohsa @ficosha @button-audit', () => {
  test.setTimeout(20 * 60 * 1000);

  test('BTN-AUDIT-001: Inventario y medición de latencia en botones visibles', async ({ page }) => {
    ensureButtonAuditDirs();

    const pages = await discoverKeyPages(page);
    expect(pages.length, 'Debe descubrir al menos la página principal').toBeGreaterThan(0);

    const allRecords = [];
    for (const pagePath of pages) {
      const pageRecords = await auditPageButtons(page, pagePath);
      allRecords.push(...pageRecords);
    }

    const summary = buildSummary(allRecords, pages);
    writeTimingsJson(summary);
    writeMarkdownReport(summary);
    writeCsvReport(summary);

    const tested = summary.records.filter((r) => r.status !== 'skipped');
    expect(
      tested.length,
      'Debe haber al menos un botón seguro probado',
    ).toBeGreaterThan(0);

    console.log(
      `[button-audit] páginas=${summary.pagesVisited.length} total=${summary.totalButtons} ok=${summary.ok} error=${summary.error} skipped=${summary.skipped} slow=${summary.slow} p50=${summary.globalP50Ms}ms p95=${summary.globalP95Ms}ms umbral_lento=${SLOW_THRESHOLD_MS}ms`,
    );

    const broken = summary.records.filter((r) => r.broken);
    if (broken.length > 0) {
      console.warn(
        '[button-audit] Botones rotos:',
        broken.map((b) => `${b.id}: ${b.error}`).join(' | '),
      );
    }
  });
});
