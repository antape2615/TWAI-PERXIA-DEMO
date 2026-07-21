/**
 * Auditoría E2E de botones y tiempos de respuesta — Ficohsa
 * BASE_URL: https://www.grupoficohsa.com
 *
 * Inventaría controles accionables, mide latencia click→idle/UI estable,
 * genera evidence/timings.json, CSV/MD y capturas por botón.
 */
import { test, expect } from '@playwright/test';
import { BUTTON_AUDIT } from './button-audit.config';
import {
  buildAuditReport,
  discoverActionableControls,
  discoverNavPages,
  makeButtonId,
  measureButtonClick,
  preparePageForAudit,
  resetTimingsJson,
  writeAuditArtifacts,
  type ButtonClickResult,
} from './button-audit.helpers';
import { ensureEvidenceDirs } from './helpers';

test.describe('Auditoría de botones — Performance UI @ficosha', () => {
  test.describe.configure({ mode: 'serial' });

  test('BTN-AUDIT-001: Inventario y medición de latencia de todos los botones seguros', async ({
    page,
  }) => {
    test.setTimeout(45 * 60 * 1000);

    ensureEvidenceDirs();
    resetTimingsJson();

    const allResults: ButtonClickResult[] = [];
    const pagesAudited: string[] = [];

    await preparePageForAudit(page, BUTTON_AUDIT.baseUrl);
    const navPages = await discoverNavPages(page);
    pagesAudited.push(...navPages);

    for (const pageUrl of navPages) {
      await preparePageForAudit(page, pageUrl);
      const descriptors = await discoverActionableControls(page, pageUrl);

      for (const descriptor of descriptors) {
        const buttonId = makeButtonId(pageUrl, descriptor);

        if (descriptor.skipReason) {
          allResults.push({
            id: buttonId,
            pageUrl,
            selector: descriptor.selector,
            text: descriptor.text,
            ariaLabel: descriptor.ariaLabel,
            tagName: descriptor.tagName,
            urlBefore: pageUrl,
            urlAfter: pageUrl,
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
          });
          continue;
        }

        const result = await measureButtonClick(page, descriptor, buttonId);
        allResults.push(result);
      }
    }

    const report = buildAuditReport(pagesAudited, allResults);
    writeAuditArtifacts(report);

    const tested = allResults.filter((r) => r.status !== 'skipped');
    expect(tested.length, 'Debe haber al menos un botón probado').toBeGreaterThan(0);

    // La suite recopila evidencia aunque haya botones rotos; el reporte marca broken/slow.
    // Solo falla si no se pudo inventariar nada en el sitio.
    const inventoryOk = allResults.length > 0;
    expect(inventoryOk).toBeTruthy();
  });
});
