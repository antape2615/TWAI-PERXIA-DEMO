/**
 * Auditoría E2E de botones — Ficohsa
 * Inventaría controles accionables, mide latencia click→UI estable y genera evidencia.
 *
 * BASE_URL: https://www.grupoficohsa.com
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { BUTTON_AUDIT, EVIDENCE_DIR, VIDEO_DIR } from './config';
import { dismissOverlays, waitForMainContent } from './helpers';
import {
  buildAuditReport,
  discoverButtons,
  discoverKeyPages,
  ensureButtonAuditDirs,
  measureButtonClick,
  preparePageForAudit,
  resetButtonAuditCounter,
  writeCsvReport,
  writeMarkdownReport,
  writeTimingsJson,
  type ButtonAuditEntry,
} from './button-audit-helpers';

test.describe.configure({ mode: 'serial' });

test.describe('Auditoría de botones UI — Ficohsa @ficosha @button-audit', () => {
  test.setTimeout(20 * 60_000);

  test('BTN-AUDIT-001: Inventario y latencia de todos los botones seguros', async ({ page }) => {
    ensureButtonAuditDirs();
    resetButtonAuditCounter();

    const allEntries: ButtonAuditEntry[] = [];
    const pagesAudited: string[] = [];

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForMainContent(page);
    await dismissOverlays(page);

    const keyPages = await discoverKeyPages(page, BUTTON_AUDIT.baseUrl);
    console.log(`[button-audit] Páginas a auditar (${keyPages.length}):`, keyPages);

    for (const pagePath of keyPages) {
      const pageUrl = await preparePageForAudit(page, pagePath, BUTTON_AUDIT.baseUrl);
      pagesAudited.push(pageUrl);
      const pageTitle = await page.title();

      const buttons = await discoverButtons(page);
      console.log(`[button-audit] ${pageUrl} — ${buttons.length} botones encontrados`);

      for (let repeat = 0; repeat < BUTTON_AUDIT.repeatCount; repeat++) {
        for (const button of buttons) {
          await preparePageForAudit(page, pagePath, BUTTON_AUDIT.baseUrl);

          const entry = await measureButtonClick(page, button, pageUrl, pageTitle);
          if (BUTTON_AUDIT.repeatCount > 1) {
            entry.id = `${entry.id}-r${repeat + 1}`;
          }
          allEntries.push(entry);

          console.log(
            `[button-audit] ${entry.id} | ${entry.status} | ${entry.latencyMs ?? '—'}ms | "${entry.text.slice(0, 50)}"`,
          );
        }
      }
    }

    const report = buildAuditReport(allEntries, pagesAudited, BUTTON_AUDIT.repeatCount);
    writeTimingsJson(report);
    const csvPath = writeCsvReport(report);
    const mdPath = writeMarkdownReport(report);

    console.log(`[button-audit] timings.json → ${path.join(EVIDENCE_DIR, 'timings.json')}`);
    console.log(`[button-audit] CSV → ${csvPath}`);
    console.log(`[button-audit] Markdown → ${mdPath}`);
    console.log(
      `[button-audit] Resumen: ${report.summary.ok} ok, ${report.summary.error} error, ${report.summary.skipped} skipped, ${report.summary.slow} lentos`,
    );

    expect(report.summary.total, 'Debe inventariar al menos un botón').toBeGreaterThan(0);
    expect(
      report.summary.ok + report.summary.skipped,
      'Al menos un botón debe ser probado o marcado skipped con motivo',
    ).toBeGreaterThan(0);

    // La suite no falla por botones lentos/rotos — queda documentado en el reporte para gobernanza.
    // Solo falla si no hubo cobertura.
  });

  test.afterAll(async () => {
    const testResultsDir = path.join(EVIDENCE_DIR, 'test-results');
    fs.mkdirSync(VIDEO_DIR, { recursive: true });

    if (!fs.existsSync(testResultsDir)) return;

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.webm')) {
          const dest = path.join(VIDEO_DIR, `button-audit-${entry.name}`);
          if (!fs.existsSync(dest)) {
            fs.copyFileSync(full, dest);
          }
        }
      }
    };
    walk(testResultsDir);
  });
});
