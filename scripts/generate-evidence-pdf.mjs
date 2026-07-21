#!/usr/bin/env node
/**
 * Genera evidence/report.pdf con resumen de resultados, capturas incrustadas y referencias a video.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.join(ROOT, 'evidence');
const SCREENSHOTS = path.join(EVIDENCE, 'screenshots');
const VIDEO = path.join(EVIDENCE, 'video');
const RESULTS_JSON = path.join(EVIDENCE, 'test-results.json');
const PW_REPORT = path.join(EVIDENCE, 'playwright-report.json');
const PDF_OUT = path.join(EVIDENCE, 'report.pdf');

interface TestEvidence {
  id: string;
  titulo: string;
  criterio: string;
  regla: string;
  status: 'passed' | 'failed' | 'skipped';
  duracionMs: number;
  screenshot?: string;
  video?: string;
  detalles: Record<string, unknown>;
  error?: string;
}

function copyVideosFromTestResults(): string[] {
  const testResultsDir = path.join(EVIDENCE, 'test-results');
  fs.mkdirSync(VIDEO, { recursive: true });
  const copied: string[] = [];

  if (!fs.existsSync(testResultsDir)) return copied;

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.webm')) {
        const dest = path.join(VIDEO, `${path.basename(path.dirname(full))}-${entry.name}`);
        fs.copyFileSync(full, dest);
        copied.push(dest);
      }
    }
  };
  walk(testResultsDir);
  return copied;
}

function loadResults(): TestEvidence[] {
  if (fs.existsSync(RESULTS_JSON)) {
    return JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8'));
  }
  return [];
}

function loadPlaywrightSummary(): { passed: number; failed: number; total: number } {
  if (!fs.existsSync(PW_REPORT)) return { passed: 0, failed: 0, total: 0 };
  const report = JSON.parse(fs.readFileSync(PW_REPORT, 'utf-8'));
  const suites = report.suites ?? [];
  let passed = 0;
  let failed = 0;
  const countSpecs = (suite: { specs?: unknown[]; suites?: unknown[] }) => {
    for (const spec of suite.specs ?? []) {
      const s = spec as { tests?: { results?: { status: string }[] }[] };
      for (const t of s.tests ?? []) {
        const status = t.results?.[0]?.status;
        if (status === 'passed') passed++;
        else if (status === 'failed') failed++;
      }
    }
    for (const child of suite.suites ?? []) {
      countSpecs(child as { specs?: unknown[]; suites?: unknown[] });
    }
  };
  for (const suite of suites) countSpecs(suite);
  return { passed, failed, total: passed + failed };
}

async function generatePdf(results, videos) {
  const summary = loadPlaywrightSummary();
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const overall = failed === 0 && summary.failed === 0 ? 'PASS' : 'FAIL';

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(PDF_OUT);
  doc.pipe(stream);

  doc.fontSize(20).text('Evidencia E2E — Auditoría de Gobernanza', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text('Cliente: Ficohsa (Grupo Ficohsa)', { align: 'center' });
  doc.text('BASE_URL: https://www.grupoficohsa.com', { align: 'center' });
  doc.text(`HU: HU-ARQ-001 — Arquitectura SSR / Microfrontends`, { align: 'center' });
  doc.text(`Fecha ejecución: ${new Date().toISOString()}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(14).text('Resumen de resultados', { underline: true });
  doc.fontSize(11);
  doc.text(`Resultado global: ${overall}`);
  doc.text(`Casos ejecutados: ${results.length}`);
  doc.text(`Passed: ${passed} | Failed: ${failed}`);
  doc.text(`Playwright report — passed: ${summary.passed}, failed: ${summary.failed}`);
  doc.moveDown();

  doc.fontSize(14).text('Parámetros de negocio', { underline: true });
  doc.fontSize(11);
  doc.text('TiempoCargaMaximoInicial: 8 segundos (configurable vía TIEMPO_CARGA_MAXIMO_INICIAL)');
  doc.text('MaxReintentosIntegracion: 3 (configurable vía MAX_REINTENTOS_INTEGRACION)');
  doc.moveDown();

  if (videos.length > 0) {
    doc.fontSize(14).text('Videos de evidencia (fallos)', { underline: true });
    doc.fontSize(10);
    for (const v of videos) {
      doc.text(`• ${path.relative(ROOT, v)}`);
    }
    doc.moveDown();
  }

  doc.fontSize(14).text('Detalle por caso de prueba', { underline: true });
  doc.moveDown(0.5);

  for (const r of results) {
    if (doc.y > 650) doc.addPage();

    doc.fontSize(12).fillColor(r.status === 'passed' ? 'green' : 'red')
      .text(`${r.id} — ${r.status.toUpperCase()}`);
    doc.fillColor('black').fontSize(10);
    doc.text(`Título: ${r.titulo}`);
    doc.text(`Criterio: ${r.criterio} | Regla: ${r.regla}`);
    doc.text(`Duración: ${r.duracionMs} ms`);
    if (r.error) doc.text(`Error: ${r.error}`);
    if (Object.keys(r.detalles).length > 0) {
      doc.text(`Detalles: ${JSON.stringify(r.detalles, null, 0).slice(0, 500)}`);
    }

    const shotPath = r.screenshot && fs.existsSync(r.screenshot)
      ? r.screenshot
      : fs.existsSync(path.join(SCREENSHOTS, `${r.id}-happy-path.png`))
        ? path.join(SCREENSHOTS, `${r.id}-happy-path.png`)
        : null;

    if (shotPath) {
      try {
        doc.moveDown(0.3);
        doc.image(shotPath, { width: 480 });
      } catch {
        doc.text(`(No se pudo incrustar captura: ${shotPath})`);
      }
    }

    doc.moveDown();
  }

  doc.addPage();
  doc.fontSize(12).text('Reproducción', { underline: true });
  doc.fontSize(10);
  doc.text('npx playwright test e2e/ficosha/hu-arq-001.spec.ts');
  doc.text('npm run test:e2e:report  # genera PDF tras ejecución');
  doc.text('');
  doc.text('Nota: CA-RN03-01 (documentación técnica versionada con diagramas) requiere validación manual/documental fuera del alcance E2E.');

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main(): Promise<void> {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });

  const videos = copyVideosFromTestResults();
  const results = loadResults();

  await generatePdf(results, videos);
  console.log(`PDF generado: ${PDF_OUT}`);
  console.log(`Videos copiados: ${videos.length}`);
  console.log(`Casos en reporte: ${results.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
