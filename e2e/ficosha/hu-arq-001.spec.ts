/**
 * Suite E2E — HU-ARQ-001
 * Cliente: Ficohsa | BASE_URL: https://www.grupoficohsa.com
 *
 * Casos derivados de RN-01, RN-02 y criterios de aceptación CA-RN01-01, CA-RN02-01, CA-RN02-02.
 * CA-RN03-01 (documentación técnica versionada) queda fuera de alcance E2E — validación manual.
 */
import { test, expect } from '@playwright/test';
import { HU_ARQ_001 } from './config';
import {
  captureScreenshot,
  collectFailedResponses,
  dismissOverlays,
  ensureEvidenceDirs,
  filterCriticalConsoleErrors,
  getConsoleErrors,
  recordEvidence,
  waitForMainContent,
} from './helpers';

test.describe('HU-ARQ-001 — Arquitectura SSR / Microfrontends @ficosha', () => {

  test('TC-ARQ-001-01: Carga inicial SSR dentro del tiempo máximo (CA-RN01-01 / RN-01)', async ({
    page,
  }) => {
    const testId = 'TC-ARQ-001-01';
    const start = Date.now();
    let status: 'passed' | 'failed' = 'passed';
    let errorMsg: string | undefined;
    let loadTimeSec = 0;
    let screenshot: string | undefined;

    try {
      const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
      expect(response?.status(), 'El documento SSR debe responder HTTP 200').toBe(200);

      await waitForMainContent(page);
      await dismissOverlays(page);

      loadTimeSec = (Date.now() - start) / 1000;
      expect(
        loadTimeSec,
        `Tiempo de carga inicial (${loadTimeSec.toFixed(2)}s) debe ser ≤ ${HU_ARQ_001.tiempoCargaMaximoInicial}s`,
      ).toBeLessThanOrEqual(HU_ARQ_001.tiempoCargaMaximoInicial);

      screenshot = await captureScreenshot(page, testId);
    } catch (err) {
      status = 'failed';
      errorMsg = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      recordEvidence({
        id: testId,
        titulo: 'Carga inicial SSR dentro del tiempo máximo',
        criterio: 'CA-RN01-01',
        regla: 'RN-01',
        status,
        duracionMs: Date.now() - start,
        screenshot,
        detalles: {
          tiempoCargaSegundos: loadTimeSec,
          limiteSegundos: HU_ARQ_001.tiempoCargaMaximoInicial,
          url: HU_ARQ_001.baseUrl,
        },
        error: errorMsg,
      });
    }
  });

  test('TC-ARQ-001-02: Documento SSR entregado con contenido HTML válido (RN-01)', async ({
    page,
  }) => {
    const testId = 'TC-ARQ-001-02';
    const start = Date.now();
    let status: 'passed' | 'failed' = 'passed';
    let errorMsg: string | undefined;
    let screenshot: string | undefined;

    try {
      const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
      const html = await page.content();

      expect(response?.status()).toBe(200);
      expect(html.toLowerCase()).toContain('<!doctype html');
      expect(html.length).toBeGreaterThan(1000);

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title.toLowerCase()).toMatch(/ficohsa|grupo/i);

      await dismissOverlays(page);
      screenshot = await captureScreenshot(page, testId);
    } catch (err) {
      status = 'failed';
      errorMsg = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      recordEvidence({
        id: testId,
        titulo: 'Documento SSR con HTML válido y título',
        criterio: 'CA-RN01-01',
        regla: 'RN-01',
        status,
        duracionMs: Date.now() - start,
        screenshot,
        detalles: { tituloPagina: await page.title().catch(() => '') },
        error: errorMsg,
      });
    }
  });

  test('TC-ARQ-001-03: Contenido principal visible sin pantalla en blanco (RN-01 / HU visitante)', async ({
    page,
  }) => {
    const testId = 'TC-ARQ-001-03';
    const start = Date.now();
    let status: 'passed' | 'failed' = 'passed';
    let errorMsg: string | undefined;
    let screenshot: string | undefined;

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForMainContent(page);
      await dismissOverlays(page);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(100);

      const visibleElements = await page.locator('body *:visible').count();
      expect(visibleElements).toBeGreaterThan(10);

      screenshot = await captureScreenshot(page, testId);
    } catch (err) {
      status = 'failed';
      errorMsg = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      recordEvidence({
        id: testId,
        titulo: 'Contenido principal visible sin pantalla en blanco',
        criterio: 'HU visitante — experiencia fluida',
        regla: 'RN-01',
        status,
        duracionMs: Date.now() - start,
        screenshot,
        detalles: {},
        error: errorMsg,
      });
    }
  });

  test('TC-ARQ-001-04: Sin errores críticos de consola en carga inicial (CA-RN02-01 / RN-02)', async ({
    page,
  }) => {
    const testId = 'TC-ARQ-001-04';
    const start = Date.now();
    let status: 'passed' | 'failed' = 'passed';
    let errorMsg: string | undefined;
    let screenshot: string | undefined;
    const consoleErrors = getConsoleErrors(page);

    try {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 45_000 }).catch(async () => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
      });
      await waitForMainContent(page);
      await dismissOverlays(page);
      await page.waitForTimeout(2000);

      const critical = filterCriticalConsoleErrors(consoleErrors);
      expect(
        critical,
        `Errores críticos de consola detectados: ${critical.join(' | ')}`,
      ).toHaveLength(0);

      screenshot = await captureScreenshot(page, testId);
    } catch (err) {
      status = 'failed';
      errorMsg = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      recordEvidence({
        id: testId,
        titulo: 'Sin errores críticos de consola en carga inicial',
        criterio: 'CA-RN02-01',
        regla: 'RN-02',
        status,
        duracionMs: Date.now() - start,
        screenshot,
        detalles: {
          erroresConsola: filterCriticalConsoleErrors(consoleErrors),
          totalErroresRaw: consoleErrors.length,
        },
        error: errorMsg,
      });
    }
  });

  test('TC-ARQ-001-05: Recursos de integración cargan sin fallos HTTP ≥ 400 (CA-RN02-01 / RN-02)', async ({
    page,
  }) => {
    const testId = 'TC-ARQ-001-05';
    const start = Date.now();
    let status: 'passed' | 'failed' = 'passed';
    let errorMsg: string | undefined;
    let screenshot: string | undefined;
    const responses: import('@playwright/test').Response[] = [];

    page.on('response', (r) => responses.push(r));

    try {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 45_000 }).catch(async () => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
      });
      await waitForMainContent(page);
      await dismissOverlays(page);

      const failed = collectFailedResponses(responses);
      const failedSummary = failed.map((r) => `${r.status()} ${r.url()}`);

      expect(
        failed.length,
        `Recursos con fallo HTTP: ${failedSummary.join('; ')}`,
      ).toBe(0);

      screenshot = await captureScreenshot(page, testId);
    } catch (err) {
      status = 'failed';
      errorMsg = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const failed = collectFailedResponses(responses);
      recordEvidence({
        id: testId,
        titulo: 'Recursos de integración sin fallos HTTP críticos',
        criterio: 'CA-RN02-01',
        regla: 'RN-02',
        status,
        duracionMs: Date.now() - start,
        screenshot,
        detalles: {
          totalRespuestas: responses.length,
          fallosHttp: failed.map((r) => ({ status: r.status(), url: r.url() })),
        },
        error: errorMsg,
      });
    }
  });

  test('TC-ARQ-001-06: Navegación interna fluida entre secciones SSR (RN-02 / HU visitante)', async ({
    page,
  }) => {
    const testId = 'TC-ARQ-001-06';
    const start = Date.now();
    let status: 'passed' | 'failed' = 'passed';
    let errorMsg: string | undefined;
    let screenshot: string | undefined;
    const navResults: { enlace: string; status: number | null; ok: boolean }[] = [];

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForMainContent(page);
      await dismissOverlays(page);

      const navLinks = page.locator(
        '[role="banner"] a[href], a[href^="/"]:not([href^="#"]), a[href*="grupoficohsa.com"]',
      );
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);

      const linksToTest = Math.min(count, 3);
      for (let i = 0; i < linksToTest; i++) {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);

        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

        const [response] = await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => null),
          link.click({ timeout: 10_000 }).catch(() => undefined),
        ]);

        const httpStatus = response?.status() ?? null;
        const ok = httpStatus === null || (httpStatus >= 200 && httpStatus < 400);
        navResults.push({ enlace: href, status: httpStatus, ok });
        expect(ok, `Navegación fallida hacia ${href} (HTTP ${httpStatus})`).toBeTruthy();
        await waitForMainContent(page);
      }

      screenshot = await captureScreenshot(page, testId, 'navegacion');
    } catch (err) {
      status = 'failed';
      errorMsg = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      recordEvidence({
        id: testId,
        titulo: 'Navegación interna fluida entre secciones',
        criterio: 'HU visitante — navegación sin interrupciones',
        regla: 'RN-02',
        status,
        duracionMs: Date.now() - start,
        screenshot,
        detalles: { navegaciones: navResults },
        error: errorMsg,
      });
    }
  });

  test('TC-ARQ-001-07: UI controlada visible — sin página de error del servidor (CA-RN02-02 / RN-02)', async ({
    page,
  }) => {
    const testId = 'TC-ARQ-001-07';
    const start = Date.now();
    let status: 'passed' | 'failed' = 'passed';
    let errorMsg: string | undefined;
    let screenshot: string | undefined;

    try {
      const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForMainContent(page);
      await dismissOverlays(page);

      const bodyText = (await page.locator('body').innerText()).toLowerCase();
      const errorPatterns = [
        /internal server error/,
        /502 bad gateway/,
        /503 service unavailable/,
        /504 gateway timeout/,
        /application error/,
        /something went wrong/,
        /error del servidor/,
      ];

      for (const pattern of errorPatterns) {
        expect(bodyText, `Patrón de error detectado: ${pattern}`).not.toMatch(pattern);
      }

      expect(response?.status()).toBeLessThan(500);

      screenshot = await captureScreenshot(page, testId);
    } catch (err) {
      status = 'failed';
      errorMsg = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      recordEvidence({
        id: testId,
        titulo: 'UI controlada sin página de error del servidor',
        criterio: 'CA-RN02-02',
        regla: 'RN-02',
        status,
        duracionMs: Date.now() - start,
        screenshot,
        detalles: {},
        error: errorMsg,
      });
    }
  });

  test('TC-ARQ-001-08: Métricas de performance inicial registradas para auditoría (RN-01)', async ({
    page,
  }) => {
    const testId = 'TC-ARQ-001-08';
    const start = Date.now();
    let status: 'passed' | 'failed' = 'passed';
    let errorMsg: string | undefined;
    let screenshot: string | undefined;
    let metrics: Record<string, number> = {};

    try {
      await page.goto('/', { waitUntil: 'load' });
      await waitForMainContent(page);
      await dismissOverlays(page);

      metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoadedMs: nav?.domContentLoadedEventEnd - nav?.startTime,
          loadEventEndMs: nav?.loadEventEnd - nav?.startTime,
          responseEndMs: nav?.responseEnd - nav?.startTime,
          transferSize: nav?.transferSize ?? 0,
        };
      });

      expect(metrics.domContentLoadedMs).toBeGreaterThan(0);
      expect(metrics.domContentLoadedMs / 1000).toBeLessThanOrEqual(
        HU_ARQ_001.tiempoCargaMaximoInicial,
      );

      screenshot = await captureScreenshot(page, testId);
    } catch (err) {
      status = 'failed';
      errorMsg = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      recordEvidence({
        id: testId,
        titulo: 'Métricas de performance inicial registradas',
        criterio: 'CA-RN01-01 — evidencia de tiempos',
        regla: 'RN-01',
        status,
        duracionMs: Date.now() - start,
        screenshot,
        detalles: {
          metricas: metrics,
          limiteSegundos: HU_ARQ_001.tiempoCargaMaximoInicial,
          maxReintentosIntegracion: HU_ARQ_001.maxReintentosIntegracion,
        },
        error: errorMsg,
      });
    }
  });
});
